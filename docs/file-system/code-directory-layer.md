# 代码：目录层

目录在内部的实现方式与文件非常相似。它的 inode 类型为 `T_DIR`，其数据是一系列目录条目。每个条目都是一个 `struct dirent`，其中包含一个名称和一个 inode 号。名称最多为 `DIRSIZ`（14）个字符；如果更短，则以 NULL (0) 字节结尾。inode 号为零的目录条目是空闲的。

函数 [`dirlookup`](/source/xv6-riscv/kernel/fs.c.md) 在目录中搜索具有给定名称的条目。如果找到一个，它返回相应 inode 的指针，未锁定，并设置 `*poff` 为条目在目录中的字节偏移量，以备调用者希望编辑它。如果 [`dirlookup`](/source/xv6-riscv/kernel/fs.c.md) 找到具有正确名称的条目，它会更新 `*poff` 并返回一个通过 [`iget`](/source/xv6-riscv/kernel/fs.c.md) 获取的未锁定 inode。[`dirlookup`](/source/xv6-riscv/kernel/fs.c.md) 是 [`iget`](/source/xv6-riscv/kernel/fs.c.md) 返回未锁定 inode 的原因。调用者已锁定 `dp`，因此如果查找的是 `.`，即当前目录的别名，在返回之前尝试锁定 inode 会试图重新锁定 `dp` 并导致死锁。（存在涉及多个进程和 `..`，即父目录的别名的更复杂的死锁场景；`.` 不是唯一的问题。）调用者可以解锁 `dp` 然后锁定 `ip`，确保一次只持有一个锁。

函数 [`dirlink`](/source/xv6-riscv/kernel/defs.h.md) 将一个具有给定名称和 inode 号的新目录条目写入目录 `dp`。如果名称已存在，[`dirlink`](/source/xv6-riscv/kernel/defs.h.md) 返回一个错误。主循环读取目录条目，寻找一个未分配的条目。当找到一个时，它会提前停止循环，并将 `off` 设置为可用条目的偏移量。否则，循环结束时 `off` 被设置为 `dp->size`。无论哪种方式，[`dirlink`](/source/xv6-riscv/kernel/defs.h.md) 然后通过在偏移量 `off` 处写入来向目录添加一个新条目。