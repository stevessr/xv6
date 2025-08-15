# 代码：控制台输出

对连接到控制台的文件描述符的 [`write`](/source/xv6-riscv/user/user.h.md) 系统调用最终会到达 [[`uartputc`](/source/xv6-riscv/kernel/defs.h.md)]。设备驱动程序维护一个输出缓冲区（`uart_tx_buf`），以便写入进程不必等待 UART 完成发送；相反，[`uartputc`](/source/xv6-riscv/kernel/defs.h.md) 将每个字符附加到缓冲区，调用 [`uartstart`](/source/xv6-riscv/kernel/uart.c.md) 来启动设备传输（如果尚未启动），然后返回。[`uartputc`](/source/xv6-riscv/kernel/defs.h.md) 等待的唯一情况是缓冲区已满。

每当 UART 完成发送一个字节时，它就会产生一个中断。[`uartintr`](/source/xv6-riscv/kernel/defs.h.md) 调用 [`uartstart`](/source/xv6-riscv/kernel/uart.c.md)，后者检查设备是否真的完成了发送，并将下一个缓冲的输出字符交给设备。因此，如果一个进程向控制台写入多个字节，通常第一个字节将由 [`uartputc`](/source/xv6-riscv/kernel/defs.h.md) 对 [`uartstart`](/source/xv6-riscv/kernel/uart.c.md) 的调用发送，而剩余的缓冲字节将在发送完成中断到达时由来自 [`uartintr`](/source/xv6-riscv/kernel/defs.h.md) 的 [`uartstart`](/source/xv6-riscv/kernel/uart.c.md) 调用发送。

需要注意的一个通用模式是通过缓冲和中断将设备活动与进程活动解耦。控制台驱动程序即使在没有进程等待读取输入时也可以处理输入；后续的读取将看到该输入。类似地，进程可以发送输出而不必等待设备。这种解耦可以通过允许进程与设备 I/O 并发执行来提高性能，并且在设备缓慢（如 UART）或需要立即关注（如回显键入的字符）时尤其重要。这个想法有时被称为**I/O 并发性**(I/O concurrency)。