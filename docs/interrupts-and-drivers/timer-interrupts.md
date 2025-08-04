# 定时器中断

Xv6 使用定时器中断来维护其当前时间的概念，并在计算密集型进程之间进行切换。定时器中断来自连接到每个 RISC-V CPU 的时钟硬件。Xv6 对每个 CPU 的时钟硬件进行编程，以使其定期中断 CPU。

[`start.c`](/source/kernel/start.c) 中的代码设置了一些控制位，允许在 supervisor 模式下访问定时器控制寄存器，然后请求第一个定时器中断。`time` 控制寄存器包含一个硬件以稳定速率递增的计数；这作为当前时间的概念。`stimecmp` 寄存器包含 CPU 将引发定时器中断的时间；将 `stimecmp` 设置为 `time` 的当前值加上 *x* 将在未来 *x* 个时间单位后安排一个中断。对于 `qemu` 的 RISC-V 仿真，1000000 个时间单位大约是十分之一秒。

定时器中断像其他设备中断一样，通过 [`usertrap`](/source/xv6-riscv/kernel/trap.c) 或 [`kerneltrap`](/source/xv6-riscv/kernel/trap.c) 以及 [`devintr`](/source/xv6-riscv/kernel/trap.c) 到达。定时器中断到达时，`scause` 的低位设置为 5；`trap.c` 中的 [`devintr`](/source/xv6-riscv/kernel/trap.c) 检测到这种情况并调用 [`clockintr`](/source/xv6-riscv/kernel/trap.c)。后一个函数递增 `ticks`，允许内核跟踪时间的流逝。递增只在一个 CPU 上发生，以避免在有多个 CPU 时时间过得更快。[`clockintr`](/source/xv6-riscv/kernel/trap.c) 唤醒任何在 [`sleep`](/source/xv6-riscv/user/user.h) 系统调用中等待的进程，并通过写入 `stimecmp` 来安排下一个定时器中断。

[`devintr`](/source/xv6-riscv/kernel/trap.c) 对定时器中断返回 2，以向 [`kerneltrap`](/source/xv6-riscv/kernel/trap.c) 或 [`usertrap`](/source/xv6-riscv/kernel/trap.c) 指示它们应该调用 [`yield`](/source/xv6-riscv/kernel/defs.h)，以便 CPU 可以在可运行的进程之间进行多路复用。

内核代码可能被定时器中断中断，该中断通过 [`yield`](/source/xv6-riscv/kernel/defs.h) 强制进行上下文切换，这是 [`usertrap`](/source/xv6-riscv/kernel/trap.c) 中的早期代码在启用中断之前小心保存诸如 `sepc` 之类的状态的部分原因。这些上下文切换也意味着内核代码的编写必须意识到它可能会在没有警告的情况下从一个 CPU 移动到另一个 CPU。