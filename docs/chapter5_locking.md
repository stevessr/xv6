# 第 5 章: 锁 (Locking)

## 5.1 教学目标

1.  **理解并发与竞态条件**: 明白在多核或多进程并发执行的环境下，由于共享资源访问的时序不确定性，为什么会产生“竞态条件”（Race Condition）。
2.  **掌握锁的核心概念**: 学习锁作为一种互斥（Mutual Exclusion）机制，如何保护临界区（Critical Section），确保共享数据在任何时刻只有一个执行单元可以修改。
3.  **分析自旋锁 (Spinlock)**: 深入理解 xv6 中自旋锁的实现原理，包括其“忙等待”特性、原子操作（`amoswap`）的使用，以及与中断禁用的关系。
4.  **分析睡眠锁 (Sleep-lock)**: 掌握睡眠锁与自旋锁的核心区别，理解它如何通过 `sleep`/`wakeup` 机制避免 CPU 空转，以及其在长时任务中的应用。

---

## 5.2 问题的根源：竞态条件

在现代操作系统中，多个 CPU 核心可能同时执行内核代码，或者单个 CPU 上的多个进程通过上下文切换交替执行。当这些并发的执行流需要访问和修改共享数据时，就会出现问题。

让我们以内核内存分配器 [`kernel/kalloc.c`](source/xv6-riscv/kernel/kalloc.c:1) 为例。它维护一个空闲内存页的链表 `kmem.freelist`。`kalloc()` 函数从链表头部取下一个空闲页并返回。

```c
// kernel/kalloc.c
void *
kalloc(void)
{
  struct run *r;

  // acquire(&kmem.lock); // 暂时忽略锁
  r = kmem.freelist;
  if(r)
    kmem.freelist = r->next;
  // release(&kmem.lock);

  // ...
  return (void*)r;
}
```

想象一下，如果没有锁，在两个 CPU 上同时运行 `kalloc()` 会发生什么：

1.  **CPU 1** 执行 `r = kmem.freelist;`，它得到了空闲链表的头部地址。
2.  在 CPU 1 继续执行之前，发生上下文切换或 **CPU 2** 也开始执行 `kalloc()`。
3.  **CPU 2** 也执行 `r = kmem.freelist;`。由于 CPU 1 尚未修改 `kmem.freelist`，CPU 2 读取到了**相同**的地址。
4.  **CPU 2** 继续执行，将 `kmem.freelist` 更新为 `r->next`，然后返回了它获取的内存页。
5.  **CPU 1** 恢复执行，它也基于**过时的 `r` 值**，将 `kmem.freelist` 更新为 `r->next`，然后返回了**同一块内存页**。

**结果是灾难性的**：两个不同的内核部分认为自己独占了同一块物理内存，它们写入的数据会相互覆盖，导致系统崩溃或数据损坏。

这种由于多个执行流对共享资源的访问顺序不确定而导致意外结果的情况，就是**竞态条件 (Race Condition)**。访问共享数据的代码区域被称为**临界区 (Critical Section)**。为了保证系统的正确性，我们必须确保在任何时刻，只有一个 CPU 或进程能进入临界区，这就是**互斥 (Mutual Exclusion)**。

---

## 5.3 自旋锁 (Spinlock)

实现互斥最直接的方法之一是使用锁。当一段代码将要进入临界区时，它首先尝试获取一个锁。如果成功，它就可以安全地执行临界区代码；如果失败（因为锁已被其他代码持有），它必须等待，直到锁被释放。

xv6 提供了两种主要的内核锁：自旋锁和睡眠锁。

**自旋锁**是一种“忙等待”锁。如果一个 CPU 核心尝试获取一个已经被持有的自旋锁，它不会放弃 CPU，而是在一个紧凑的循环中持续检查锁的状态，直到锁被释放。这种行为就像原地“旋转”等待，因此得名。

由于自旋锁会持续占用 CPU 资源，它只适用于那些**持有时间极短**的临界区。例如，更新一个指针或修改一个计数器。

### 5.3.1 自旋锁的实现

自旋锁的实现在 [`kernel/spinlock.c`](source/xv6-riscv/kernel/spinlock.c:19) 中。

**数据结构**:
```c
// kernel/spinlock.h
struct spinlock {
  uint locked;       // 0 表示未锁定, 1 表示锁定
  char *name;        // 锁的名称 (用于调试)
  struct cpu *cpu;   // 持有该锁的 CPU
};
```

**获取锁 `acquire()`**:
[`acquire()`](source/xv6-riscv/kernel/spinlock.c:32) 函数的核心是原子地测试并设置 `lk->locked` 字段。

