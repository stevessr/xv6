---
title: 系统调用
---

# 实验：系统调用

在上一个实验中，你使用系统调用来编写了一些实用程序。在这个实验中，你将向 xv6 添加一些新的系统调用，这将帮助你理解它们的工作原理，并让你接触 xv6 内核的一些内部机制。你将在以后的实验中添加更多系统调用。

> 在开始编码之前，阅读 [xv6 书籍](/mit6.1810/xv6/book-riscv-rev4.pdf) 的第 2 章，以及第 4 章的第 4.3 和 4.4 节，以及相关源文件：
>
> * 路由系统调用进入内核的用户空间"存根"在 `user/usys.S` 中，当你运行 `make` 时由 `user/usys.pl` 生成。声明在 `user/user.h` 中
>
> * 路由系统调用到实现它的内核函数的内核空间代码在 `kernel/syscall.c` 和 `kernel/syscall.h` 中。
>
> * 与进程相关的代码在 `kernel/proc.h` 和 `kernel/proc.c` 中。

要开始实验，请切换到 syscall 分支：
```
$ git fetch
$ git checkout syscall
$ make clean
```

如果你运行 `make grade`，你会看到评分脚本无法执行 `trace`。你的任务是添加必要的系统调用和存根以使 `trace` 工作。此外，你会注意到 `attacktest` 失败。

## 使用 gdb

在许多情况下，打印语句就足以调试你的内核，但有时单步执行代码或获取堆栈回溯很有用。GDB 调试器可以提供帮助。

为了帮助你熟悉 gdb，运行 `make qemu-gdb` 然后在另一个窗口中启动 gdb（参见 [指导页面](/mit6.1810/labs/guidance.md) 上的 gdb 材料）。当你打开两个窗口后，在 gdb 窗口中输入：
```
(gdb) b syscall
Breakpoint 1 at 0x80002142: file kernel/syscall.c, line 243.
(gdb) c
Continuing.
[Switching to Thread 1.2]

Thread 2 hit Breakpoint 1, syscall () at kernel/syscall.c:243
243     {
(gdb) layout src
(gdb) backtrace
```

`layout` 命令将窗口分成两部分，显示 gdb 在源代码中的位置。`backtrace` 打印堆栈回溯。

在 `answers-syscall.txt` 中回答以下问题。

