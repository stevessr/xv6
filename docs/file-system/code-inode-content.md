# 代码：Inode 内容

<img src="/assets/images/inode.png" alt="inode" width="500"/>

磁盘上的 inode 结构，`struct dinode`，包含一个大小和一个块号数组（见图 3）。inode 数据位于 `dinode` 的 `addrs` 数组中列出的块中。前 `NDIRECT` 个数据块列在数组的前 `NDIRECT` 个条目中；这些块被称为直接块。接下来的 `NINDIRECT` 个数据块不是列在 inode 中，而是列在一个称为间接块的数据块中。`addrs` 数组中的最后一个条目给出了间接块的地址。因此，文件的前 12 kB（`NDIRECT x BSIZE`）字节可以从 inode 中列出的块加载，而接下来的 256 kB（`NINDIRECT x BSIZE`）字节只有在查询间接块后才能加载。这是一个很好的磁盘表示，但对客户端来说很复杂。函数 [`bmap`](/source/xv6-riscv/kernel/fs.c) 管理这种表示，以便更高级别的例程，如 [`readi`](/source/xv6-riscv/kernel/defs.h) 和 [`writei`](/source/xv6-riscv/kernel/defs.h)，我们稍后会看到，不需要管理这种复杂性。[`bmap`](/source/xv6-riscv/kernel/fs.c) 返回 inode `ip` 的第 `bn` 个数据块的磁盘块号。如果 `ip` 还没有这样的块，[`bmap`](/source/xv6-riscv/kernel/fs.c) 会分配一个。

函数 [`bmap`](/source/xv6-riscv/kernel/fs.c) 首先处理简单情况：前 `NDIRECT` 个块列在 inode 本身中。接下来的 `NINDIRECT` 个块列在 `ip->addrs[NDIRECT]` 的间接块中。[`bmap`](/source/xv6-riscv/kernel/fs.c) 读取间接块然后从块内的正确位置读取一个块号。如果块号超过 `NDIRECT+NINDIRECT`，[`bmap`](/source/xv6-riscv/kernel/fs.c) 会 panic；[`writei`](/source/xv6-riscv/kernel/defs.h) 包含了防止这种情况发生的检查。

[`bmap`](/source/xv6-riscv/kernel/fs.c) 根据需要分配块。`ip->addrs[]` 或间接条目为零表示没有分配块。当 [`bmap`](/source/xv6-riscv/kernel/fs.c) 遇到零时，它会用新块的编号替换它们，这些块是按需分配的。

[`itrunc`](/source/xv6-riscv/kernel/defs.h) 释放文件的块，将 inode 的大小重置为零。[`itrunc`](/source/xv6-riscv/kernel/defs.h) 首先释放直接块，然后是间接块中列出的块，最后是间接块本身。

[`bmap`](/source/xv6-riscv/kernel/fs.c) 使得 [`readi`](/source/xv6-riscv/kernel/defs.h) 和 [`writei`](/source/xv6-riscv/kernel/defs.h) 很容易访问 inode 的数据。[`readi`](/source/xv6-riscv/kernel/defs.h) 首先确保偏移量和计数不会超出文件末尾。从文件末尾之后开始的读取会返回错误，而从文件末尾开始或跨越文件末尾的读取会返回比请求的少的字节。主循环处理文件的每个块，将数据从缓冲区复制到 `dst`。

[`writei`](/source/xv6-riscv/kernel/defs.h) 与 [`readi`](/source/xv6-riscv/kernel/defs.h) 相同，有三个例外：从文件末尾开始或跨越文件末尾的写入会增长文件，直到最大文件大小；循环将数据复制到缓冲区而不是从中复制出来；并且如果写入扩展了文件，[`writei`](/source/xv6-riscv/kernel/defs.h) 必须更新其大小。

函数 [`stati`](/source/xv6-riscv/kernel/defs.h) 将 inode 元数据复制到 [`stat`](/source/xv6-riscv/user/user.h) 结构中，该结构通过 [`stat`](/source/xv6-riscv/user/user.h) 系统调用暴露给用户程序。