```c
// kernel/spinlock.c
void
acquire(struct spinlock *lk)
{
  push_off(); // 禁用中断
  if(holding(lk))
    panic("acquire");

  // 使用原子指令 amoswap.w.aq (atomic swap)
  // 持续尝试将 lk->locked 从 0 换成 1，直到成功为止。
  while(__sync_lock_test_and_set(&lk->locked, 1) != 0)
    ;

  __sync_synchronize(); // 内存屏障

  lk->cpu = mycpu(); // 记录持有者
}
```
关键点分析:
1.  **`push_off()`**: 在尝试获取锁之前，必须**禁用中断**。这是为了防止死锁。想象一下：一个 CPU 持有锁 `L`，然后一个设备中断发生。中断处理程序也需要锁 `L`，它会开始自旋等待。但因为中断处理程序正在运行，原来的代码无法继续执行去释放锁 `L`，导致系统完全卡死。`push_off()`/`pop_off()` 机制支持锁的嵌套调用，只有最外层的 `acquire` 会真正禁用中断，最外层的 `release` 会恢复中断。
2.  **`__sync_lock_test_and_set`**: 这是一个 GCC 内置函数，在 RISC-V 上被编译为 `amoswap` (atomic memory swap) 指令。这条指令可以**原子地**将一个新值写入内存地址，并返回该地址的旧值。`while` 循环会一直执行，直到 `amoswap` 返回 0，这意味着在原子操作之前 `lk->locked` 是 0 (未锁定)，而我们成功地将其设置为了 1 (已锁定)。
3.  **`__sync_synchronize()`**: 这是一个内存屏障（memory barrier）。它确保在它之前的内存写操作（如锁的获取）对所有 CPU 都可见，并且在它之后的内存读/写操作不会被重排序到屏障之前。这对于保护临界区内的代码至关重要。

**释放锁 `release()`**:
[`release()`](source/xv6-riscv/kernel/spinlock.c:70) 的过程相对简单。

```c
// kernel/spinlock.c
void
release(struct spinlock *lk)
{
  if(!holding(lk))
    panic("release");

  lk->cpu = 0;

  __sync_synchronize(); // 内存屏障

  // 使用原子指令 amoswap.w.rl
  // 原子地将 lk->locked 设置为 0
  __sync_lock_release(&lk->locked);

  pop_off(); // 恢复中断状态
}
```
关键点分析:
1.  **`__sync_lock_release`**: 同样是一个原子操作，它将 `lk->locked` 的值安全地设置回 0。一个简单的 `lk->locked = 0;` 赋值操作在某些架构上可能不是原子的，因此必须使用特殊的原子指令。
2.  **`pop_off()`**: 恢复之前的中断状态。如果这是最外层的 `release` 调用，并且在进入时中断是开启的，那么此时会重新启用中断。

**使用场景**:
自旋锁最典型的应用就是保护内核内存分配器，如 [`kernel/kalloc.c`](source/xv6-riscv/kernel/kalloc.c:1) 中的 `kmem.lock`。分配或释放一个内存页的操作非常快，因此使用自旋锁是高效的。

---

## 5.4 睡眠锁 (Sleep-lock)

如果一个临界区执行时间很长（例如，涉及磁盘 I/O 的文件系统操作），使用自旋锁会让等待的 CPU 核心长时间空转，极大地浪费了计算资源。

为了解决这个问题，xv6 提供了**睡眠锁 (Sleep-lock)**。当一个进程尝试获取一个被占用的睡眠锁时，它不会自旋，而是会**放弃 CPU 并进入休眠状态**。当锁被释放时，操作系统会唤醒一个（或多个）正在等待的进程，让它们再次尝试获取锁。

### 5.4.1 睡眠锁的实现

睡眠锁的实现在 [`kernel/sleeplock.c`](source/xv6-riscv/kernel/sleeplock.c:19)，并且它依赖于 [`kernel/proc.c`](source/xv6-riscv/kernel/proc.c) 中的 `sleep` 和 `wakeup` 机制。

**数据结构**:
```c
// kernel/sleeplock.h
struct sleeplock {
  uint locked;            // 0 表示未锁定, 1 表示锁定
  struct spinlock lk;     // 保护 sleeplock 自身状态的自旋锁
  
  char *name;             // 锁的名称 (用于调试)
  int pid;                // 持有该锁的进程 ID
};
```
注意，每个睡眠锁内部都包含一个**自旋锁**。这个自旋锁不用于保护用户的临界区，而是用于保护睡眠锁自身的数据结构（如 `locked` 和 `pid` 字段）在并发访问时不出错。

**获取锁 `acquiresleep()`**:
[`acquiresleep()`](source/xv6-riscv/kernel/sleeplock.c:40) 的逻辑体现了“检查-休眠-再检查”的模式。

```c
// kernel/sleeplock.c
void
acquiresleep(struct sleeplock *lk)
{
  acquire(&lk->lk); // 1. 获取内部自旋锁，保护 sleeplock 状态
  while (lk->locked) {
    // 2. 如果锁被占用，则调用 sleep() 进入休眠
    sleep(lk, &lk->lk);
  }
  // 3. 被唤醒后，或锁原本就可用
  lk->locked = 1;
  lk->pid = myproc()->pid;
  release(&lk->lk); // 4. 释放内部自旋锁
}
```

