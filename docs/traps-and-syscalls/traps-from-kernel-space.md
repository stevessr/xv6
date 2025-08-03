# 来自内核空间的陷阱

Xv6 处理来自内核代码的陷阱的方式与处理来自用户代码的陷阱不同。当进入内核时，`usertrap` 将 `stvec` 指向位于 `kernelvec` ([`kernelvec.S`](../../../xv6-riscv/kernel/kernelvec.S)) 的汇编代码。由于 `kernelvec` 仅在 xv6 已在内核中时执行，因此 `kernelvec` 可以依赖于 `satp` 已设置为内核页表，并且堆栈指针指向有效的内核堆栈。`kernelvec` 将所有 32 个寄存器压入堆栈，稍后将从中恢复它们，以便被中断的内核代码可以不受干扰地继续执行。

`kernelvec` 将寄存器保存在被中断的内核线程的堆栈上，这是有道理的，因为寄存器值属于该线程。如果陷阱导致切换到另一个线程，这一点尤其重要——在这种情况下，陷阱实际上将从新线程的堆栈返回，而被中断线程的已保存寄存器安全地留在其堆栈上。

`kernelvec` 在保存寄存器后跳转到 `kerneltrap` ([`trap.c`](../../../xv6-riscv/kernel/trap.c))。`kerneltrap` 为两种类型的陷阱做好了准备：设备中断和异常。它调用 `devintr` ([`trap.c`](../../../xv6-riscv/kernel/trap.c)) 来检查和处理前者。如果陷阱不是设备中断，则它必须是异常，如果在 xv6 内核中发生，这始终是致命错误；内核调用 `panic` 并停止执行。

如果 `kerneltrap` 是由于定时器中断而被调用的，并且一个进程的内核线程正在运行（而不是调度程序线程），`kerneltrap` 会调用 `yield` 以让其他线程有机会运行。在某个时候，其中一个线程会让步，让我们的线程和它的 `kerneltrap` 再次恢复。第 6 章解释了 `yield` 中发生的事情。

当 `kerneltrap` 的工作完成时，它需要返回到被陷阱中断的任何代码。因为 `yield` 可能已经扰乱了 `sepc` 和 `sstatus` 中的先前模式，所以 `kerneltrap` 在启动时保存了它们。它现在恢复这些控制寄存器并返回到 `kernelvec` ([`kernelvec.S`](../../../xv6-riscv/kernel/kernelvec.S))。`kernelvec` 从堆栈中弹出已保存的寄存器并执行 `sret`，它将 `sepc` 复制到 `pc` 并恢复被中断的内核代码。

值得思考的是，如果 `kerneltrap` 由于定时器中断而调用了 `yield`，陷阱返回是如何发生的。

Xv6 在一个 CPU 从用户空间进入内核时，将该 CPU 的 `stvec` 设置为 `kernelvec`；你可以在 `usertrap` ([`trap.c`](../../../xv6-riscv/kernel/trap.c)) 中看到这一点。有一段时间窗口，内核已经开始执行但 `stvec` 仍设置为 `uservec`，至关重要的是在该窗口期间不能发生设备中断。幸运的是，RISC-V 在开始处理陷阱时总是禁用中断，而 `usertrap` 在设置 `stvec` 之后才再次启用它们。