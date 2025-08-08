# 代码：日志记录

在系统调用中典型使用日志的方式如下：

```c
  begin_op();
  ...
  bp = bread(...);
  bp->data[...] = ...;
  log_write(bp);
  ...
  end_op();

```


[`begin_op`](/source/xv6-riscv/kernel/defs.h.md) 等待直到日志系统当前没有在提交，并且有足够的未保留日志空间来容纳此调用的写入。`log.outstanding` 计算已保留日志空间的系统调用数量；总保留空间是 `log.outstanding` 乘以 `MAXOPBLOCKS`。增加 `log.outstanding` 既保留了空间，又阻止了在此系统调用期间发生提交。代码保守地假设每个系统调用最多可能写入 `MAXOPBLOCKS` 个不同的块。

[`log_write`](/source/xv6-riscv/kernel/defs.h.md) 充当 [`bwrite`](/source/xv6-riscv/kernel/defs.h.md) 的代理。它在内存中记录块的扇区号，在磁盘上的日志中为其保留一个槽位，并将缓冲区固定在块缓存中以防止块缓存将其逐出。块必须在提交之前一直留在缓存中：在此之前，缓存的副本是修改的唯一记录；在提交之后才能将其写入其在磁盘上的位置；并且同一事务中的其他读取必须看到修改。[`log_write`](/source/xv6-riscv/kernel/defs.h.md) 注意到一个块在单个事务中被多次写入时，会为该块在日志中分配相同的槽位。这种优化通常被称为吸收。例如，包含多个文件的 inode 的磁盘块在一个事务中被多次写入是很常见的。通过将多个磁盘写入吸收为一个，文件系统可以节省日志空间并可以实现更好的性能，因为只需要将磁盘块的一个副本写入磁盘。

[`end_op`](/source/xv6-riscv/kernel/defs.h.md) 首先减少未完成的系统调用计数。如果计数现在为零，它通过调用 [`commit()`](/source/xv6-riscv/kernel/log.c.md#commit-kernel-log-c) 来提交当前事务。此过程有四个阶段。[`write_log()`](/source/xv6-riscv/kernel/log.c.md#write_log-kernel-log-c) 将事务中修改的每个块从缓冲区缓存复制到其在磁盘上日志中的槽位。[`write_head()`](/source/xv6-riscv/kernel/log.c.md#write_head-kernel-log-c) 将头部块写入磁盘：这是提交点，写入后发生崩溃将导致恢复从日志中重放事务的写入。[`install_trans`](/source/xv6-riscv/kernel/log.c.md#install_trans-kernel-log-c) 从日志中读取每个块并将其写入文件系统中的适当位置。最后 [`end_op`](/source/xv6-riscv/kernel/defs.h.md) 用零计数写入日志头部；这必须在下一个事务开始写入日志块之前发生，这样崩溃就不会导致恢复使用一个事务的头部和后续事务的日志块。

[`recover_from_log`](/source/xv6-riscv/kernel/log.c.md) 从 [`initlog`](/source/xv6-riscv/kernel/defs.h.md) 调用，而后者又从 [`fsinit`](/source/xv6-riscv/kernel/defs.h.md) 在引导期间第一个用户进程运行之前调用。它读取日志头部，如果头部指示日志包含已提交的事务，则模仿 [`end_op`](/source/xv6-riscv/kernel/defs.h.md) 的操作。

[`filewrite`](/source/xv6-riscv/kernel/defs.h.md) 中出现了一个使用日志的例子。事务看起来像这样：

```c
      begin_op();
      ilock(f->ip);
      r = writei(f->ip, ...);
      iunlock(f->ip);
      end_op();

```

此代码被包装在一个循环中，该循环将大的写入分解为一次只有几个扇区的单个事务，以避免溢出日志。对 [`writei`](/source/xv6-riscv/kernel/defs.h.md) 的调用作为此事务的一部分写入许多块：文件的 inode、一个或多个位图块以及一些数据块。