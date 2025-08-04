# 练习

1.  函数 [`copyin`](/source/xv6-riscv/user/usertests.c) 和 [`copyinstr`](/source/xv6-riscv/kernel/defs.h) 在软件中遍历用户页表。设置内核页表，以便内核映射了用户程序，并且 [`copyin`](/source/xv6-riscv/user/usertests.c) 和 [`copyinstr`](/source/xv6-riscv/kernel/defs.h) 可以使用 [`memcpy`](/source/xv6-riscv/user/ulib.c) 将系统调用参数复制到内核空间，依赖硬件来完成页表遍历。
2.  实现惰性内存分配。
3.  实现 COW fork。
4.  有没有办法消除每个用户地址空间中的特殊 `TRAPFRAME` 页面映射？例如，是否可以修改 `uservec` 以简单地将 32 个用户寄存器推送到内核堆栈，或将它们存储在 `proc` 结构中？
5.  xv6 是否可以修改以消除特殊的 `TRAMPOLINE` 页面映射？
6.  实现 `mmap`。