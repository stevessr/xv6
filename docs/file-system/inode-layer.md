# Inode 层

术语 inode 可以有两个相关的含义。它可以指包含文件大小和数据块编号列表的磁盘上数据结构。或者“inode”可以指内存中的 inode，它包含磁盘上 inode 的副本以及内核中所需的额外信息。

磁盘上的 inode 被打包在一个称为 inode 块的连续磁盘区域中。每个 inode 大小相同，因此给定一个数字 n，很容易在磁盘上找到第 n 个 inode。实际上，这个数字 n，称为 inode 号或 i-number，是实现中标识 inode 的方式。

磁盘上的 inode 由一个 `struct dinode` 定义。`type` 字段区分文件、目录和特殊文件（设备）。类型为零表示磁盘上的 inode 是空闲的。`nlink` 字段计算引用此 inode 的目录条目数，以便识别何时应释放磁盘上的 inode 及其数据块。`size` 字段记录文件内容的字节数。`addrs` 数组记录保存文件内容的磁盘块的块号。

内核将活动 inode 集保存在内存中一个名为 `itable` 的表中；`struct inode` 是磁盘上 `struct dinode` 的内存副本。内核仅在有 C 指针引用该 inode 时才将其存储在内存中。`ref` 字段计算引用内存中 inode 的 C 指针数，如果引用计数降至零，内核会从内存中丢弃该 inode。[`iget`](/source/xv6-riscv/kernel/fs.c.md) 和 [`iput`](/source/xv6-riscv/kernel/defs.h.md) 函数获取和释放指向 inode 的指针，修改引用计数。指向 inode 的指针可以来自文件描述符、当前工作目录和临时内核代码，例如 [`exec`](/source/xv6-riscv/user/user.h.md)。

xv6 的 inode 代码中有四种锁或类似锁的机制。`itable.lock` 保护了 inode 在 inode 表中最多出现一次的不变量，以及内存中 inode 的 `ref` 字段计算指向该 inode 的内存指针数的不变量。每个内存中的 inode 都有一个 `lock` 字段，其中包含一个休眠锁，确保对 inode 字段（如文件长度）以及 inode 的文件或目录内容块的独占访问。inode 的 `ref`，如果大于零，会导致系统在表中维护该 inode，并且不重用该表条目用于不同的 inode。最后，每个 inode 包含一个 `nlink` 字段（在磁盘上，如果在内存中则复制在内存中），计算引用文件的目录条目数；如果其链接计数大于零，xv6 不会释放 inode。

由 `iget()` 返回的 `struct inode` 指针保证在相应的 `iput()` 调用之前是有效的；inode 不会被删除，并且指针引用的内存不会被重用于不同的 inode。`iget()` 提供对 inode 的非独占访问，因此可以有许多指向同一 inode 的指针。文件系统代码的许多部分都依赖于 `iget()` 的这种行为，既用于持有对 inode 的长期引用（如打开的文件和当前目录），又用于在避免操作多个 inode 的代码中死锁的同时防止竞争（如路径名查找）。

[`iget`](/source/xv6-riscv/kernel/fs.c.md) 返回的 `struct inode` 可能没有任何有用的内容。为了确保它持有磁盘上 inode 的副本，代码必须调用 [`ilock`](/source/xv6-riscv/kernel/defs.h.md)。这将锁定 inode（以便没有其他进程可以 [`ilock`](/source/xv6-riscv/kernel/defs.h.md) 它）并从磁盘读取 inode，如果尚未读取的话。[`iunlock`](/source/xv6-riscv/kernel/defs.h.md) 释放 inode 上的锁。将 inode 指针的获取与锁定分开在某些情况下有助于避免死锁，例如在目录查找期间。多个进程可以持有由 [`iget`](/source/xv6-riscv/kernel/fs.c.md) 返回的指向 inode 的 C 指针，但一次只有一个进程可以锁定该 inode。

inode 表只存储那些内核代码或数据结构持有 C 指针的 inode。它的主要工作是同步多个进程的访问。inode 表也恰好缓存了频繁使用的 inode，但缓存是次要的；如果一个 inode 被频繁使用，缓冲区缓存很可能会将其保存在内存中。修改内存中 inode 的代码会使用 [`iupdate`](/source/xv6-riscv/kernel/defs.h.md) 将其写入磁盘。