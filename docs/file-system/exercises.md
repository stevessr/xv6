# 练习

1.  为什么在 [`balloc`](/source/xv6-riscv/kernel/fs.c) 中 panic？xv6 能恢复吗？
2.  为什么在 [`ialloc`](/source/xv6-riscv/kernel/fs.c) 中 panic？xv6 能恢复吗？
3.  为什么 [`filealloc`](/source/xv6-riscv/kernel/file.c) 在文件用完时不会 panic？为什么这种情况更常见，因此值得处理？
4.  假设与 `ip` 对应的文件在 [`sys_link`](/source/xv6-riscv/kernel/sysfile.c) 调用 `iunlock(ip)` 和 [`dirlink`](/source/xv6-riscv/kernel/defs.h) 之间被另一个进程取消链接。链接会正确创建吗？为什么或为什么不？
5.  [`create`](/source/xv6-riscv/kernel/sysfile.c) 进行了四个函数调用（一个到 [`ialloc`](/source/xv6-riscv/kernel/fs.c) 和三个到 [`dirlink`](/source/xv6-riscv/kernel/defs.h)），它要求这些调用必须成功。如果任何一个不成功，[`create`](/source/xv6-riscv/kernel/sysfile.c) 会调用 [`panic`](/source/xv6-riscv/user/sh.c)。为什么这是可以接受的？为什么这四个调用都不会失败？
6.  [`sys_chdir`](/source/xv6-riscv/kernel/sysfile.c) 在 `iput(cp->cwd)` 之前调用 `iunlock(ip)`，而 `iput(cp->cwd)` 可能会尝试锁定 `cp->cwd`，然而推迟 `iunlock(ip)` 到 [`iput`](/source/xv6-riscv/kernel/defs.h) 之后不会导致死锁。为什么不呢？
7.  实现 `lseek` 系统调用。支持 `lseek` 还需要你修改 [`filewrite`](/source/xv6-riscv/kernel/defs.h) 以在 `lseek` 将 `off` 设置到 `f->ip->size` 之外时用零填充文件中的空洞。
8.  向 [`open`](/source/xv6-riscv/user/user.h) 添加 `O_TRUNC` 和 `O_APPEND`，以便 `>` 和 `>>` 运算符在 shell 中工作。
9.  修改文件系统以支持符号链接。
10. 修改文件系统以支持命名管道。
11. 修改文件和虚拟机系统以支持内存映射文件。