**释放锁 `releasesleep()`**:
[`releasesleep()`](source/xv6-riscv/kernel/sleeplock.c:66) 的职责是释放锁并唤醒其他等待者。

```c
// kernel/sleeplock.c
void
releasesleep(struct sleeplock *lk)
{
  acquire(&lk->lk); // 1. 获取内部自旋锁
  lk->locked = 0;
  lk->pid = 0;
  wakeup(lk);       // 2. 唤醒所有等待在该锁上的进程
  release(&lk->lk); // 3. 释放内部自旋锁
}
```

### 5.4.2 `sleep` 和 `wakeup` 机制

睡眠锁的核心是 `sleep` 和 `wakeup` 这对函数。

*   **`sleep(void *chan, struct spinlock *lk)`**:
    这个函数让当前进程在某个“通道” (`chan`) 上休眠。`chan` 可以是任何用作唯一标识符的内核地址，对于睡眠锁来说，就是锁自身的地址 `lk`。

    `sleep` 的一个至关重要的特性是它的**原子性**。它必须原子地完成以下两件事：
    1.  释放传入的自旋锁 `lk`。
    2.  将当前进程的状态设置为 `SLEEPING`。

    这个原子性操作避免了“丢失的唤醒” (Lost Wakeup) 问题。如果这两步不是原子的，可能会发生以下情况：一个进程检查完 `lk->locked` (为 1)，正准备调用 `sleep`，但在调用前释放了内部自旋锁。此时，另一个进程恰好 `release` 了睡眠锁并调用了 `wakeup`。这个 `wakeup` 信号就丢失了，因为第一个进程还没来得及睡着。之后，第一个进程再进入休眠，就可能永远也醒不过来。`sleep` 函数通过在内部持有进程自身的锁来保证操作的原子性。

*   **`wakeup(void *chan)`**:
    这个函数会遍历整个进程表，将所有正在 `chan` 通道上休眠的进程的状态从 `SLEEPING` 改为 `RUNNABLE`。这些进程将在下一次调度器运行时有机会再次尝试获取锁。

---

## 5.5 自旋锁 vs. 睡眠锁

| 特性 | 自旋锁 (Spinlock) | 睡眠锁 (Sleep-lock) |
| :--- | :--- | :--- |
| **等待方式** | 忙等待 (Busy-Waiting)，持续占用 CPU | 阻塞 (Blocking)，进程休眠，让出 CPU |
| **CPU 效率** | 对于短临界区高效，但长临界区会浪费大量 CPU | 对于长临界区高效，避免 CPU 浪费 |
| **上下文切换** | 不会引起上下文切换 | 会引起两次上下文切换（休眠、唤醒） |
| **与中断关系** | 持有期间必须禁用中断 | 持有期间可以不禁用中断（但其内部自旋锁会短暂禁用）|
| **适用场景** | 短期、简单的资源锁定，如修改指针、计数器。常在中断处理程序中使用。| 长期、复杂的操作，如磁盘 I/O、文件系统操作。不能在中断处理程序中使用（因为不能休眠）。|

---

## 5.6 实验: 实现用户态互斥锁

**目标**:
在 xv6 中，内核提供了锁机制。本实验要求你为用户空间的线程（在后续章节会实现）设计并实现一个互斥锁（mutex）。这个锁将工作在用户态，但可能需要内核的帮助来实现原子性。

**要求**:
1.  **定义锁结构**: 在用户空间定义一个锁的数据结构。思考需要哪些字段来实现一个锁。
2.  **实现 `lock()` 和 `unlock()`**:
    *   `lock()` 函数应该能够原子地获取锁。如果锁已被占用，调用线程应该等待。
    *   `unlock()` 函数应该释放锁，并通知其他等待的线程。
3.  **原子操作**: 你需要一种方法来实现原子性的“测试并设置”操作。RISC-V 指令集提供了用户态可以访问的原子指令，如 `amoswap.w`。你需要使用内联汇编在 C 代码中调用它。
4.  **等待机制**: 当锁被占用时，简单地在用户态自旋会非常低效。思考如何实现一个更高效的等待机制。一个简单的方案是调用 `yield()` 系统调用主动让出 CPU，但更高级的方案可能需要设计新的系统调用（类似于 Linux 的 `futex`），让线程在内核中休眠，直到被 `unlock` 操作唤醒。
5.  **创建测试程序**: 编写一个多线程的测试程序，创建多个线程并发地对一个共享变量进行递增操作。使用你实现的互斥锁来保护这个共享变量，并验证最终结果是否正确。

**提示**:
*   核心挑战在于如何实现原子的 `test-and-set` 以及高效的等待策略。
*   研究 [`kernel/riscv.h`](source/xv6-riscv/kernel/riscv.h:1) 中的内联汇编，了解如何在 C 代码中使用 `amoswap`。
*   本实验的重点是锁的逻辑和原子性保证，初版可以先用 `yield()` 实现简单的等待。