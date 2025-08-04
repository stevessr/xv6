## 代码：sbrk

`sbrk` 是一个进程用来收缩或增长其内存的系统调用。该系统调用由函数 [`growproc`](/source/xv6-riscv/kernel/defs.h) 实现。[`growproc`](/source/xv6-riscv/kernel/defs.h) 根据 `n` 是正数还是负数调用 [`uvmalloc`](/source/xv6-riscv/kernel/defs.h) 或 [`uvmdealloc`](/source/xv6-riscv/kernel/defs.h)。[`uvmalloc`](/source/xv6-riscv/kernel/defs.h) 使用 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c) 分配物理内存，将分配的内存清零，并使用 [`mappages`](/source/xv6-riscv/kernel/defs.h) 向用户页表添加 PTE。[`uvmdealloc`](/source/xv6-riscv/kernel/defs.h) 调用 [`uvmunmap`](/source/xv6-riscv/kernel/defs.h)，它使用 [`walk`](/source/xv6-riscv/kernel/vm.c) 查找 PTE 并使用 [`kfree`](/source/xv6-riscv/kernel/defs.h) 释放它们引用的物理内存。

Xv6 不仅使用进程的页表来告诉硬件如何映射用户虚拟地址，而且还将其作为分配给该进程的物理内存页面的唯一记录。这就是为什么释放用户内存（在 [`uvmunmap`](/source/xv6-riscv/kernel/defs.h) 中）需要检查用户页表的原因。