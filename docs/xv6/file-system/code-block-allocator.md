# 代码：块分配器

文件和目录内容存储在磁盘块中，这些块必须从空闲池中分配。Xv6 的块分配器在磁盘上维护一个空闲位图，每个块一位。零位表示相应块是空闲的；一位表示它正在使用中。程序 `mkfs` 设置与引导扇区、超级块、日志块、inode 块和位图块相对应的位。

块分配器提供两个函数：[`balloc`](/source/xv6-riscv/kernel/fs.c.md) 分配一个新的磁盘块，而 [`bfree`](/source/xv6-riscv/kernel/fs.c.md) 释放一个块。[`balloc`](/source/xv6-riscv/kernel/fs.c.md) 中的循环在考虑每个块，从块 0 到 `sb.size`，即文件系统中的块数。它寻找一个位图位为零的块，表示它是空闲的。如果 [`balloc`](/source/xv6-riscv/kernel/fs.c.md) 找到这样的块，它会更新位图并返回该块。为提高效率，循环分为两部分。外层循环读取每个位图块。内层循环检查单个位图块中的所有 Bits-Per-Block（`BPB`）位。如果两个进程试图同时分配一个块，可能会发生竞争，这种情况由缓冲区缓存只允许一个进程一次使用任何一个位图块的事实来防止。

[`bfree`](/source/xv6-riscv/kernel/fs.c.md) 找到正确的位图块并清除正确的位。同样，由 [`bread`](/source/xv6-riscv/kernel/bio.c.md) 和 [`brelse`](/source/xv6-riscv/kernel/defs.h.md) 隐含的独占使用避免了显式锁定的需要。

与本章其余部分描述的大部分代码一样，[`balloc`](/source/xv6-riscv/kernel/fs.c.md) 和 [`bfree`](/source/xv6-riscv/kernel/fs.c.md) 必须在事务内部调用。