# 驱动程序中的并发

您可能已经注意到在 [`consoleread`](/source/xv6-riscv/kernel/console.c) 和 [`consoleintr`](/source/xv6-riscv/kernel/defs.h) 中有对 [`acquire`](/source/xv6-riscv/kernel/defs.h) 的调用。这些调用获取一个锁，以保护控制台驱动程序的数据结构免受并发访问。这里有三个并发危险：两个不同 CPU 上的进程可能同时调用 [`consoleread`](/source/xv6-riscv/kernel/console.c)；硬件可能会请求一个 CPU 在该 CPU 已经在 [`consoleread`](/source/xv6-riscv/kernel/console.c) 内部执行时传递一个控制台（实际上是 UART）中断；以及硬件可能会在一个不同的 CPU 上传递一个控制台中断，而 [`consoleread`](/source/xv6-riscv/kernel/console.c) 正在执行。第 5 章解释了如何使用锁来确保这些危险不会导致不正确的结果。

并发在驱动程序中需要小心的另一种方式是，一个进程可能正在等待来自设备的输入，但表示输入到达的中断可能在另一个进程（或根本没有进程）正在运行时到达。因此，中断处理程序不允许考虑它们已中断的进程或代码。例如，中断处理程序不能安全地使用当前进程的页表调用 [`copyout`](/source/xv6-riscv/user/usertests.c)。中断处理程序通常做相对较少的工作（例如，只是将输入数据复制到缓冲区），并唤醒上半部分代码来完成其余的工作。