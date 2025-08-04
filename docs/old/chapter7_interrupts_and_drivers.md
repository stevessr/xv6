# 第 7 章: 中断和设备驱动程序

## 1. 教学目标

本章旨在深入探讨操作系统与硬件交互的核心机制——中断，以及管理硬件的软件模块——设备驱动程序。学完本章，你应该能够：

1.  **理解中断**：明白中断作为硬件与内核通信的关键机制，是实现 I/O 并发和系统响应性的基础。
2.  **掌握驱动模型**：理解设备驱动程序经典的“上半部分” (Top Half) 和“下半部分” (Bottom Half) 分层结构。
3.  **分析控制台驱动**：通过分析 xv6 的控制台驱动，理解内存映射 I/O (Memory-Mapped I/O)、中断处理、数据缓冲和并发控制的实际应用。
4.  **掌握定时器中断**：理解定时器中断在系统计时和进程调度中的核心作用。

## 2. 核心概念

### 2.1. 中断：硬件与内核的对话

设备（如键盘、磁盘、网卡）的运行速度通常远慢于 CPU。如果 CPU 为了等待设备完成一个任务而停止工作（称为**轮询**，Polling），将会浪费大量宝贵的计算资源。

**中断 (Interrupt)** 提供了一种高效的异步通信机制。当设备完成了某个操作（例如，键盘接收到一个字符，磁盘读完一个数据块）时，它会向 CPU 发送一个信号。CPU 接收到信号后，会暂停当前正在执行的任务，转而去执行一个预先设定的**中断处理程序 (Interrupt Handler)** 来响应该事件。处理完毕后，CPU 再返回到之前被暂停的任务继续执行。

这就像你在烧水，不必一直盯着水壶，可以去看书。水烧开时，水壶会发出鸣笛声（中断），你听到后就去处理（中断处理），处理完再回来继续看书。

### 2.2. 设备驱动程序：硬件的抽象接口

