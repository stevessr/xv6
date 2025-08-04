# 代码：缓冲区缓存

缓冲区缓存是一个双向链表的缓冲区。函数 [`binit`](/source/xv6-riscv/kernel/defs.h)，由 [`main`](/source/xv6-riscv/user/zombie.c) 调用，用静态数组 `buf` 中的 `NBUF` 个缓冲区初始化列表。对缓冲区缓存的所有其他访问都通过 `bcache.head` 引用链表，而不是 `buf` 数组。

一个缓冲区有两个与之关联的状态字段。字段 `valid` 表示缓冲区包含该块的副本。字段 `disk` 表示缓冲区内容已交给磁盘，磁盘可能会更改缓冲区（例如，将数据从磁盘写入 `data`）。

[`bread`](/source/xv6-riscv/kernel/bio.c) 调用 [`bget`](/source/xv6-riscv/kernel/bio.c) 来获取给定扇区的缓冲区。如果需要从磁盘读取缓冲区，[`bread`](/source/xv6-riscv/kernel/bio.c) 调用 [`virtio_disk_rw`](/source/xv6-riscv/kernel/defs.h) 来执行此操作，然后返回缓冲区。

[`bget`](/source/xv6-riscv/kernel/bio.c) 扫描缓冲区列表，查找具有给定设备和扇区号的缓冲区。如果存在这样的缓冲区，[`bget`](/source/xv6-riscv/kernel/bio.c) 获取该缓冲区的休眠锁。[`bget`](/source/xv6-riscv/kernel/bio.c) 然后返回锁定的缓冲区。

如果没有给定扇区的缓存缓冲区，[`bget`](/source/xv6-riscv/kernel/bio.c) 必须创建一个，可能会重用一个保存不同扇区的缓冲区。它第二次扫描缓冲区列表，寻找一个未被使用的缓冲区（`b->refcnt = 0`）；任何这样的缓冲区都可以使用。[`bget`](/source/xv6-riscv/kernel/bio.c) 编辑缓冲区元数据以记录新的设备和扇区号并获取其休眠锁。请注意，赋值 `b->valid = 0` 确保 [`bread`](/source/xv6-riscv/kernel/bio.c) 将从磁盘读取块数据，而不是错误地使用缓冲区的先前内容。

每个磁盘扇区最多只有一个缓存缓冲区，这一点很重要，以确保读者看到写入，并且因为文件系统使用缓冲区上的锁进行同步。[`bget`](/source/xv6-riscv/kernel/bio.c) 通过持有 `bache.lock` 从第一个循环检查块是否被缓存到第二个循环声明块现在被缓存（通过设置 `dev`、`blockno` 和 `refcnt`）来确保此不变量。这使得检查块是否存在和（如果不存在）指定一个缓冲区来保存该块是原子的。

[`bget`](/source/xv6-riscv/kernel/bio.c) 在 `bcache.lock` 临界区之外获取缓冲区的休眠锁是安全的，因为非零的 `b->refcnt` 阻止了缓冲区被重用于不同的磁盘块。休眠锁保护对块的缓冲内容的读取和写入，而 `bcache.lock` 保护有关哪些块被缓存的信息。

如果所有缓冲区都繁忙，则说明有太多进程同时执行文件系统调用；[`bget`](/source/xv6-riscv/kernel/bio.c) 会 panic。更优雅的响应可能是休眠直到有缓冲区变为空闲，尽管那样可能会出现死锁。

一旦 [`bread`](/source/xv6-riscv/kernel/bio.c) 读取了磁盘（如果需要）并返回缓冲区给其调用者，调用者就独占使用该缓冲区，可以读取或写入数据字节。如果调用者确实修改了缓冲区，它必须在释放缓冲区之前调用 [`bwrite`](/source/xv6-riscv/kernel/defs.h) 将更改的数据写入磁盘。[`bwrite`](/source/xv6-riscv/kernel/defs.h) 调用 [`virtio_disk_rw`](/source/xv6-riscv/kernel/defs.h) 与磁盘硬件通信。

当调用者完成一个缓冲区时，它必须调用 [`brelse`](/source/xv6-riscv/kernel/defs.h) 来释放它。（名称 [`brelse`](/source/xv6-riscv/kernel/defs.h)，是 b-release 的缩写，虽然晦涩但值得学习：它起源于 Unix，也在 BSD、Linux 和 Solaris 中使用。）[`brelse`](/source/xv6-riscv/kernel/defs.h) 释放休眠锁并将缓冲区移动到链表的前端。移动缓冲区会导致列表按缓冲区最近使用的顺序排序（意味着释放）：列表中的第一个缓冲区是最近使用的，最后一个是最近最少使用的。[`bget`](/source/xv6-riscv/kernel/bio.c) 中的两个循环利用了这一点：扫描现有缓冲区最坏情况下需要处理整个列表，但首先检查最近使用的缓冲区（从 `bcache.head` 开始并跟随 `next` 指针）将在有良好引用局部性时减少扫描时间。选择重用缓冲区的扫描通过向后扫描（跟随 `prev` 指针）来选择最近最少使用的缓冲区。