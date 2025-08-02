# 第 8 章: 再谈并发

本章深入探讨了在复杂系统中管理并发的高级技术。我们将超越简单的锁机制，研究如何应对更复杂的场景，例如在数据结构、文件系统和进程管理中出现的并发问题。我们将分析 xv6 如何运用这些技术来确保系统的正确性和性能。

## 教学目标

1.  **理解高级锁模式**：学习如何使用锁来保护一个集合中的多个项目，以及如何为每个项目单独加锁。
2.  **掌握“类锁”机制**：通过引用计数的例子，理解如何保护跨多个抽象层共享的数据。
3.  **认识并发风险与性能**：分析数据竞争的潜在风险，并探讨锁的粒度如何影响系统并行性能。

---

## 1. 锁与数据结构：保护集合与保护条目

在并发编程中，一个常见的挑战是保护由多个部分组成的大型数据结构。例如，文件系统需要管理一组磁盘块缓冲区。对于这类集合，我们有两种基本的加锁策略：

*   **保护集合的锁 (Locking the whole collection)**：用一个锁保护整个数据结构。
*   **保护条目的锁 (Locking individual entries)**：为数据结构的每个条目或元素设置单独的锁。

### 1.1 块缓存 (`bcache`) 中的并发控制

xv6 的块缓存（[`kernel/bio.c`](source/xv6-riscv/kernel/bio.c)）是一个很好的例子。它维护了一个磁盘块的内存缓存，供文件系统代码使用。`bcache` 结构体包含一个全局锁 `bcache.lock` 和一个由 `NBUF` 个缓冲区组成的数组 `bcache.buf`。

```c
// kernel/bio.c

struct {
  struct spinlock lock;
  struct buf buf[NBUF];

  // Linked list of all buffers, through prev/next.
  // Sorted by how recently the buffer was used.
  // head.next is most recent, head.prev is least.
  struct buf head;
} bcache;
```

`bcache.lock` 保护了整个缓冲区的元数据，例如缓冲区的查找和 LRU 链表的维护。任何需要查找、分配或释放缓冲区的操作（如 `bget` 和 `brelse`）都必须先获取 `bcache.lock`。

然而，仅仅一个全局锁是不够的。如果两个进程同时获得了同一个缓冲区的引用，并试图对其进行读写，就会产生数据竞争。因此，每个 `buf` 结构体都包含一个自己的 `sleeplock`，用于保护该缓冲区的内容。

```c
// kernel/buf.h

struct buf {
  int valid;   // has data been read from disk?
  int disk;    // does disk "own" buf?
  uint dev;
  uint blockno;
  struct sleeplock lock;
  uint refcnt;
  struct buf *prev; // LRU cache list
  struct buf *next;
  uchar data[BSIZE];
};
```

*   `bget` 函数在返回一个缓冲区之前，会为其获取一个 `sleeplock`。
*   `brelse` 函数在释放缓冲区之前，会释放其 `sleeplock`。

这种“集合锁 + 条目锁”的模式，在保证集合元数据一致性的同时，也允许对不同数据条目的并行访问，从而提高了性能。

## 2. “类锁”机制：引用计数

当一个资源（如内存页或文件描述符）被多个实体共享时，我们如何知道何时可以安全地释放它？如果过早释放，其他使用者会遇到悬空指针；如果从不释放，则会造成内存泄漏。

**引用计数 (Reference Counting)** 是一种优雅的解决方案。其核心思想是：

*   每个共享资源都有一个计数器 `refcnt`。
*   当一个新的实体开始使用该资源时，`refcnt` 加一。
*   当一个实体停止使用该资源时，`refcnt` 减一。
*   当 `refcnt` 减到 0 时，说明没有任何实体在使用该资源，可以安全地释放它。

### 2.1 文件系统中的引用计数

xv6 在多个地方使用了引用计数。例如，`struct inode`（[`kernel/fs.h`](source/xv6-riscv/kernel/fs.h:1) 和 `struct file`（[`kernel/file.h`](source/xv6-riscv/kernel/file.h:1)) 都有一个 `refcnt` 字段。

*   **`struct inode`**: 代表一个文件在磁盘上的元数据。多个进程可能通过不同的文件描述符指向同一个文件，因此需要引用计数来跟踪有多少指针指向这个 inode。当 `refcnt` 为 0 时，可以回收这个 inode。
*   **`struct file`**: 代表一个打开的文件。`fork()` 系统调用会复制父进程的文件描述符表，导致子进程和父进程共享同一个 `struct file`。`dup()` 系统调用也会创建对同一个 `struct file` 的新引用。

[`kernel/file.c`](source/xv6-riscv/kernel/file.c) 中的 `filealloc`、`filedup` 和 `fileclose` 函数共同管理着 `struct file` 的引用计数。

