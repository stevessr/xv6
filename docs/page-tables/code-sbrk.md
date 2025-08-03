## 代码：sbrk

`sbrk` 是一个进程用来收缩或增长其内存的系统调用。该系统调用由函数 `growproc` 实现。`growproc` 根据 `n` 是正数还是负数调用 `uvmalloc` 或 `uvmdealloc`。`uvmalloc` 使用 `kalloc` 分配物理内存，将分配的内存清零，并使用 `mappages` 向用户页表添加 PTE。`uvmdealloc` 调用 `uvmunmap`，它使用 `walk` 查找 PTE 并使用 `kfree` 释放它们引用的物理内存。

Xv6 不仅使用进程的页表来告诉硬件如何映射用户虚拟地址，而且还将其作为分配给该进程的物理内存页面的唯一记录。这就是为什么释放用户内存（在 `uvmunmap` 中）需要检查用户页表的原因。