> 查看回溯输出，哪个函数调用了 [`syscall`](/source/xv6-riscv/kernel/syscall.c.md#syscall-kernel-syscall-c)？

输入 `n` 几次以步过 ` struct proc *p = myproc();` 语句。一旦过了这个语句，输入 `p /x *p`，这将打印当前进程的 `proc struct`（参见 `kernel/proc.h`）以十六进制显示。

> `p->trapframe->a7` 的值是多少，该值代表什么？（提示：查看 `user/initcode.S`，这是 xv6 启动的第一个用户程序。）

处理器在监管模式下运行，我们可以打印特权寄存器如 `sstatus`（参见 [RISC-V 特权指令](https://github.com/riscv/riscv-isa-manual/releases/download/Priv-v1.12/riscv-privileged-20211203.pdf) 获取描述）：

```
(gdb) p /x $sstatus
```

> CPU 之前的模式是什么？

xv6 内核代码包含一致性检查，其失败会导致内核恐慌；你可能会发现你的内核修改导致恐慌。例如，将 [`syscall`](/source/xv6-riscv/kernel/syscall.c.md#syscall-kernel-syscall-c) 开头的语句 `num = p->trapframe->a7;` 替换为 `num = * (int *) 0;`，运行 `make qemu`，你会看到类似于以下的内容：
```
xv6 kernel is booting

hart 2 starting
hart 1 starting
scause=0xd sepc=0x80001bfe stval=0x0
panic: kerneltrap
```
退出 `qemu`。

要追踪导致内核页面错误恐慌的来源，请在 `kernel/kernel.asm` 文件中搜索为恐慌打印的 `sepc` 值，该文件包含编译后的内核汇编代码。

> 写下内核恐慌时的汇编指令。哪个寄存器对应变量 `num`？

要检查处理器和内核在故障指令处的状态，启动 gdb，并在故障的 `epc` 处设置断点，如下所示：
```
(gdb) b *0x80001bfe
Breakpoint 1 at 0x80001bfe: file kernel/syscall.c, line 138.
(gdb) layout asm
(gdb) c
Continuing.
[Switching to Thread 1.3]

Thread 3 hit Breakpoint 1, syscall () at kernel/syscall.c:138
```

确认故障的汇编指令与你上面找到的相同。

> 为什么内核会崩溃？提示：查看文本中的图 3-3；地址 0 是否映射在内核地址空间中？这是否由上面的 `scause` 值确认？（参见 [RISC-V 特权指令](https://github.com/riscv/riscv-isa-manual/releases/download/Priv-v1.12/riscv-privileged-20211203.pdf) 中 `scause` 的描述）

注意 `scause` 是由上面的内核恐慌打印的，但通常你需要查看更多信息来追踪导致恐慌的问题。例如，要找出内核恐慌时正在运行的用户进程，你可以打印进程的名称：
```
(gdb) p p->name
```

> 内核恐慌时正在运行的进程名称是什么？它的进程 ID（`pid`）是什么？

你可能需要根据需要重新访问 [使用 GNU 调试器](https://pdos.csail.mit.edu/6.828/2019/lec/gdb_slides.pdf)。[指导页面](/mit6.1810/labs/guidance.md) 也有调试提示。

## 系统调用跟踪

> 在这个作业中，你将添加一个系统调用跟踪功能，这可能在调试后续实验时对你有帮助。你将创建一个新的 `trace` 系统调用，用于控制跟踪。它应该接受一个参数，一个整数"掩码"，其位指定要跟踪哪些系统调用。例如，要跟踪 fork 系统调用，程序调用 `trace(1 << SYS_fork)`，其中 `SYS_fork` 是 `kernel/syscall.h` 中的系统调用号。你必须修改 xv6 内核，使其在每个系统调用即将返回时打印一行，如果该系统调用的编号在掩码中设置了。该行应包含进程 ID、系统调用的名称和返回值；你不需要打印系统调用参数。`trace` 系统调用应为调用它的进程及其随后 fork 的任何子进程启用跟踪，但不应影响其他进程。

我们提供了一个 `trace` 用户级程序，它在启用跟踪的情况下运行另一个程序（参见 `user/trace.c`）。完成后，你应该看到如下输出：

```
$ trace 32 grep hello README
3: syscall read -> 1023
3: syscall read -> 966
3: syscall read -> 70
3: syscall read -> 0
$
$ trace 2147483647 grep hello README
4: syscall trace -> 0
4: syscall exec -> 3
4: syscall open -> 3
4: syscall read -> 1023
4: syscall read -> 966
4: syscall read -> 70
4: syscall read -> 0
4: syscall close -> 0
$
$ grep hello README
$
$ trace 2 usertests forkforkfork
usertests starting
test forkforkfork: 407: syscall fork -> 408
408: syscall fork -> 409
409: syscall fork -> 410
410: syscall fork -> 411
409: syscall fork -> 412
410: syscall fork -> 413
409: syscall fork -> 414
411: syscall fork -> 415
...
$
```

在上面的第一个示例中，trace 调用 grep 跟踪 read 系统调用。32 是 `1<<SYS_read`。在第二个示例中，trace 运行 grep 同时跟踪所有系统调用；2147483647 有所有 31 个低位设置。在第三个示例中，程序没有被跟踪，因此不打印跟踪输出。在第四个示例中，`usertests` 中 `forkforkfork` 测试的所有后代的 fork 系统调用都被跟踪。如果你的程序行为如上所示（尽管进程 ID 可能不同），则你的解决方案是正确的。

一些提示：
* 将 `$U/_trace` 添加到 Makefile 中的 UPROGS

* 运行 `make qemu`，你会看到编译器无法编译 `user/trace.c`，因为 `trace` 系统调用的用户空间存根还不存在：将 `trace` 的原型添加到 `user/user.h`，将存根添加到 `user/usys.pl`，并将系统调用号添加到 `kernel/syscall.h`。Makefile 调用 perl 脚本 `user/usys.pl`，它生成 `user/usys.S`，即实际的系统调用存根，它们使用 RISC-V `ecall` 指令过渡到内核。一旦你修复了编译问题，运行 `trace 32 grep hello README`；它会失败，因为你还未在内核中实现系统调用。

* 在 `kernel/sysproc.c` 中添加 `sys_trace()` 函数，通过在 `proc` 结构中记住其参数来实现新系统调用（参见 `kernel/proc.h`）。从用户空间检索系统调用参数的函数在 `kernel/syscall.c` 中，你可以在 `kernel/sysproc.c` 中看到它们使用的示例。将你的新 `sys_trace` 添加到 `kernel/syscall.c` 中的 `syscalls` 数组。

* 修改 [`fork()`](/source/xv6-riscv/kernel/proc.c.md#fork-kernel-proc-c)（参见 `kernel/proc.c`）以将跟踪掩码从父进程复制到子进程。

* 修改 `kernel/syscall.c` 中的 [`syscall()`](/source/xv6-riscv/kernel/syscall.c.md#syscall-kernel-syscall-c) 函数以打印跟踪输出。你需要添加一个系统调用名称数组以进行索引。

## 攻击 xv6

xv6 内核将用户程序彼此隔离，并将内核与用户程序隔离。正如你在上面的作业中看到的，应用程序不能直接调用内核或其他用户程序中的函数；相反，交互仅通过系统调用发生。然而，如果系统调用的实现中存在错误，攻击者可能能够利用该错误来破坏隔离边界。为了了解错误如何被利用，我们在 xv6 中引入了一个错误，你的目标是利用该错误欺骗 xv6 泄露另一个进程的秘密。

错误是在 `kernel/vm.c` 第 272 行省略了调用 `memset(mem, 0, sz)` 来清除新分配的页面。类似地，当为这个实验编译 `kernel/kalloc.c` 时，省略了使用 [`memset`](/source/xv6-riscv/user/ulib.c.md#memset-user-ulib-c) 将垃圾放入空闲页面的两行。省略这 3 行（都标记为 `ifndef LAB_SYSCALL`）的净效果是新分配的内存保留了其先前使用的内

容。

> `user/secret.c` 在其内存中写入一个 8 字节的秘密然后退出（这会释放其内存）。你的目标是向 `user/attack.c` 添加几行代码，找到 `secret.c` 的先前执行写入内存的秘密，并将 8 个秘密字节写入文件描述符 2。如果你的 `attacktest` 打印："OK: secret is ebb.ebb"，你将获得满分。（注意：每次运行 `attacktest` 时秘密可能不同。）
>
> 你可以修改 `user/attack.c`，但你不能进行任何其他更改：你不能修改 xv6 内核源代码、secret.c、attacktest.c 等。

一些提示：
* 在 xv6 shell 中运行 `attacktest`。它应该输出以下内容：
  ```
  $ attacktest
  FAIL: no/incorrect secret
  ```
  注意，尽管删除了 3 行，xv6 似乎仍然正常工作：它启动了 shell 并运行了 `attacktest`。事实上，如果你运行 `usertests`，大多数测试都会通过！
* 阅读 `user/attacktest.c`。它生成一个随机的 8 字节字符串，传递给程序 `secret`，`secret` 将其写入其内存。在 `secret` 退出后，`attacktest` 生成 `attack` 并等待 `attack` 将秘密字符串写入文件描述符 2。

* 阅读 `user/secret.c` 并思考如何欺骗 xv6 向 `attack.c` 泄露秘密。

* 通过在 xv6 shell 中运行 `attacktest` 来测试你的漏洞利用。

> `user/secret.c` 将秘密字节复制到距离页面开始 32 字节的内存地址。将 32 更改为 0，你应该看到你的攻击不再起作用；为什么？

小错误虽然不会直接影响正确性，但仍可能被利用来破坏安全性（如上面的错误），这使得内核编程具有挑战性。xv6 可能有此类错误，尽管我们尽量避免它们。真实的内核，其代码行数比 xv6 多得多，有着此类错误的悠久历史。例如，请参阅公开的 [Linux 漏洞](https://www.opencve.io/cve?vendor=linux&product=linux_kernel) 和 [如何报告漏洞](https://docs.kernel.org/process/security-bugs.html)。

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

如果你运行 `make zipball` 并且你有未提交的更改或未跟踪的文件，你会看到类似于以下的输出：
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
> *   你可以在 Gradescope 上检查你的提交状态并下载提交的代码。Gradescope 实验成绩是你的最终实验成绩。

## 可选挑战练习

*   为跟踪的系统调用打印系统调用参数。

*   在 xv6 中找到一个允许对手破坏进程隔离或使内核崩溃的错误并告知我们。（侧信道如 Meltdown 超出范围，尽管我们将在讲座中介绍它们。）