```c
// kernel/file.c

// Increment ref count for file f.
struct file*
filedup(struct file *f)
{
  acquire(&ftable.lock);
  if(f->ref < 1)
    panic("filedup");
  f->ref++;
  release(&ftable.lock);
  return f;
}

// Close file f.  (Decrement ref count, close when reaches 0.)
void
fileclose(struct file *f)
{
  struct file ff;

  acquire(&ftable.lock);
  if(f->ref < 1)
    panic("fileclose");
  if(--f->ref > 0){
    release(&ftable.lock);
    return;
  }
  
  ff = *f;
  f->ref = 0;
  f->type = FD_NONE;
  release(&ftable.lock);

  if(ff.type == FD_PIPE){
    pipeclose(ff.pipe, ff.writable);
  } else if(ff.type == FD_INODE || ff.type == FD_DEVICE){
    begin_op();
    iput(ff.ip);
    end_op();
  }
}
```
引用计数本身也需要锁来保护，以防止并发的 `++` 和 `--` 操作导致竞争。在 `file.c` 中，`ftable.lock` 保护了所有文件对象的引用计数。

### 2.2 管道中的引用计数

管道（[`kernel/pipe.c`](source/xv6-riscv/kernel/pipe.c)) 也使用了引用计数来管理读端和写端。一个管道 `struct pipe` 包含 `readopen` 和 `writeopen` 两个布尔值以及各自的引用计数。当一个管道的所有读端或写端都被关闭时，相应的读写操作会表现出特定的行为（例如，读一个没有写端的管道会返回 EOF）。

### 2.3 内存分配器中的引用计数

物理内存分配器 (`kernel/kalloc.c`) 对每个物理页都维护一个引用计数。这对于实现写时复制 (Copy-on-Write) `fork` 至关重要。当 `fork` 创建一个新进程时，它不会立即复制父进程的所有内存页，而是让父子进程共享这些页，并将页标记为只读。同时，这些共享页的引用计数会增加。当任何一方试图写入共享页时，会触发一个页面错误，此时内核才会真正复制该页，并递减旧页的引用计数。

## 3. 并发性能与锁的粒度

锁是保证正确性的必要手段，但它也可能成为性能瓶颈。如果一个锁保护了太多数据，导致多个不相关的操作需要竞争同一个锁，那么系统的并行度就会下降。

**锁的粒度 (Lock Granularity)** 是一个关键的设计决策：

*   **粗粒度锁 (Coarse-grained locking)**：一个锁保护大量数据。
    *   **优点**：实现简单，死锁风险低。
    *   **缺点**：限制了并行性，可能成为性能瓶颈。例如，如果整个文件系统只用一个大锁，那么任何文件操作都会阻塞其他所有文件操作。
*   **细粒度锁 (Fine-grained locking)**：多个锁，每个保护一小部分数据。
    *   **优点**：允许更高的并行度，性能更好。
    *   **缺点**：实现复杂，容易引入死锁。例如，如果一个操作需要获取多个锁，就必须保证所有线程都以相同的顺序获取这些锁，否则可能导致死锁。

xv6 在设计上试图平衡这对矛盾。例如，`bcache` 使用了全局锁和每个 `buf` 的锁，文件系统为每个 inode 单独加锁，而不是使用一个全局的文件系统锁。这些都是为了在保证正确性的前提下，尽可能提高并行性。

---

## 实验：并发编程挑战

以下实验将挑战你对本章所学知识的运用，要求你在保证正确性的前提下，优化 xv6 的并发性能。

### 实验 1: 优化管道 (Concurrent Pipe)

**目标**：修改 [`pipe.c`](source/xv6-riscv/kernel/pipe.c) 中的代码，使其能够并发地执行 `pipewrite` 和 `piperead`。当前的实现使用一个锁来保护整个管道的数据缓冲区，这意味着读和写操作是互斥的。请设计一种方案，允许一个线程写入数据的同时，另一个线程可以从中读取数据，而不会发生数据竞争。

**提示**：你可能需要使用两个索引来分别跟踪缓冲区的读写位置，并仔细处理缓冲区为空或为满时的边界情况。你需要确保你的锁方案能正确地协调读写操作。

### 实验 2: 优化调度器 (Concurrent Scheduler)

**目标**：当前的 xv6 调度器为每个 CPU 核心维护一个单独的进程列表，但调度和进程窃取（work-stealing）的逻辑可能仍然存在性能瓶颈或需要更精细的锁。请分析 [`kernel/proc.c`](source/xv6-riscv/kernel/proc.c) 中与调度相关的锁（如 `proc->lock`），并尝试优化它们。例如，是否可以减少锁的持有时间？或者使用更细粒度的锁来提高并行性？

**提示**：这个实验是开放性的。你需要识别出调度器中的潜在瓶颈，并设计出一种既能提高性能又不会引入竞争条件或死锁的方案。

### 实验 3: 优化 `fork` (Concurrent `fork`)

**目标**：`fork()` 系统调用在复制父进程的地址空间时，需要持有多个锁，并且会执行密集的内存操作，这可能成为一个性能瓶颈。当前的 `fork()` 在复制页表时会持有父进程的 `pagetable_lock` 很长时间。请研究 `uvmcopy()` 函数，并尝试通过优化锁的粒度来减少 `fork` 的延迟。

**提示**：一个可能的思路是，在复制页表项（PTE）时，能否在不持有整个页表锁的情况下完成大部分工作？或者能否分阶段释放和重新获取锁，以允许其他线程在此期间运行？你需要非常小心，确保在任何时候都不会破坏页表的一致性。