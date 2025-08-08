# 锁和中断处理程序

一些 xv6 自旋锁保护由线程和中断处理程序共同使用的数据。例如，[`clockintr`](/source/xv6-riscv/kernel/trap.c.md) 时钟中断处理程序可能在内核线程在 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md) 中读取 `ticks` 的大约同一时间递增 `ticks`。锁 `tickslock` 序列化了这两个访问。

自旋锁和中断的交互带来了一个潜在的危险。假设 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md) 持有 `tickslock`，并且它的 CPU 被一个时钟中断打断。[`clockintr`](/source/xv6-riscv/kernel/trap.c.md) 会尝试获取 `tickslock`，看到它被持有，然后等待它被释放。在这种情况下，`tickslock` 将永远不会被释放：只有 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md) 可以释放它，但 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md) 在 [`clockintr`](/source/xv6-riscv/kernel/trap.c.md) 返回之前不会继续运行。所以 CPU 将会死锁，任何需要这两个锁的代码也会冻结。

为了避免这种情况，如果一个自旋锁被中断处理程序使用，一个 CPU 绝不能在启用中断的情况下持有该锁。Xv6 更为保守：当一个 CPU 获取任何锁时，xv6 总是禁用该 CPU 上的中断。中断仍然可能在其他 CPU 上发生，所以一个中断的 [`acquire`](/source/xv6-riscv/kernel/defs.h.md) 可以等待一个线程释放一个自旋锁；只是不能在同一个 CPU 上。

当一个 CPU 不持有自旋锁时，Xv6 会重新启用中断；它必须做一些簿记工作来处理嵌套的临界区。 [`acquire`](/source/xv6-riscv/kernel/defs.h.md) 调用 [`push_off`](/source/xv6-riscv/kernel/defs.h.md)， [`release`](/source/xv6-riscv/kernel/defs.h.md) 调用 [`pop_off`](/source/xv6-riscv/kernel/defs.h.md) 来跟踪当前 CPU 上锁的嵌套级别。当该计数达到零时，[`pop_off`](/source/xv6-riscv/kernel/defs.h.md) 会恢复最外层临界区开始时存在的中断启用状态。[`intr_off`](/source/xv6-riscv/kernel/riscv.h.md) 和 [`intr_on`](/source/xv6-riscv/kernel/riscv.h.md) 函数执行 RISC-V 指令来分别禁用和启用中断。

[`acquire`](/source/xv6-riscv/kernel/defs.h.md) 在设置 `lk->locked` 之前严格调用 [`push_off`](/source/xv6-riscv/kernel/defs.h.md) 是很重要的。如果这两者颠倒了，就会有一个很短的时间窗口，当锁被持有时中断是启用的，一个不幸的定时中断将会使系统死锁。类似地，[`release`](/source/xv6-riscv/kernel/defs.h.md) 仅在释放锁之后才调用 [`pop_off`](/source/xv6-riscv/kernel/defs.h.md) 也是很重要的。