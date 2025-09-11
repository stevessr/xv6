---
title: net
---

# 实验：网络

在这个实验中，你将为网络接口卡（NIC）编写一个 xv6 设备驱动程序，然后编写以太网/IP/UDP 协议处理栈的接收部分。

获取实验的 xv6 源代码并检出 `net` 分支：

```
$ git fetch
$ git checkout net
$ make clean
```

## 背景

> 在编写代码之前，你可能会发现查看 [xv6 书籍](/mit6.1810/xv6/book-riscv-rev4.pdf) 中的"第 5 章：中断和设备驱动程序"很有帮助。

你将使用一个名为 E1000 的网络设备来处理网络通信。对于 xv6（以及你编写的驱动程序），E1000 看起来像连接到真实以太网局域网（LAN）的真实硬件。实际上，你的驱动程序将与之通信的 E1000 是 qemu 提供的模拟，连接到 qemu 模拟的 LAN。在这个模拟的 LAN 上，xv6（"客户机"）的 IP 地址是 10.0.2.15。
Qemu 安排运行 qemu 的计算机（"主机"）
在 LAN 上出现，IP 地址为 10.0.2.2。
当 xv6 使用 E1000 发送
数据包到 10.0.2.2 时，qemu 将数据包传送到主机上的适当应用程序。

