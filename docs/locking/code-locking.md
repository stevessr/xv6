# 代码：锁

Xv6 有两种类型的锁：自旋锁和睡眠锁。我们从自旋锁开始。Xv6 将自旋锁表示为 `struct spinlock`。结构中重要的字段是 `locked`，这是一个字，当锁可用时为零，当锁被持有时为非零。逻辑上，xv6 应该通过执行类似以下代码来获取锁：


```
c
void
acquire(struct spinlock *lk) // 无法工作！
{
  for(;;) {
    if(lk->locked == 0) {  // (1)
      lk->locked = 1;      // (2)
      break;
    }
  }
}

```


不幸的是，这个实现在多处理器上不能保证互斥。可能会发生两个 CPU 同时到达第 (1) 行，看到 `lk->locked` 为零，然后都通过执行第 (2) 行来获取锁。此时，两个不同的 CPU 持有锁，这违反了互斥属性。我们需要的是一种使第 (1) 行和第 (2) 行作为一个**原子**（即不可分割的）步骤执行的方法。

由于锁被广泛使用，多核处理器通常提供实现第 (1) 和 (2) 行原子版本的指令。在 RISC-V 上，这个指令是 `amoswap r, a`。`amoswap` 读取内存地址 `a` 的值，将寄存器 `r` 的内容写入该地址，并将其读取的值放入 `r` 中。也就是说，它交换了寄存器和内存地址的内容。它原子地执行这个序列，使用特殊的硬件来防止任何其他 CPU 在读和写之间使用该内存地址。

Xv6 的 [`acquire`](/source/xv6-riscv/kernel/defs.h) 使用了可移植的 C 库调用 `__sync_lock_test_and_set`，它最终归结为 `amoswap` 指令；返回值是 `lk->locked` 的旧（交换过的）内容。 [`acquire`](/source/xv6-riscv/kernel/defs.h) 函数将交换包装在一个循环中，重试（自旋）直到它获得锁。每次迭代都将一个 1 交换到 `lk->locked` 中并检查之前的值；如果之前的值是零，那么我们就获得了锁，并且交换将把 `lk->locked` 设置为 1。如果之前的值是 1，那么某个其他的 CPU 持有锁，并且我们原子地将 1 交换到 `lk->locked` 中并不会改变它的值。

一旦获取了锁，[`acquire`](/source/xv6-riscv/kernel/defs.h) 会为了调试而记录获取锁的 CPU。`lk->cpu` 字段受锁保护，并且只能在持有锁时更改。

函数 [`release`](/source/xv6-riscv/kernel/defs.h) 与 [`acquire`](/source/xv6-riscv/kernel/defs.h) 相反：它清除 `lk->cpu` 字段，然后释放锁。从概念上讲，释放只需要将零赋给 `lk->locked`。C 标准允许编译器用多个存储指令