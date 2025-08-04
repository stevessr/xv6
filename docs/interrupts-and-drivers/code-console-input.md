# 代码：控制台输入

控制台驱动程序 [`console.c`](/source/kernel/console.c) 是驱动程序结构的简单示例。控制台驱动程序通过连接到 RISC-V 的 UART 串行端口硬件接受由人键入的字符。控制台驱动程序一次累积一行输入，处理诸如退格和 control-u 之类的特殊输入字符。用户进程（例如 shell）使用 [`read`](/source/xv6-riscv/user/user.h) 系统调用从控制台获取输入行。当您在 QEMU 中向 xv6 输入时，您的击键通过 QEMU 的模拟 UART 硬件传递给 xv6。

驱动程序与之通信的 UART 硬件是 QEMU 模拟的 16550 芯片。在真实的计算机上，16550 将管理连接到终端或其他计算机的 RS232 串行链路。在运行 QEMU 时，它连接到您的键盘和显示器。

UART 硬件以一组**内存映射**(memory-mapped)控制寄存器的形式向软件显示。也就是说，有一些物理地址，RISC-V 硬件将其连接到 UART 设备，因此加载和存储与设备硬件而不是 RAM 交互。UART 的内存映射地址从 0x10000000 开始，即 [`UART0`](/source/kernel/memlayout.h)。有少数几个 UART 控制寄存器，每个寄存器的宽度为一个字节。它们相对于 `UART0` 的偏移量在 [`uart.c`](/source/kernel/uart.c) 中定义。例如，`LSR` 寄存器包含指示是否有输入字符等待软件读取的位。这些字符（如果有）可以从 `RHR` 寄存器中读取。每读取一个字符，UART 硬件就会将其从内部的等待字符 FIFO 中删除，并在 FIFO 为空时清除 `LSR` 中的“就绪”位。UART 发送硬件在很大程度上独立于接收硬件；如果软件向 `THR` 写入一个字节，UART 就会发送该字节。

Xv6 的 [`main`](/source/xv6-riscv/user/zombie.c) 调用 [[`consoleinit`](/source/xv6-riscv/kernel/defs.h)](/source/kernel/console.c) 来初始化 UART 硬件。此代码配置 UART，以便在 UART 每接收一个输入字节时产生一个接收中断，并在 UART 每次完成发送一个输出字节时产生一个**发送完成**(transmit complete)中断 ([[`uartinit`](/source/xv6-riscv/kernel/defs.h)](/source/kernel/uart.c))。

xv6 shell 通过由 [`init.c`](/source/user/init.c) 打开的文件描述符从控制台读取。对 [`read`](/source/xv6-riscv/user/user.h) 系统调用的调用会通过内核到达 [[`consoleread`](/source/xv6-riscv/kernel/console.c)](/source/kernel/console.c)。[`consoleread`](/source/xv6-riscv/kernel/console.c) 等待输入到达（通过中断）并被缓冲在 `cons.buf` 中，将输入复制到用户空间，并且（在整行到达后）返回到用户进程。如果用户还没有输入完整的一行，任何读取进程都将在 [`sleep`](/source/xv6-riscv/user/user.h) 调用中等待（第 4 章解释了 [`sleep`](/source/xv6-riscv/user/user.h) 的细节）。

当用户键入一个字符时，UART 硬件请求 RISC-V 引发一个中断，从而激活 xv6 的陷阱处理程序。陷阱处理程序调用 [[`devintr`](/source/xv6-riscv/kernel/trap.c)](/source/kernel/trap.c)，它查看 RISC-V 的 `scause` 寄存器以发现中断来自外部设备。然后它请求一个名为 PLIC 的硬件单元告诉它哪个设备中断了。如果是 UART，[`devintr`](/source/xv6-riscv/kernel/trap.c) 会调用 [`uartintr`](/source/xv6-riscv/kernel/defs.h)。

[[`uartintr`](/source/xv6-riscv/kernel/defs.h)](/source/kernel/uart.c) 从 UART 硬件读取任何等待的输入字符，并将它们交给 [[`consoleintr`](/source/xv6-riscv/kernel/defs.h)](/source/kernel/console.c)；它不等待字符，因为未来的输入将引发新的中断。[`consoleintr`](/source/xv6-riscv/kernel/defs.h) 的工作是在 `cons.buf` 中累积输入字符，直到一整行到达。[`consoleintr`](/source/xv6-riscv/kernel/defs.h) 特殊处理退格键和一些其他字符。当换行符到达时，[`consoleintr`](/source/xv6-riscv/kernel/defs.h) 会唤醒一个等待的 [`consoleread`](/source/xv6-riscv/kernel/console.c)（如果有的话）。

一旦被唤醒，[`consoleread`](/source/xv6-riscv/kernel/console.c) 将在 `cons.buf` 中观察到完整的一行，将其复制到用户空间，并通过系统调用机制返回到用户空间。