你将使用 QEMU 的"用户模式网络栈"。
QEMU 文档中有更多关于用户模式
栈的信息
[在这里](https://wiki.qemu.org/Documentation/Networking#User_Networking_.28SLIRP.29)。
我们已经更新了 Makefile 以启用 QEMU 的用户模式网络栈和
E1000 网卡模拟。

Makefile 配置 QEMU 将所有传入和传出
数据包记录到你的实验目录中的 `packets.pcap` 文件。查看这些记录可能有助于确认 xv6 正在传输和接收你期望的数据包。要显示记录的数据包：

```
tcpdump -XXnr packets.pcap
```

我们为这个实验向 xv6 仓库添加了一些文件。
文件 `kernel/e1000.c` 包含 E1000 的初始化
代码以及传输和接收数据包的空函数，你将填充这些函数。
`kernel/e1000_dev.h` 包含 E1000 定义的
寄存器和标志位定义，并在 Intel E1000
[软件开发者手册](/assets/mit6.1810/8254x_GBe_SDM.pdf) 中描述。
`kernel/net.c` 和 `kernel/net.h`
包含实现
[IP](https://en.wikipedia.org/wiki/Internet_Protocol)、[UDP](https://en.wikipedia.org/wiki/User_Datagram_Protocol) 和 [ARP](https://en.wikipedia.org/wiki/Address_Resolution_Protocol) 协议的简单网络栈；
`net.c` 有用户进程发送 UDP 数据包的完整代码，
但缺少接收数据包并将其传送到用户空间的大部分代码。
最后，`kernel/pci.c` 包含在 xv6 启动时
搜索 PCI 总线上 E1000 卡的代码。

## 第一部分：NIC

> 你的任务是完成
> `e1000_transmit()` 和
> `e1000_recv()`，
> 都在 `kernel/e1000.c` 中，
> 使驱动程序能够传输和接收数据包。
> 当 `make grade` 说你的
> 解决方案通过"txone"和"rxone"测试时，你就完成了这部分。

> 在编写代码时，你会发现需要参考 E1000 [软件开发者手册](/assets/mit6.1810/8254x_GBe_SDM.pdf)。以下部分可能特别有帮助：
> *   第 2 节是必不可少的，它概述了整个设备。
> *   第 3.2 节概述了数据包接收。
> *   第 3.3 节概述了数据包传输，以及第 3.4 节。
> *   第 13 节概述了 E1000 使用的寄存器。
> *   第 14 节可能有助于你理解我们提供的初始化代码。

浏览 E1000 [软件开发者手册](/assets/mit6.1810/8254x_GBe_SDM.pdf)。
本手册涵盖了几个密切相关的以太网控制器。
QEMU 模拟 82540EM。现在快速浏览第 2 章以了解
设备。要编写你的驱动程序，你需要熟悉第 3 章
和第 14 章，以及 4.1 节（尽管不是 4.1 的子节）。你还需要使用
第 13 章作为参考。其他章节主要涵盖
你的驱动程序不需要交互的 E1000 组件。刚开始时不要担心
细节；只需了解文档的结构，以便稍后
找到内容。E1000 有许多高级功能，
其中大多数你可以忽略。完成这个实验只需要
一小部分基本功能。

我们在 `e1000.c` 中提供的 `e1000_init()` 函数
配置 E1000 从 RAM 读取要传输的数据包，并
将接收到的数据包写入 RAM。这种技术称为 DMA，即
直接内存访问，指的是 E1000 硬件
直接向 RAM 读写数据包。

因为数据包突发可能比驱动程序处理
它们的速度更快，`e1000_init()` 为 E1000 提供多个缓冲区，
E1000 可以将数据包写入这些缓冲区。E1000 要求这些
缓冲区由 RAM 中的"描述符"数组描述；每个
描述符包含 E1000 可以
写入接收到的数据包的 RAM 地址。
`struct rx_desc` 描述了描述符格式。
描述符数组称为
接收环或接收队列。它是一个循环环，意思是
当卡或驱动程序到达数组末尾时，它会回到
开头。`e1000_init()` 使用 [`kalloc()`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c)
为 E1000 分配数据包缓冲区进行 DMA。
还有一个传输环，
驱动程序应将想要 E1000 发送的数据包放入其中。
`e1000_init()` 配置两个环的大小为
`RX_RING_SIZE` 和 `TX_RING_SIZE`。

当 `net.c` 中的网络栈需要发送数据包时，
它调用 `e1000_transmit()`，传入一个
指向要发送数据包的缓冲区的指针；
`net.c` 使用 [`kalloc()`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 分配此缓冲区。
你的传输代码必须将指向数据包数据的指针
放在 TX（传输）环中的描述符中。
`struct tx_desc` 描述了描述符格式。你需要确保每个
缓冲区最终传递给 `kfree()`，但只有在 E1000 完成
传输数据包之后（E1000
在描述符中设置 `E1000_TXD_STAT_DD` 位来指示这一点）。

当 E1000 从以太网接收每个数据包时，它通过 DMA
将数据包传输到下一个 RX（接收）环描述符中
`addr` 指向的内存。
如果 E1000 中断尚未挂起，E1000 会要求 PLIC
在启用中断后立即传送一个中断。
你的 `e1000_recv()` 代码必须扫描 RX 环并
通过调用 `net_rx()` 将每个新数据包传送到网络栈（在 `net.c` 中）。
然后你需要分配一个新缓冲区
并将其放入描述符中，这样当 E1000 再次到达
RX 环中的该点时，它会找到一个新缓冲区来 DMA 新
数据包。

除了在 RAM 中读写描述符环外，
你的驱动程序还需要通过其内存映射的控制寄存器
与 E1000 交互，
以检测何时
接收到数据包可用以及
通知 E1000
驱动程序已在某些 TX 描述符中填入要发送的数据包。
全局变量 `regs` 持有指向
E1000 第一个控制寄存器的指针；
你的驱动程序可以通过将 `regs`
作为数组索引来访问其他寄存器。
你需要特别使用索引 `E1000_RDT` 和
`E1000_TDT`。

要测试 e1000_transmit() 发送单个数据包，
在一个窗口中运行 `python3 nettest.py txone`，
在另一个窗口中运行 `make qemu`
然后在 xv6 中运行 `nettest txone`，
这会发送单个数据包。
如果一切顺利，`nettest.py` 将打印 `txone: OK`
（即 qemu 的 e1000 模拟器
在 DMA 环上看到数据包并将其转发
到 qemu 外部）。

如果传输成功，`tcpdump -XXnr packets.pcap`
应该产生如下输出：
```
reading from file packets.pcap, link-type EN10MB (Ethernet)
21:27:31.688123 IP 10.0.2.15.2000 > 10.0.2.2.25603: UDP, length 5
        0x0000:  5255 0a00 0202 5254 0012 3456 0800 4500  RU....RT..4V..E.
        0x0010:  0021 0000 0000 6411 3ebc 0a00 020f 0a00  .!....d.>.......
        0x0020:  0202 07d0 6403 000d 0000 7478 6f6e 65    ....d.....txone
```

要测试 e1000_recv() 接收两个数据包（一个
ARP 查询，然后是一个 IP/UDP 数据包），在一个窗口中运行 `make qemu`，
在另一个窗口中运行 `python3 nettest.py rxone`。
`nettest.py rxone` 通过 qemu 向 xv6 发送一个
单个 UDP 数据包；qemu 实际上首先
向 xv6 发送一个 ARP 请求，然后（在 xv6 返回
ARP 回复后）qemu 将 UDP 数据包转发给 xv6。
如果 e1000_recv() 正确工作并将这些
数据包传递给 `net_rx()`，`net.c` 应该打印
```
arp_rx: received an ARP packet
ip_rx: received an IP packet
```
`net.c` 已经包含检测 qemu 的
ARP 请求并调用 `e1000_transmit()` 发送
其回复的代码。
这个测试要求 e1000_transmit() 和 e1000_recv() 都能正常工作。
此外，如果一切顺利，
`tcpdump -XXnr packets.pcap` 应该产生如下输出：
```
reading from file packets.pcap, link-type EN10MB (Ethernet)
21:29:16.893600 ARP, Request who-has 10.0.2.15 tell 10.0.2.2, length 28
        0x0000:  ffff ffff ffff 5255 0a00 0202 0806 0001  ......RU........
        0x0010:  0800 0604 0001 5255 0a00 0202 0a00 0202  ......RU........
        0x0020:  0000 0000 0000 0a00 020f                 ..........
21:29:16.894543 ARP, Reply 10.0.2.15 is-at 52:54:00:12:34:56, length 28
        0x0000:  5255 0a00 0202 5254 0012 3456 0806 0001  RU....RT..4V....
        0x0010:  0800 0604 0002 5254 0012 3456 0a00 020f  ......RT..4V....
        0x0020:  5255 0a00 0202 0a00 0202                 RU........
21:29:16.902656 IP 10.0.2.2.61350 > 10.0.2.15.2000: UDP, length 3
        0x0000:  5254 0012 3456 5255 0a00 0202 0800 4500  RT..4VRU......E.
        0x0010:  001f 0000 0000 4011 62be 0a00 0202 0a00  ......@.b.......\
        0x0020:  020f efa6 07d0 000b fdd6 7879 7a         ..........xyz
```

你的输出会有些不同，但它应该包含
字符串"ARP, Request"、"ARP, Reply"、"UDP"，
和"....xyz"。

如果上述两个测试都能正常工作，那么 `make grade`
应该显示前两个测试通过。

## e1000 提示

首先在 `e1000_transmit()`
和 `e1000_recv()` 中添加打印语句，然后运行（在
xv6 中）`nettest txone`。你应该从打印语句中看到
`nettest txone` 生成对 `e1000_transmit` 的调用。

实现 `e1000_transmit` 的一些提示：

*   首先通过读取
    `E1000_TDT` 控制寄存器，询问 E1000 在哪个 TX 环索引
    期望下一个数据包。

*   然后检查环是否溢出。如果在 `E1000_TDT` 索引的描述符中
    `E1000_TXD_STAT_DD` 未设置，
    E1000 尚未完成相应的先前传输
    请求，因此返回错误。

*   否则，使用 `kfree()` 释放从该描述符传输的
    最后一个缓冲区（如果有的话）。

*   然后填写描述符。
    设置必要的 cmd 标志（查看 E1000 手册中的第 3.3 节）并保存
    指向缓冲区的指针以供稍后释放。

*   最后，通过将 1 加到 `E1000_TDT`
    模 `TX_RING_SIZE` 来更新环位置。

*   如果 `e1000_transmit()` 成功将数据包添加到环中，返回 0。
    失败时（例如，
    没有可用的描述符），返回 -1，以便
    调用者知道要释放缓冲区。

实现 `e1000_recv` 的一些提示：

*   首先通过获取 `E1000_RDT`
    控制寄存器并加
    1 模 `RX_RING_SIZE`，询问 E1000 下一个等待
    接收的数据包（如果有的话）位于哪个环索引。

*   然后通过检查描述符的 `status` 部分中的
    `E1000_RXD_STAT_DD` 位来检查是否有新数据包可用。
    如果没有，停止。

*   通过调用 `net_rx()` 将数据包缓冲区传送到
    网络栈。

*   然后使用 [`kalloc()`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 分配一个新缓冲区来替换刚刚给 `net_rx()` 的那个。
    将描述符的状态位清除为零。

*   最后，更新 `E1000_RDT` 寄存器为
    处理的最后一个环描述符的索引。

*   `e1000_init()` 用缓冲区初始化 RX 环，
    你会想要查看它是如何做到的，并可能借用代码。

*
    在某个时刻，曾经到达的数据包总数将超过环大小（16）；确保你的
    代码能够处理这种情况。

*
    e1000 可以在每次中断时传递多个数据包；
    你的 `e1000_recv` 应该处理这种情况。

你需要锁来应对 xv6 可能
从多个进程使用 E1000，或者在中断到达时
在内核线程中使用 E1000 的可能性。

## 第二部分：UDP 接收

UDP，用户数据报协议，允许不同
Internet 主机上的用户进程交换单个数据包（数据报）。UDP
建立在 IP 之上。用户进程通过指定 32 位 IP 地址来指示
它想要向哪个主机发送数据包。每个 UDP
数据包包含源端口号和目标端口号；
进程可以请求接收到达指定
端口号的数据包，并可以在发送时指定目标端口号。
因此，如果两个不同主机上的进程知道彼此的 IP 地址和
监听的端口号，它们可以通过 UDP 进行通信。例如，Google 在 IP 地址为 8.8.8.8 的主机上
运行 DNS 名称服务器，在 UDP 端口 53 上监听。

在这个任务中，你将向 `kernel/net.c` 添加代码来接收
UDP 数据包，将它们排队，并允许用户进程读取它们。
`net.c` 已经包含用户进程传输 UDP 数据包所需的代码（除了
e1000_transmit()，由你提供）。

> 你的任务是在 `kernel/net.c` 中实现
> `ip_rx()`、
> `sys_recv()`、
> 和
> `sys_bind()`。
> 当 `make grade` 说你的
> 解决方案通过所有测试时，你就完成了。
>
> 你可以通过在一个窗口中运行
> `python3 nettest.py grade`，然后（在另一个窗口中）
> 在 xv6 内运行 `nettest grade` 来运行与 `make grade` 相同的测试。如果一切顺利，
> `nettest.py` 应该打印 `txone: OK`，你应该
> 在 xv6 窗口中看到以下内容：
>
> ```
> $ nettest grade
> txone: sending one packet
> arp_rx: received an ARP packet
> ip_rx: received an IP packet
> ping0: starting
> ping0: OK
> ping1: starting
> ping1: OK
> ping2: starting
> ping2: OK
> ping3: starting
> ping3: OK
> dns: starting
> DNS arecord for pdos.csail.mit.edu. is 128.52.129.126
> dns: OK
> ```

UDP 的系统调用 API 规范如下：

*   `send(short sport, int dst, short dport, char *buf, int len)`：
    这个系统调用向 IP 地址为 `dst` 的主机发送一个 UDP 数据包，
    并（在该主机上）向监听端口 `dport` 的进程发送。数据包的
    源端口号将是 `sport`（这个端口号会报告
    给接收进程，以便它可以回复发送者）。UDP 数据包的内容
    （"有效载荷"）将是地址 `buf` 处的 `len` 字节。
    成功时返回值为 0，失败时为 -1。

*   `recv(short dport, int *src, short *sport, char *buf, int maxlen)`：
    这个系统调用返回到达
    目标端口为 `dport` 的 UDP 数据包的有效载荷。如果在调用 `recv()` 之前
    有一个或多个数据包到达，它应该立即返回
    最早等待的数据包。如果没有数据包等待，`recv()`
    应该等待直到有数据包到达 `dport`。
    `recv()` 应该按到达顺序查看给定端口的到达数据包。
    `recv()`
    将数据包的 32 位源 IP 地址复制到 `*src`，
    将数据包的 16 位 UDP 源端口号复制到 `*sport`，
    将最多 `maxlen` 字节的数据包 UDP 有效载荷
    复制到 `buf`，并从队列中移除数据包。系统调用
    返回复制的 UDP 有效载荷的字节数，或 -1 如果有
    错误。

*   `bind(short port)`：
    进程在调用 `recv(port, ...)` 之前应该调用 `bind(port)`。如果 UDP 数据包到达
    目标端口未传递给 `bind()`，
    `net.c` 应该丢弃该数据包。这个
    系统调用的原因是初始化 `net.c`
    需要的任何结构，以便为后续的
    `recv()` 调用存储到达的数据包。

*   `unbind(short port)`：你不需要实现
    这个系统调用，因为测试代码不使用它。但如果你愿意，可以实现它以与 `bind()` 提供对称性。

所有传递给这些系统调用的
地址和端口号参数，以及它们返回的，都必须是主机字节顺序
（见下文）。

你需要提供系统调用的内核实现，
除了 `send()`。程序
`user/nettest.c` 使用此 API。

要使 `recv()` 正常工作，你需要向
`ip_rx()` 添加代码，`net_rx()` 为每个接收到的
IP 数据包调用它。`ip_rx()` 应该决定到达的数据包是否是
UDP，以及其目标端口是否已传递给
`bind()`；如果两者都为真，它应该保存数据包
供 `recv()` 查找。然而，对于任何给定端口，不应
保存超过 16 个数据包；如果已经有 16 个等待
`recv()`，该端口的传入数据包应该被
丢弃。此规则的目的是防止快速或恶意发送者
迫使 xv6 耗尽内存。此外，如果因为某个端口已经有 16 个数据包等待而
丢弃数据包，这不应影响到达其他端口的数据包。

`ip_rx()` 查看的数据包缓冲区包含 14 字节的
以太网头，后跟 20 字节的 IP 头，后跟 8 字节的
UDP 头，后跟 UDP 有效载荷。你将在 `kernel/net.h` 中找到每个的 C
结构定义。
维基百科有 IP 头的描述
[在这里](https://en.wikipedia.org/wiki/Internet_Protocol_version_4#Header)，
和 UDP
[在这里](https://en.wikipedia.org/wiki/User_Datagram_Protocol)。

生产级的 IP/UDP 实现很复杂，处理协议
选项和验证不变量。你只需要做足够的工作来
通过 `make grade`。你的代码需要查看 IP 头中的 ip_p 和 ip_src，
以及 UDP 头中的 dport、sport 和 ulen。

你必须注意字节顺序。以太网、IP 和 UDP
包含多字节整数的头字段将最高有效字节
放在数据包中的第一位。RISC-V CPU 在内存中布局
多字节整数时，将最低有效字节
放在第一位。这意味着，当代码从数据包中提取多字节整数时，
它必须重新排列字节。这适用于短（2 字节）
和整数（4 字节）字段。你可以对 2 字节和 4 字节字段分别使用 `ntohs()`
和 `ntohl()` 函数。
查看 `net_rx()` 以了解在
查看 2 字节以太网类型字段时的示例。

如果你的 E1000 代码中有错误或遗漏，它们
可能只在 ping 测试期间开始引起问题。
例如，ping 测试发送和接收足够的数据包
使描述符环索引会回绕。

一些提示：

*   创建一个结构来跟踪绑定的端口和它们队列中的数据包。

*   参考 `kernel/proc.c` 中的 `sleep(void *chan, struct spinlock *lk)` 和 `wakeup(void *chan)`
    函数来实现 `recv()` 的等待逻辑。

*   `sys_recv()` 复制数据包的目标地址是虚拟地址；
    你必须从内核复制到当前用户进程。

*   确保释放已复制或已丢弃的数据包。

## 提交实验

### 花费的时间

创建一个新文件 `time.txt`，并在其中放入一个整数，表示你在实验上花费的小时数。
`git add` 并 `git commit` 该文件。

### 答案

如果这个实验有问题，请在 `answers-*.txt` 中写下你的答案。
`git add` 并 `git commit` 这些文件。

### 提交

实验提交由 Gradescope 处理。
你需要一个 MIT gradescope 账户。
查看 Piazza 获取加入课程的入口代码。
如果需要更多帮助加入，请使用 [此链接](https://help.gradescope.com/article/gi7gm49peg-student-add-course#joining_a_course_using_a_course_code)。

当你准备好提交时，运行 `make zipball`，
这将生成 `lab.zip`。
将此 zip 文件上传到相应的 Gradescope 作业。

如果你运行 `make zipball` 并且你有未提交的更改或
未跟踪的文件，你会看到类似于以下的输出：
```
 M hello.c
?? bar.c
?? foo.pyc
Untracked files will not be handed in.  Continue? [y/N]
```
检查以上行并确保你的实验解决方案所需的所有文件都被跟踪，即，不列在以 `??` 开头的行中。
你可以使用 `git add {filename}` 使 `git` 跟踪你创建的新文件。

> **警告**
> *   请运行 `make grade` 确保你的代码通过所有测试。
>     Gradescope 自动评分器将使用相同的评分程序为你的提交分配成绩。
> *   在运行 `make zipball` 之前提交任何修改的源代码。
> *   你可以在 Gradescope 上检查你的提交状态并下载提交的
>     代码。Gradescope 实验成绩是你的最终实验成绩。

## 可选挑战：

*   在这个实验中，网络栈使用中断来处理入口数据包
    处理，但不处理出口数据包处理。更复杂的策略
    是在软件中排队出口数据包，并只在任何时间向 NIC 提供有限数量
    的数据包。然后你可以依靠 TX 中断来重新填充
    传输环。使用这种技术，可以优先处理
    不同类型的出口流量。

*   提供的网络代码仅部分支持 ARP。实现一个完整的
    [ARP 缓存](https://tools.ietf.org/html/rfc826)。

*   E1000 支持多个 RX 和 TX 环。配置 E1000 为
    每个核心提供一个环对，并修改你的网络栈以支持
    多个环。这样做有可能增加你的网络栈可以支持的吞吐量
    以及减少锁争用。
    但难以测试/测量

*   [ICMP](https://tools.ietf.org/html/rfc792) 可以提供
    网络流失败的通知。检测这些通知并
    将它们作为错误传播给用户进程。

*   E1000 支持几种无状态硬件卸载，包括
    校验和计算、RSC 和 GRO。使用一种或多种这些卸载
    来增加你的网络栈
    的吞吐量。但难以测试/测量

*   这个实验中的网络栈容易受到接收活锁的影响。使用
    讲座和阅读作业中的材料，设计并实现一个
    解决方案来修复它。但难以测试。

*   实现一个最小的 TCP 栈并下载一个网页。

其中一些挑战旨在以在 QEMU 下可能不明显或不可测量的方式提高性能。

如果你追求挑战问题，无论是否与网络相关，
请告知课程工作人员！