**设备驱动程序 (Device Driver)** 是内核中专门负责管理某个特定硬件的代码模块。它为上层应用提供统一、抽象的接口（如 [`read()`](#) 和 [`write()`](#) 系统调用），并负责将这些抽象请求转换为对硬件的具体操作。

驱动程序通常采用分层结构，以实现**I/O 并发 (I/O Concurrency)**：

*   **上半部分 (Top Half)**：在进程的上下文中执行，通常由系统调用触发。它负责发起 I/O 请求（例如，调用 [`consoleread()`](source/xv6-riscv/kernel/console.c.md)），如果数据尚未准备好，它会让当前进程进入**睡眠 (sleep)** 状态，让出 CPU。
*   **下半部分 (Bottom Half)**：在中断上下文中执行。当硬件完成任务并触发中断时，中断处理程序（即下半部分）被调用。它负责处理硬件返回的数据，并将数据放入缓冲区，然后**唤醒 (wakeup)** 正在等待数据的进程。

这种模型将耗时的硬件操作与进程执行解耦，极大地提升了系统效率。

### 2.3. 内存映射 I/O (Memory-Mapped I/O)

CPU 如何与设备硬件通信？一种主流的方法是**内存映射 I/O**。在这种模式下，硬件设备的控制寄存器被映射到物理内存地址空间中的特定地址。CPU 只需像读写内存一样，通过 `load` 和 `store` 指令读写这些特殊地址，就能直接配置设备、发送命令和读取状态。

在 xv6 中，所有硬件设备的物理地址都在 [`kernel/memlayout.h`](source/xv6-riscv/kernel/memlayout.h.md) 中定义。例如，UART (串口) 设备的基地址是 `0x10000000L`。


```
c
// From kernel/memlayout.h
#define UART0 0x10000000L

```


驱动程序通过读写 `UART0` 及其偏移地址上的寄存器来控制串口设备。

## 3. 案例分析：追踪一个字符的生命周期

让我们通过分析 xv6 的控制台驱动，来完整地追踪一个字符从键盘输入到被 shell 读取的全过程。这涉及到两个核心文件：

*   [`kernel/uart.c`](source/xv6-riscv/kernel/uart.c.md): 底层驱动，直接与 UART 硬件交互。
*   [`kernel/console.c`](source/xv6-riscv/kernel/console.c.md): 上层驱动，实现了行缓冲和用户编辑功能。

### 3.1. 硬件初始化

系统启动时，[`main()`](source/xv6-riscv/kernel/main.c.md) 调用 [`consoleinit()`](source/xv6-riscv/kernel/console.c.md)，它完成两项工作：
1.  初始化控制台锁。
2.  调用 [`uartinit()`](source/xv6-riscv/kernel/uart.c.md) 初始化 UART 硬件。

[`uartinit()`](source/xv6-riscv/kernel/uart.c.md) 会配置 UART 的波特率、数据位等参数，并最关键地，**开启接收中断**：


```
c
// From kernel/uart.c
void uartinit(void) {
  // 此处进行波特率、数据位等硬件配置
  // 然后使能接收和发送中断
  WriteReg(IER, IER_RX_ENABLE | IER_TX_ENABLE);
}

```


从此，每当有字符通过串口到达，UART 硬件都会向 CPU 触发一个中断。

### 3.2. 字符输入与中断处理（下半部分）

1.  **硬件中断**：用户在键盘上敲下一个字符。QEMU 模拟的 UART 硬件接收到该字符，并向 CPU 发送中断请求。

2.  **陷阱处理**：CPU 捕获到中断，根据 `stvec` 寄存器的设置，跳转到内核陷阱处理入口。如果是在用户态，则进入 [`usertrap()`](source/xv6-riscv/kernel/trap.c.md)；若在内核态，则进入 [`kerneltrap()`](source/xv6-riscv/kernel/trap.c.md)。

3.  **中断分发**：陷阱处理程序调用 [`devintr()`](source/xv6-riscv/kernel/trap.c.md) 来确定中断来源。[`devintr()`](source/xv6-riscv/kernel/trap.c.md) 通过查询 PLIC（平台级中断控制器）发现是 UART 设备的中断（`UART0_IRQ`），于是调用 UART 的中断处理程序 [`uartintr()`](source/xv6-riscv/kernel/uart.c.md)。

4.  **底层驱动处理 (uart.c)**：[`uartintr()`](source/xv6-riscv/kernel/uart.c.md) 作为下半部分的起点，它做两件事：
    *   **处理接收**：调用 [`uartgetc()`](source/xv6-riscv/kernel/uart.c.md) 从 UART 的接收保持寄存器 (RHR) 读取字符。
    *   **递交上层**：将读到的字符传递给上层控制台驱动的中断处理函数 [`consoleintr()`](source/xv6-riscv/kernel/console.c.md)。

    
```
c
    // From kernel/uart.c
    void uartintr(void) {
      while(1){
        int c = uartgetc();
        if(c == -1)
          break;
        consoleintr(c); // 将字符交给上层处理
      }
      // 此处还会启动下一次的发送
    }
    
```


5.  **上层驱动处理 (console.c)**：[`consoleintr()`](source/xv6-riscv/kernel/console.c.md) 实现了行缓冲逻辑。它将接收到的字符 `c` 存入一个环形缓冲区 `cons.buf`，并处理特殊字符。当用户输入换行符 `\n` 时，表示一行输入结束。

    
```
c
    // From kernel/console.c
    void consoleintr(int c) {
      // 处理退格、删除行等特殊控制字符
      if(c != 0 && /* 缓冲区未满 */){
        // 将字符存入缓冲区并回显到屏幕
        if(/* 遇到换行符或文件结束符 */){
          cons.w = cons.e;  // 提交整行数据
          wakeup(&cons.r); // 唤醒等待输入的进程
        }
      }
    }
    
```

    当一行完整输入后，它更新写指针 `cons.w`，使得这行数据对读取者可见，并调用 `wakeup(&cons.r)` 唤醒可能在等待输入的进程。

### 3.3. 进程读取（上半部分）

1.  **系统调用**：shell 进程调用 `read(fd, buf, n)` 系统调用来读取用户输入。由于 `fd` 指向控制台，该调用最终会进入内核并执行 [`consoleread()`](source/xv6-riscv/kernel/console.c.md)。

2.  **等待数据**：[`consoleread()`](source/xv6-riscv/kernel/console.c.md) 检查环形缓冲区。如果读指针 `cons.r` 和写指针 `cons.w` 相等，说明没有完整的行可供读取。此时，进程会调用 `sleep(&cons.r, &cons.lock)`，进入休眠状态并释放锁，等待被唤醒。

    
```
c
    // From kernel/console.c
    int consoleread(...) {
      acquire(&cons.lock);
      while(cons.r == cons.w){ // 若无数据则循环等待
        if(killed(myproc())){
          // 如果进程被杀死，则退出
          return -1;
        }
        sleep(&cons.r, &cons.lock); // 进入休眠，等待被唤醒
      }
      // 被唤醒后，从此处继续执行，开始读取数据
    }
    
```


3.  **唤醒与读取**：当 [`consoleintr()`](source/xv6-riscv/kernel/console.c.md) 调用 `wakeup(&cons.r)` 时，在 [`sleep`](../xv6-riscv/user/user.h) 中休眠的 shell 进程被唤醒。[`sleep`](../xv6-riscv/user/user.h) 返回后会重新获取锁。此时 `cons.r != cons.w`，循环条件不满足，进程开始从 `cons.buf` 中读取字符，直到遇到换行符或读满用户提供的缓冲区。

4.  **返回用户空间**：[`consoleread()`](source/xv6-riscv/kernel/console.c.md) 将读取到的行复制到用户提供的缓冲区，然后返回。[`read`](../xv6-riscv/user/user.h) 系统调用完成，shell 拿到了用户输入的一整行命令。

## 4. 定时器中断与调度

中断不仅来自外部设备，也来自 CPU 内部的**时钟硬件**。xv6 利用定时器中断实现两项关键功能：系统计时和抢占式调度。

### 4.1. 时钟硬件与初始化

RISC-V 架构为每个 CPU 核心配备了时钟硬件（在 xv6 的 QEMU 环境中由 CLINT 模拟）。系统启动时，在 M-mode 下运行的 [`start.c`](source/xv6-riscv/kernel/start.c.md) 会调用 [`timerinit()`](source/xv6-riscv/kernel/start.c.md)。

[`timerinit()`](source/xv6-riscv/kernel/start.c.md) 会配置硬件，并设置第一次时钟中断的触发时间。它向 `stimecmp` 寄存器写入一个未来的时间戳。当硬件的 `time` 寄存器的值达到 `stimecmp` 时，就会触发一个**时钟中断**。

### 4.2. 时钟中断处理

时钟中断的处理流程与设备中断类似，最终会调用到 [`clockintr()`](source/xv6-riscv/kernel/trap.c.md)。


```
c
// From kernel/trap.c
void clockintr()
{
  acquire(&tickslock);
  ticks++;
  wakeup(&ticks);
  release(&tickslock);
}

```

*   **更新滴答计数**：[`clockintr()`](source/xv6-riscv/kernel/trap.c.md) 会给一个全局变量 `ticks` 加一。这个变量是内核衡量时间流逝的标尺，例如 `sleep(n)` 系统调用就依赖它来计时。
*   **唤醒休眠进程**：它会唤醒所有因调用 [`sleep`](../xv6-riscv/user/user.h) 而休眠在 `ticks` 上的进程。
*   **重新设置定时器**：处理函数会再次向 `stimecmp` 写入新的时间戳，以安排下一次时钟中断。

### 4.3. 协作调度

时钟中断是实现**抢占式调度**的关键。当一个进程在用户空间执行时，如果发生时钟中断，[`usertrap`](../xv6-riscv/kernel/trap.c) 中的 [`devintr()`](source/xv6-riscv/kernel/trap.c.md) 会检测到它并返回 2。


```
c
// From kernel/trap.c
void usertrap(void) {
  int which_dev = 0;
  // 保存用户上下文，切换到内核陷阱向量
  
  if(r_scause() == 8){
    // 系统调用
  } else if((which_dev = devintr()) != 0){
    // 设备中断
  } else {
    // 其他异常
  }
  
  // 如果是时钟中断，则让出 CPU
  if(which_dev == 2)
    yield();
  
  usertrapret(); // 返回用户空间
}

```

看到返回值是 2，[`usertrap()`](source/xv6-riscv/kernel/trap.c.md) 就会调用 [`yield()`](source/xv6-riscv/kernel/proc.c.md)，该进程会主动放弃 CPU，让调度器有机会选择另一个进程来运行。这样，即便是计算密集型的死循环程序，也无法永久霸占 CPU，保证了系统的公平性和响应性。

## 5. 实验要求

**目标**: 修改 xv6 的控制台驱动，实现一个完全**轮询 (Polling)** 的驱动程序，而不是使用中断。

**要求**:
1.  修改 [`kernel/uart.c`](source/xv6-riscv/kernel/uart.c.md) 和/或 [`kernel/console.c`](source/xv6-riscv/kernel/console.c.md)，以移除对 UART 中断的依赖。
2.  在 [`uartinit`](../xv6-riscv/kernel/defs.h) 中，不要开启 UART 中断。
3.  [`consoleread`](../xv6-riscv/kernel/console.c) 不能再 [`sleep`](../xv6-riscv/user/user.h) 等待输入。它必须主动、循环地从 UART 硬件查询（轮询）是否有新的字符到来。
4.  同样，[`consolewrite`](../xv6-riscv/kernel/console.c)（或其调用的底层函数）也应通过轮询方式，等待 UART 发送寄存器空闲后再写入下一个字符。
5.  修改后，系统应能正常工作，shell 可以正确地接收命令并输出结果。

**提示**:
*   你需要关注 [`uartgetc()`](source/xv6-riscv/kernel/uart.c.md) 和 [`uartputc_sync()`](source/xv6-riscv/kernel/uart.c.md) 的实现逻辑。
*   思考在何处进行轮询是最高效的。是在 [`consoleread`](../xv6-riscv/kernel/console.c) 里，还是在某个周期性执行的地方？
*   这个实验将帮助你深刻理解轮询和中断驱动两种 I/O 模式的根本区别和各自的优缺点。