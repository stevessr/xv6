## 练习

1.  解析 RISC-V 的设备树以找出计算机拥有的物理内存量。
2.  编写一个用户程序，通过调用 `sbrk(1)` 将其地址空间增加一个字节。运行该程序，并在调用 `sbrk` 之前和之后调查程序的页表。内核分配了多少空间？新内存的 PTE 包含什么？
3.  修改 xv6 以便为内核使用超级页。
4.  Unix 的 [`exec`](/source/xv6-riscv/user/user.h) 实现传统上包括对 shell 脚本的特殊处理。如果待执行文件的开头是文本 `#!`，那么第一行就被视为运行以解释该文件的程序。例如，如果调用 [`exec`](/source/xv6-riscv/user/user.h) 来运行 `myprog` `arg1`，并且 `myprog` 的第一行是 `#!/interp`，那么 [`exec`](/source/xv6-riscv/user/user.h) 就会用命令行 `/interp` `myprog` `arg1` 来运行 `/interp`。在 xv6 中实现对此约定的支持。
5.  为内核实现地址空间布局随机化。