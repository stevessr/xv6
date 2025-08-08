# 练习

1. 在 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md) 中注释掉对 [`acquire`](/source/xv6-riscv/kernel/defs.h.md) 和 [`release`](/source/xv6-riscv/kernel/defs.h.md) 的调用。这似乎应该会给调用 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md) 的内核代码带来问题；你期望看到什么症状？当你运行 xv6 时，你看到了这些症状吗？运行 `usertests` 时呢？如果你没有看到问题，为什么？看看你是否可以通过在 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md) 的临界区中插入虚拟循环来引发问题。

2. 假设你转而在 [`kfree`](/source/xv6-riscv/kernel/defs.h.md) 中注释掉了锁（在恢复 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md) 中的锁之后）。现在可能会出什么问题？[`kfree`](/source/xv6-riscv/kernel/defs.h.md) 中缺少锁是否比 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md) 中危害小？

3. 如果两个 CPU 同时调用 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md)，其中一个将不得不等待另一个，这对性能不利。修改 `kalloc.c` 以具有更多的并行性，以便来自不同 CPU 的对 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md) 的同时调用可以继续进行而无需等待对方。

4. 使用 POSIX 线程编写一个并行程序，大多数操作系统都支持它。例如，实现一个并行哈希表并测量 puts/gets 的数量是否随着 CPU 数量的增加而扩展。

5. 在 xv6 中实现 Pthreads 的一个子集。也就是说，实现一个用户级线程库，以便一个用户进程可以有多个线程，并安排这些线程可以在不同的 CPU 上并行运行。提出一个设计，正确处理一个线程进行阻塞系统调用和改变其共享地址空间的情况。