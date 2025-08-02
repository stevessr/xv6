# 第 6 章：文件系统

## 1. 教学目标

本章旨在深入剖析 xv6 文件系统的实现。学完本章后，你应该能够：

1.  **理解分层架构**：掌握 xv6 文件系统从文件描述符到 inode，再到磁盘块的分层设计思想。
2.  **掌握 Inode**：理解 inode 作为文件系统中核心数据结构的作用，及其如何描述文件元数据和数据块。
3.  **分析日志系统**：分析日志层（logging layer）如何通过预写式日志（Write-Ahead Logging）机制来保证系统在崩溃后数据的一致性。
4.  **了解块缓存**：理解缓冲区缓存（buffer cache）如何作为磁盘和上层文件系统之间的桥梁，提高 I/O 性能并同步对磁盘块的访问。

## 2. 文件系统概述

文件系统的核心任务是组织和持久化存储数据。xv6 文件系统实现了一个类似 Unix 的文件系统，提供了文件、目录和路径名等抽象，并将数据存储在 virtio 磁盘上。为了应对并发访问、崩溃恢复和性能等挑战，xv6 将文件系统设计为七个层次：

1.  **文件描述符层 (File Descriptor Layer)**：这是最高层，它将文件、管道、设备等多种内核资源抽象为统一的文件描述符接口，极大地简化了用户程序的编写。相关代码在 [`kernel/file.c`](source/xv6-riscv/kernel/file.c) 和 [`kernel/sysfile.c`](source/xv6-riscv/kernel/sysfile.c) 中。
2.  **路径名层 (Pathname Layer)**：负责解析像 `/usr/bin/cat` 这样的路径名，通过逐级查找将其转换为对应的 inode。相关代码在 [`kernel/fs.c`](source/xv6-riscv/kernel/fs.c) 中。
3.  **目录层 (Directory Layer)**：将目录实现为一种特殊的 inode，其内容是一系列目录项 (`struct dirent`)。每个目录项包含一个文件名和对应的 inode 编号。相关代码在 [`kernel/fs.c`](source/xv6-riscv/kernel/fs.c)。
4.  **Inode 层 (Inode Layer)**：管理文件系统中的核心数据结构 inode。每个文件或目录都由一个 inode 表示，它包含了文件的元数据（如类型、大小、链接数）和指向数据块的指针数组。相关代码在 [`kernel/fs.c`](source/xv6-riscv/kernel/fs.c)。
5.  **日志层 (Logging Layer)**：实现崩溃恢复功能。它将多个磁盘写操作包装成一个原子事务，确保在系统崩溃时文件系统不会处于不一致的状态。相关代码在 [`kernel/log.c`](source/xv6-riscv/kernel/log.c)。
6.  **缓冲区缓存层 (Buffer Cache Layer)**：缓存常用的磁盘块到内存中，减少磁盘 I/O 次数。同时，它也为并发访问磁盘块提供了同步机制。相关代码在 [`kernel/bio.c`](source/xv6-riscv/kernel/bio.c)。
7.  **磁盘层 (Disk Layer)**：最底层，负责与 virtio 磁盘硬件通信，执行实际的块读写操作。

本章将遵循自底向上的顺序，从缓冲区缓存层开始，逐层向上分析文件系统的实现。

## 3. 缓冲区缓存层 (`bio.c`)

缓冲区缓存层（`bio.c`）是文件系统的基石，它有两个主要职责：
1.  **缓存 (Caching)**：将磁盘块的内容保存在内存中，避免频繁地从慢速的磁盘读取数据。
2.  **同步 (Synchronization)**：确保任何一个磁盘块在内存中只有一个副本，并且一次只有一个进程可以修改这个副本，从而避免数据竞争。

### 3.1. 核心接口

该层向高层提供三个核心函数：
-   [`bread(dev, blockno)`](source/xv6-riscv/kernel/bio.c)：获取一个包含指定磁盘块内容的缓冲区（`struct buf`）。如果该块不在缓存中，`bread` 会从磁盘读取它。返回的缓冲区是锁定的，调用者拥有对其的独占访问权。
-   [`bwrite(b)`](source/xv6-riscv/kernel/bio.c)：将一个已被修改的缓冲区的内容写回磁盘。
-   [`brelse(b)`](source/xv6-riscv/kernel/bio.c)：释放一个缓冲区。调用者在完成对缓冲区的操作后必须调用此函数，以解除锁定并让其他进程可以使用它。

### 3.2. 数据结构

缓冲区缓存由一个全局的 `bcache` 结构管理，它包含一个 `buf` 数组和一个双向循环链表 `head`。

```c
// kernel/bio.c

struct {
  struct spinlock lock;
  struct buf buf[NBUF]; // 缓冲区数组
  struct buf head;      // LRU 链表头
} bcache;
```

每个 `struct buf` 代表一个缓存的磁盘块，并包含一个休眠锁 (`sleeplock`)，`bread` 在返回缓冲区时会获取该锁，`brelse` 则会释放它。

