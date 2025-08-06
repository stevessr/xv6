# 代码：Inode

要分配一个新的 inode（例如，在创建文件时），xv6 调用 [`ialloc`](/source/xv6-riscv/kernel/fs.c.md)。[`ialloc`](/source/xv6-riscv/kernel/fs.c.md) 类似于 [`balloc`](/source/xv6-riscv/kernel/fs.c.md)：它一次一个块地遍历磁盘上的 inode 结构，寻找一个被标记为空闲的 inode。当它找到一个时，它通过向磁盘写入新的 `type` 来声明它，然后通过对 [`iget`](/source/xv6-riscv/kernel/fs.c.md) 的尾调用返回一个 inode 表条目。[`ialloc`](/source/xv6-riscv/kernel/fs.c.md) 的正确操作依赖于这样一个事实：一次只有一个进程可以持有对 `bp` 的引用：[`ialloc`](/source/xv6-riscv/kernel/fs.c.md) 可以确保没有其他进程同时看到该 inode 可用并试图声明它。

[`iget`](/source/xv6-riscv/kernel/fs.c.md) 在 inode 表中查找具有所需设备和 inode 号的活动条目（`ip->ref > 0`）。如果找到一个，它会返回对该 inode 的新引用。当 [`iget`](/source/xv6-riscv/kernel/fs.c.md) 扫描时，它记录第一个空槽的位置，如果需要分配表条目，它会使用该位置。

代码必须在使用 [`ilock`](/source/xv6-riscv/kernel/defs.h.md) 锁定 inode 之后才能读取或写入其元数据或内容。[`ilock`](/source/xv6-riscv/kernel/defs.h.md) 为此使用休眠锁。一旦 [`ilock`](/source/xv6-riscv/kernel/defs.h.md) 对 inode 具有独占访问权，它会根据需要从磁盘（更可能是缓冲区缓存）读取 inode。函数 [`iunlock`](/source/xv6-riscv/kernel/defs.h.md) 释放休眠锁，这可能会唤醒任何正在休眠的进程。

[`iput`](/source/xv6-riscv/kernel/defs.h.md) 通过递减引用计数来释放指向 inode 的 C 指针。如果这是最后一个引用，则 inode 在 inode 表中的槽位现在是空闲的，可以被重用于不同的 inode。

如果 [`iput`](/source/xv6-riscv/kernel/defs.h.md) 看到一个 inode 没有 C 指针引用，并且该 inode 没有链接到它（即没有出现在任何目录中），那么该 inode 及其数据块必须被释放。[`iput`](/source/xv6-riscv/kernel/defs.h.md) 调用 [`itrunc`](/source/xv6-riscv/kernel/defs.h.md) 将文件截断为零字节，释放数据块；将 inode 类型设置为 0（未分配）；并将 inode 写入磁盘。

在 [`iput`](/source/xv6-riscv/kernel/defs.h.md) 释放 inode 的情况下，其锁定协议值得仔细研究。一个危险是，一个并发线程可能正在 [`ilock`](/source/xv6-riscv/kernel/defs.h.md) 中等待使用此 inode（例如，读取文件或列出目录），并且没有准备好发现该 inode 不再被分配。这不会发生，因为如果一个内存中的 inode 没有链接并且 `ip->ref` 为 1，则系统调用无法获取指向它的指针。这一个引用是调用 [`iput`](/source/xv6-riscv/kernel/defs.h.md) 的线程所拥有的引用。另一个主要危险是，并发调用 [`ialloc`](/source/xv6-riscv/kernel/fs.c.md) 可能会选择 [`iput`](/source/xv6-riscv/kernel/defs.h.md) 正在释放的同一个 inode。这只有在 [`iupdate`](/source/xv6-riscv/kernel/defs.h.md) 写入磁盘，使 inode 类型为零之后才会发生。这种竞争是良性的；分配线程会礼貌地等待获取 inode 的休眠锁，然后再读取或写入该 inode，此时 [`iput`](/source/xv6-riscv/kernel/defs.h.md) 已经完成了对它的操作。

`iput()` 可以写入磁盘。这意味着任何使用文件系统的系统调用都可能写入磁盘，因为该系统调用可能是最后一个持有文件引用的系统调用。即使像 `read()` 这样看起来是只读的调用，也可能最终调用 `iput()`。这反过来意味着，即使是只读的系统调用，如果它们使用文件系统，也必须包装在事务中。

`iput()` 和崩溃之间存在一个具有挑战性的交互。当文件的链接计数降至零时，`iput()` 不会立即截断文件，因为某个进程可能仍然持有对该 inode 的内存引用：一个进程可能仍在读写该文件，因为它成功地打开了它。但是，如果在最后一个进程关闭该文件的文件描述符之前发生崩溃，那么该文件将在磁盘上被标记为已分配，但没有目录条目指向它。

文件系统通过以下两种方式之一来处理这种情况。简单的解决方案是，在恢复时，重启后，文件系统扫描整个文件系统，查找那些被标记为已分配但没有目录条目指向它们的文件。如果存在任何这样的文件，那么它可以释放这些文件。

第二种解决方案不需要扫描文件系统。在这种解决方案中，文件系统在磁盘上记录（例如，在超级块中）链接计数降至零但引用计数不为零的文件的 inode 号。如果文件系统在引用计数达到 0 时删除该文件，那么它会通过从列表中删除该 inode 来更新磁盘上的列表。在恢复时，文件系统会释放列表中的任何文件。

Xv6 两种解决方案都没有实现，这意味着 inode 可能会在磁盘上被标记为已分配，即使它们已不再使用。这意味着随着时间的推移，xv6 可能会耗尽磁盘空间。