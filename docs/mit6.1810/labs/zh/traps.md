---
title: 陷阱
---

# 实验：陷阱

这个实验探讨了如何使用陷阱来实现系统调用。你首先会做一些关于堆栈的热身练习，然后你将实现一个用户级陷阱处理的例子。

> 在开始编码之前，阅读 [xv6 书籍](/mit6.1810/xv6/book-riscv-rev4.pdf) 的第 4 章，以及相关源文件：
> *   `kernel/trampoline.S`：涉及从用户空间到内核空间以及返回的汇编代码
> *   `kernel/trap.c`：处理所有中断的代码

要开始实验，请切换到 trap 分支：
```
$ git fetch
$ git checkout traps
$ make clean
```

## RISC-V 汇编

理解一点 RISC-V 汇编很重要，你在 6.1910 (6.004) 中已经接触过。在你的 xv6 仓库中有一个文件 `user/call.c`。`make fs.img` 会编译它，并且还会在 `user/call.asm` 中生成程序的可读汇编版本。

阅读 call.asm 中函数 `g`、`f` 和 [`main`](/source/xv6-riscv/user/zombie.c.md#main-user-zombie-c) 的代码。RISC-V 的指令手册在 [参考页面](/mit6.1810/quiz.md) 上。在 `answers-traps.txt` 中回答以下问题：

> 哪些寄存器包含函数的参数？例如，在 main 调用 [`printf`](/source/xv6-riscv/user/printf.c.md#printf-user-printf-c) 时，哪个寄存器持有 13？

> 在 main 的汇编代码中，函数 `f` 的调用在哪里？`g` 的调用在哪里？（提示：编译器可能会内联函数。）

> 函数 [`printf`](/source/xv6-riscv/user/printf.c.md#printf-user-printf-c) 位于什么地址？

> 在 [`main`](/source/xv6-riscv/user/zombie.c.md#main-user-zombie-c) 中 `jalr` 到 [`printf`](/source/xv6-riscv/user/printf.c.md#printf-user-printf-c) 之后，寄存器 `ra` 中的值是什么？

> 运行以下代码。
> ```
> unsigned int i = 0x00646c72;
> printf("H%x Wo%s", 57616, (char *) &i);
> ```
> 输出是什么？
> [这里有一个 ASCII 表](https://www.asciitable.com/) 将字节映射到字符。
>
> 输出依赖于 RISC-V 是小端的事实。如果 RISC-V 是大端，你会将 `i` 设置为什么值才能产生相同的输出？
> 你需要将 `57616` 更改为不同的值吗？
>
> [这里描述了小端和大端](http://www.webopedia.com/TERM/b/big_endian.html)
> 和
> [一个更有趣的描述](https://www.rfc-editor.org/ien/ien137.txt)。

> 在以下代码中，`'y='` 之后要打印什么？（注意：答案不是一个特定的值。）为什么会发生这种情况？
>
> ```
> printf("x=%d y=%d", 3);
> ```

## 回溯

为了调试，回溯通常很有用：在错误发生点上方的堆栈上调用函数的列表。为了帮助回溯，编译器生成机器代码，在当前调用链中为每个函数在堆栈上维护一个堆栈帧。每个堆栈帧由返回地址和指向调用者堆栈帧的"帧指针"组成。寄存器 `s0` 包含指向当前堆栈帧的指针（它实际上指向堆栈上保存的返回地址的地址加 8）。你的 `backtrace` 应该使用帧指针在堆栈上行走并打印每个堆栈帧中保存的返回地址。

> 在 `kernel/printf.c` 中实现一个 `backtrace()` 函数。在 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md#sys_sleep-kernel-sysproc-c) 中插入对此函数的调用，然后运行 `bttest`，它调用 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md#sys_sleep-kernel-sysproc-c)。你的输出应该是一个返回地址列表，格式如下（但数字可能不同）：
> ```
> backtrace:
> 0x0000000080002cda
> 0x0000000080002bb6
> 0x0000000080002898
> ```
> 在 `bttest` 退出 qemu 后。在终端窗口中：运行 `addr2line -e kernel/kernel`（或 `riscv64-unknown-elf-addr2line -e kernel/kernel`）并剪切粘贴你的回溯中的地址，如下所示：
> ```
> $ addr2line -e kernel/kernel
> 0x0000000080002de2
> 0x0000000080002f4a
> 0x0000000080002bfc
> Ctrl-D
> ```
> 你应该看到类似这样的内容：
> ```
> kernel/sysproc.c:74
> kernel/syscall.c:224
> kernel/trap.c:85
> ```

一些提示：
*   将你的 `backtrace()` 原型添加到 `kernel/defs.h` 中，这样你就可以在 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md#sys_sleep-kernel-sysproc-c) 中调用 `backtrace`。
*   GCC 编译器将当前执行函数的帧指针存储在寄存器 `s0` 中。在 #ifndef __ASSEMBLER__ ... #endif 标记的部分中，将以下函数添加到 `kernel/riscv.h`：
    ```
    static inline uint64
    r_fp()
    {
      uint64 x;
      asm volatile("mv %0, s0" : "=r" (x) );
      return x;
    }
    ```
    并在 `backtrace` 中调用此函数以读取当前帧指针。[`r_fp()`](/source/xv6-riscv/kernel/riscv.h.md#r_fp-kernel-riscv-h) 使用 [内联汇编](https://gcc.gnu.org/onlinedocs/gcc/Using-Assembly-Language-with-C.html) 读取 `s0`。
*   这些 [讲义](https://pdos.csail.mit.edu/6.1810/2023/lec/l-riscv.txt) 有堆栈帧布局的图片。注意返回地址位于堆栈帧的固定偏移量 (-8) 处，保存的帧指针位于帧指针的固定偏移量 (-16) 处。
*   你的 `backtrace()` 需要一种方法来识别它已经看到了最后一个堆栈帧，并应该停止。一个有用的事实是，为每个内核堆栈分配的内存由单个页面对齐的页面组成，因此给定堆栈的所有堆栈帧都在同一页面上。你可以使用 `PGROUNDDOWN(fp)`（参见 `kernel/riscv.h`）来识别帧指针引用的页面。

一旦你的回溯工作正常，在 `kernel/printf.c` 中的 [`panic`](/source/xv6-riscv/user/sh.c.md#panic-user-sh-c) 中调用它，这样当内核恐慌时你会看到内核的回溯。

## 警报

> 在这个练习中，你将向 xv6 添加一个功能，定期在进程使用 CPU 时间时提醒它。这对于想要限制消耗多少 CPU 时间的计算密集型进程，或者想要计算但也想采取一些定期行动的进程可能很有用。更一般地说，你将实现一种原始形式的用户级中断/故障处理程序；你可以使用类似的东西来处理应用程序中的页面错误。如果你的解决方案通过了 alarmtest 和 'usertests -q'，则它是正确的。

你应该添加一个新的 `sigalarm(interval, handler)` 系统调用。如果应用程序调用 `sigalarm(n, fn)`，那么在程序消耗的每 `n` 个 CPU 时间"ticks"后，内核应该导致调用应用程序函数 `fn`。当 `fn` 返回时，应用程序应该从它离开的地方恢复。tick 是 xv6 中一个相当任意的时间单位，由硬件定时器生成中断的频率决定。如果应用程序调用 `sigalarm(0, 0)`，内核应该停止生成定期警报调用。

你会在 xv6 仓库中找到一个文件 `user/alarmtest.c`。将其添加到 Makefile 中。在你添加 `sigalarm` 和 `sigreturn` 系统调用之前，它不会正确编译（见下文）。

`alarmtest` 在 `test0` 中调用 `sigalarm(2, periodic)` 来要求内核每 2 个 ticks 强制调用 `periodic()`，然后旋转一段时间。你可以在 user/alarmtest.asm 中看到 alarmtest 的汇编代码，这可能有助于调试。当 alarmtest 产生如下输出并且 usertests -q 也正常运行时，你的解决方案是正确的：

```
$ alarmtest
test0 start
........alarm!
test0 passed
test1 start
...alarm!
..alarm!
...alarm!
..alarm!
...alarm!
..alarm!
...alarm!
..alarm!
...alarm!
..alarm!
test1 passed
test2 start
................alarm!
test2 passed
test3 start
test3 passed
$ usertest -q
...
ALL TESTS PASSED
$
```

当你完成时，你的解决方案将只有几行代码，但要正确实现可能很棘手。我们将使用原始仓库中的 alarmtest.c 版本来测试你的代码。你可以修改 alarmtest.c 来帮助你调试，但要确保原始的 alarmtest 说所有测试都通过了。

### test0: 调用处理程序

首先通过修改内核跳转到用户空间中的警报处理程序来开始，这将导致 test0 打印 "alarm!"。暂时不要担心 "alarm!" 输出之后发生什么；现在如果程序在打印 "alarm!" 后崩溃是可以的。以下是一些提示：

*   你需要修改 Makefile 以使 `alarmtest.c` 作为 xv6 用户程序编译。

*   放在 `user/user.h` 中的正确声明是：
    ```
    int sigalarm(int ticks, void (*handler)());
    int sigreturn(void);
    ```

*   更新 user/usys.pl（生成 user/usys.S）、kernel/syscall.h 和 kernel/syscall.c 以允许 alarmtest 调用 sigalarm 和 sigreturn 系统调用。

*   现在，你的 `sys_sigreturn` 应该只返回零。

*   你的 `sys_sigalarm()` 应该在 `proc` 结构的新字段中存储警报间隔和指向处理函数的指针（在 `kernel/proc.h` 中）。

*   你需要跟踪自上次调用处理程序（或到下一次调用）以来经过了多少 ticks；你也需要在 `struct proc` 中为此添加一个新字段。你可以在 `proc.c` 中的 [`allocproc()`](/source/xv6-riscv/kernel/proc.c.md#allocproc-kernel-proc-c) 中初始化 `proc` 字段。

*   每个 tick，硬件时钟都会强制中断，这在 `kernel/trap.c` 中的 [`usertrap()`](/source/xv6-riscv/kernel/trap.c.md#usertrap-kernel-trap-c) 中处理。

*   你只想在有定时器中断时操作进程的警报 ticks；你需要类似这样的东西
    ```
    if(which_dev == 2) ...
    ```

*   只有当进程有待处理的定时器时才调用警报函数。注意用户警报函数的地址可能是 0（例如，在 user/alarmtest.asm 中，`periodic` 位于地址 0）。

*   你需要修改 [`usertrap()`](/source/xv6-riscv/kernel/trap.c.md#usertrap-kernel-trap-c)，以便当进程的警报间隔到期时，用户进程执行处理函数。当 RISC-V 上的陷阱返回到用户空间时，什么决定了用户空间代码恢复执行的指令地址？

*   如果你用 gdb 查看陷阱会更容易，告诉 qemu 只使用一个 CPU，你可以通过运行
    ```
    make CPUS=1 qemu-gdb
    ```

*   如果 alarmtest 打印 "alarm!"，你就成功了。

### test1/test2()/test3(): 恢复中断的代码

很可能 alarmtest 在 test0 或 test1 中打印 "alarm!" 后崩溃，或者 alarmtest（最终）打印 "test1 failed"，或者 alarmtest 退出而不打印 "test1 passed"。要解决这个问题，你必须确保当警报处理程序完成后，控制返回到用户程序最初被定时器中断时的指令。你必须确保寄存器内容恢复到中断时的值，以便用户程序可以不受干扰地继续。最后，你应该在每次警报结束后"重新装备"警报计数器，以便定期调用处理程序。

作为一个起点，我们已经为你做了一个设计决定：用户警报处理程序需要在完成后调用 `sigreturn` 系统调用。看看 `alarmtest.c` 中的 `periodic` 作为例子。这意味着你可以在 [`usertrap`](/source/xv6-riscv/kernel/trap.c.md#usertrap-kernel-trap-c) 和 `sys_sigreturn` 中添加代码，它们合作以使用户进程在处理警报后正确恢复。

一些提示：
*   你的解决方案需要保存和恢复寄存器---你需要保存和恢复哪些寄存器才能正确恢复中断的代码？（提示：会有很多）。
*   让 [`usertrap`](/source/xv6-riscv/kernel/trap.c.md#usertrap-kernel-trap-c) 在定时器到期时在 `struct proc` 中保存足够的状态，以便 `sigreturn` 可以正确返回到中断的用户代码。

*   防止处理程序的重入调用----如果处理程序还没有返回，内核不应该再次调用它。`test2` 测试这一点。

*   确保恢复 a0。`sigreturn` 是一个系统调用，其返回值存储在 a0 中。
      
一旦你通过了 `test0`、`test1`、`test2` 和 `test3`，运行 `usertests -q` 以确保你没有破坏内核的任何其他部分。

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

*   在 `backtrace()` 中打印函数名称和行号而不是数值地址。