### 3.3. LRU 策略

当需要一个新的缓冲区来缓存磁盘块，但所有现有缓冲区都已被使用时，`bcache` 需要回收一个。xv6 采用 **最近最少使用 (Least Recently Used, LRU)** 策略。它通过一个双向链表来实现：`brelse` 会将被释放的缓冲区移动到链表的头部，因此链表尾部的缓冲区就是最久未被使用的。[`bget`](source/xv6-riscv/kernel/bio.c) 函数在需要回收时，会从链表尾部开始查找。

## 4. 日志层 (`log.c`)

文件系统操作（如创建一个文件）通常需要对磁盘进行多次写操作。如果在这些写操作之间系统发生崩溃，文件系统可能会处于不一致的状态。例如，一个数据块可能已经被分配，但指向它的 inode 尚未更新。

xv6 通过**预写式日志 (Write-ahead Logging)** 机制来解决这个问题。其核心思想是：在将任何数据修改写入其在文件系统中的最终位置之前，先将这些修改的描述记录在磁盘上的一个固定区域——**日志 (Log)** 中。

### 4.1. 事务与提交

1.  **开始事务**: 文件系统调用开始时，调用 [`begin_op()`](source/xv6-riscv/kernel/log.c)，声明一个新事务的开始。
2.  **记录写操作**: 当需要修改一个缓冲区时，调用 [`log_write(b)`](source/xv6-riscv/kernel/log.c) 而不是 `bwrite(b)`。`log_write` 不会立即将数据写入磁盘，而是将该缓冲区的块号记录在内存的日志头中，并将其“钉”在缓冲区缓存中，防止被驱逐。
3.  **结束事务与提交**: 文件系统调用结束时，调用 [`end_op()`](source/xv6-riscv/kernel/log.c)。如果这是当前唯一正在进行的操作，`end_op` 会触发**提交 (commit)** 过程：
    a.  **写入日志**: 将所有被 `log_write` 记录的块的当前内容，从缓冲区缓存写入到磁盘的日志区。
    b.  **写入日志头**: 将包含所有被修改块号的日志头写入磁盘。这是**提交点**。一旦日志头成功写入，即使系统崩溃，这个事务也被认为是完整的，可以在重启后恢复。
    c.  **安装事务**: 将日志区中的数据块复制到它们在文件系统中的最终位置。
    d.  **清除日志**: 将日志头清零并写回磁盘，表示事务已完成，日志区可以被下一个事务使用。

### 4.2. 崩溃恢复

系统启动时，[`fsinit()`](source/xv6-riscv/kernel/fs.c) 会调用 [`recover_from_log()`](source/xv6-riscv/kernel/log.c)。恢复函数会读取日志头：
-   如果日志头为空 (n=0)，说明上次关机前所有事务都已成功完成，无需操作。
-   如果日志头不为空，说明在上次的 `commit` 过程中发生了崩溃。恢复函数会重新执行**安装事务**的步骤，将日志中的数据写入文件系统，从而保证数据的一致性。

这个机制保证了文件系统操作的**原子性**：相对于系统崩溃，一个事务中的所有写操作要么全部完成，要么一个都不生效。

## 5. Inode 层 (`fs.c`)

Inode（索引节点）是 Unix 文件系统的核心概念。它是一个数据结构，包含了关于一个文件或目录的所有元数据，除了它的名字。

### 5.1. 磁盘上的 Inode (`struct dinode`)

在磁盘上，inode 以 `struct dinode` 的形式存储在一个连续的区域中。每个 inode 都有一个唯一的**inode 编号 (inum)**。`struct dinode` 包含以下关键字段：
-   `type`: 文件类型（文件 `T_FILE`、目录 `T_DIR`、设备 `T_DEVICE`）。
-   `nlink`: 硬链接计数，记录有多少个目录项指向这个 inode。
-   `size`: 文件的大小（以字节为单位）。
-   `addrs[]`: 一个包含 `NDIRECT + 1` 个条目的数组，用于记录存储文件内容的**数据块**的地址。
    -   前 `NDIRECT` 个是**直接块 (direct blocks)**，直接指向数据块。
    -   最后一个条目指向一个**间接块 (indirect block)**，该块本身包含另外 `NINDIRECT` 个数据块的地址。

### 5.2. 内存中的 Inode (`struct inode`)

内核在内存中维护一个活跃 inode 的缓存（`itable`），每个缓存项是一个 `struct inode`。它除了包含磁盘上 `dinode` 的一份拷贝外，还有一些内核需要的簿记信息，如：
-   `ref`: 引用计数，记录有多少个内存指针指向这个 inode。
-   `lock`: 一个休眠锁，用于同步对该 inode 的并发访问。

### 5.3. Inode 操作

