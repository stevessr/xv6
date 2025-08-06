# 锁模式

缓存项的加锁通常是一个挑战。
例如，文件系统的块缓存 `kernel/bio.c:bget` 存储了多达 `NBUF` 个磁盘块的副本。
至关重要的是，一个给定的磁盘块在缓存中最多只能有一个副本；否则，不同的进程可能会对本应是同一个块的不同副本进行冲突的更改。
每个缓存的块都存储在一个 `struct buf` ([`kernel/buf.h:1`](/source/xv6-riscv/kernel/buf.h.md#L1)) 中。
一个 `struct buf` 有一个锁字段，这有助于确保在同一时间只有一个进程使用一个给定的磁盘块。
然而，这个锁是不够的：如果一个块根本不存在于缓存中，而两个进程想同时使用它呢？
由于块尚未被缓存，所以没有 `struct buf`，因此也就没有东西可以锁定。
Xv6 通过将一个额外的锁（`bcache.lock`）与缓存块的身份集合相关联来处理这种情况。
需要检查一个块是否被缓存的代码（例如，[`bget`](/source/xv6-riscv/kernel/bio.c.md) `kernel/bio.c:bget`），或者改变缓存块集合的代码，都必须持有 `bcache.lock`；在该代码找到它需要的块和 `struct buf` 之后，它可以释放 `bcache.lock`，只锁定特定的块。
这是一个常见的模式：一个锁用于项目集合，每个项目再加一个锁。

通常，获取锁的函数也会释放它。
但更精确的看法是，锁是在一个必须以原子方式出现的操作序列开始时获取的，并在该序列结束时释放。
如果序列在不同的函数、不同的线程或不同的 CPU 上开始和结束，那么锁的获取和释放也必须这样做。
锁的功能是强制其他使用者等待，而不是将一段数据固定在某个特定的代理上。
一个例子是 [`yield`](/source/xv6-riscv/kernel/defs.h.md) (`kernel/proc.c:yield`) 中的 [`acquire`](/source/xv6-riscv/kernel/defs.h.md)，它在调度器线程中被释放，而不是在获取它的进程中。
另一个例子是 [`ilock`](/source/xv6-riscv/kernel/defs.h.md) (`kernel/fs.c:ilock`) 中的 [`acquiresleep`](/source/xv6-riscv/kernel/defs.h.md)；这段代码在读取磁盘时经常会休眠；它可能会在另一个 CPU 上被唤醒，这意味着锁可能会在不同的 CPU 上被获取和释放。

释放一个受嵌入在对象中的锁保护的对象是一件微妙的事情，因为拥有锁并不足以保证释放是正确的。
问题出现在当其他线程在 [`acquire`](/source/xv6-riscv/kernel/defs.h.md) 中等待使用该对象时；释放该对象会隐式地释放嵌入的锁，这将导致等待的线程发生故障。
一个解决方案是跟踪该对象存在多少引用，以便仅在最后一个引用消失时才释放它。
参见 [`pipeclose`](/source/xv6-riscv/kernel/defs.h.md) (`kernel/pipe.c:pipeclose`) 的例子；
`pi->readopen` 和 `pi->writeopen` 跟踪管道是否有文件描述符引用它。

通常我们看到锁围绕着对一组相关项目的读写序列；锁确保其他线程只看到完整的更新序列（只要它们也加锁）。
那么，当更新只是对单个共享变量的简单写入时，情况又如何呢？
例如，[`setkilled`](/source/xv6-riscv/kernel/defs.h.md) 和 [`killed`](/source/xv6-riscv/kernel/defs.h.md) (`kernel/proc.c:setkilled`) 在它们对 `p->killed` 的简单使用周围加锁。
如果没有锁，一个线程可能在另一个线程读取 `p->killed` 的同时写入它。
这是一个竞争，C语言规范说竞争会产生未定义行为，这意味着程序可能会崩溃或产生不正确的结果[^1]。
锁可以防止竞争并避免未定义行为。

竞争可能破坏程序的一个原因是，如果没有锁或等效的构造，编译器可能会生成与原始 C 代码非常不同的读写内存的机器代码。
例如，调用 [`killed`](/source/xv6-riscv/kernel/defs.h.md) 的线程的机器代码可能会将 `p->killed` 复制到一个寄存器中，并且只读取那个缓存的值；这意味着该线程可能永远看不到对 `p->killed` 的任何写入。
锁可以防止这种缓存。

[^1]: "Threads and data races" in https://en.cppreference.com/w/c/language/memory_model