-   [`ialloc(dev, type)`](source/xv6-riscv/kernel/fs.c)：在磁盘上分配一个新的 inode。
-   [`iget(dev, inum)`](source/xv6-riscv/kernel/fs.c)：获取一个指向内存中 inode 的指针，并增加其引用计数。这确保了只要有指针引用该 inode，它就不会从缓存中被移除。
-   [`iput(ip)`](source/xv6-riscv/kernel/fs.c)：释放一个指向 inode 的指针，并减少其引用计数。当 `ref` 和 `nlink` 都降为零时，该 inode 及其数据块会被彻底释放。
-   [`ilock(ip)`](source/xv6-riscv/kernel/fs.c)：锁定一个 inode，以进行读写操作。如果 inode 的数据尚未从磁盘加载到内存，`ilock` 会负责加载。
-   [`iunlock(ip)`](source/xv6-riscv/kernel/fs.c)：解锁一个 inode。
-   [`readi(ip, ...)` / `writei(ip, ...)` ](source/xv6-riscv/kernel/fs.c)：在锁定 inode 的前提下，从 inode 读取或向其写入数据。它们通过 [`bmap`](source/xv6-riscv/kernel/fs.c) 函数将文件的逻辑块偏移量转换为物理磁盘块号。

## 6. 路径名与文件描述符层 (`file.c`, `sysfile.c`)

这是文件系统的最高层，直接面向用户程序。

### 6.1. 路径名解析

路径名查找通过 [`namei(path)`](source/xv6-riscv/kernel/fs.c) 函数实现，它接收一个路径字符串（如 `"/a/b"`），并返回其对应的 inode。`namei` 通过循环调用 [`dirlookup`](source/xv6-riscv/kernel/fs.c) 来逐级解析路径。例如，解析 `"/a/b"` 的过程是：
1.  从根目录 (`/`) 的 inode 开始。
2.  在根目录中查找名为 `"a"` 的目录项，获取 `"a"` 的 inode。
3.  在 `"a"` 的 inode (必须是目录类型) 中查找名为 `"b"` 的目录项，获取 `"b"` 的 inode。
4.  返回 `"b"` 的 inode。

### 6.2. 文件描述符

在 Unix 中，一切皆文件。文件描述符层将 inode、管道和设备等都抽象为统一的**文件 (file)** 概念。
-   **全局文件表 (`ftable`)**: 内核中有一个全局的文件表，由 `struct file` 组成。每个 `struct file` 是对一个 inode 或管道的包装，并包含了读写权限和文件偏移量 (`off`) 等信息。
-   **进程文件描述符表**: 每个进程有自己的文件描述符表 (`p->ofile`)，它是一个指针数组，每个指针指向全局文件表中的一个 `struct file`。文件描述符就是这个数组的索引。

当一个进程调用 [`open()`](source/xv6-riscv/kernel/sysfile.c)，内核会：
1.  调用 `namei` 或 `create` 找到或创建文件的 inode。
2.  调用 [`filealloc()`](source/xv6-riscv/kernel/file.c) 从全局文件表中分配一个 `struct file`。
3.  用 inode 信息和打开模式填充该 `struct file`。
4.  调用 [`fdalloc()`](source/xv6-riscv/kernel/sysfile.c) 在进程的文件描述符表中找一个空位，存放指向 `struct file` 的指针。
5.  返回这个空位的索引，即文件描述符。

后续的 `read` 和 `write` 等系统调用就会通过文件描述符找到对应的 `struct file`，并执行相应的操作。

---

## 7. 实验要求：实现大文件支持

xv6 的默认文件系统对文件大小有限制。一个文件的块地址由 `NDIRECT` 个直接指针和一个指向间接块的指针组成，间接块包含 `NINDIRECT` 个指针。默认情况下，`BSIZE=1024`, `NDIRECT=12`, `NINDIRECT=BSIZE/sizeof(uint)=256`。因此，最大文件大小为 `(12 + 256) * 1024 = 268 KB`。

**你的任务是**：通过添加一个**双重间接块 (double-indirect block)** 来扩展文件系统，以支持更大的文件。

具体要求如下：
1.  修改 `fs.h` 中的 `struct dinode`，将 `addrs` 数组中的一个直接块指针改为双重间接块指针。例如，将 `addrs[NDIRECT-1]` 作为双重间接块指针。
2.  修改 [`bmap()`](source/xv6-riscv/kernel/fs.c) 函数，使其能够理解并处理双重间接块。当访问的块号超出直接块和单间接块的范围时，`bmap` 需要：
    a.  读取双重间接块。
    b.  从双重间接块中找到对应的单间接块的地址。
    c.  读取该单间接块。
    d.  从单间接块中找到最终的数据块地址。
    e.  如果路径上的任何块（双重间接块、单间接块、数据块）尚未分配，需要按需分配它们。
3.  相应地修改释放文件块的函数 [`itrunc()`](source/xv6-riscv/kernel/fs.c)，确保在删除文件时，所有相关的双重间接块、单间接块和数据块都能被正确释放。
4.  更新 `param.h` 中 `MAXFILE` 的定义，以反映新的最大文件大小。
5.  **（可选）** 编写一个用户程序来测试你的实现，例如创建一个超出旧限制的大文件并验证其内容。
