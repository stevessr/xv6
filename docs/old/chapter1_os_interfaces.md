# 第 1 章：操作系统接口

## 1.1 教学目标

本章旨在帮助学生深入理解操作系统的核心概念和基本接口。学完本章后，学生应能：

1.  **理解核心概念**：掌握进程、文件描述符、管道和文件系统的基本原理。
2.  **掌握核心系统调用**：理解 [`fork`](/source/xv6-riscv/user/user.h.md)、[`exec`](/source/xv6-riscv/user/user.h.md)、[`wait`](/source/xv6-riscv/user/user.h.md)、[`pipe`](/source/xv6-riscv/user/user.h.md)、[`read`](/source/xv6-riscv/user/user.h.md)、[`write`](/source/xv6-riscv/user/user.h.md) 等核心系统调用的工作机制及其在内核中的实现。
3.  **代码分析能力**：通过分析 xv6 shell ([`user/sh.c`](/source/xv6-riscv/user/sh.c.md)) 的实现，理解如何组合这些系统调用来构建一个复杂的应用程序。

## 1.2 Shell 与系统调用

操作系统为用户程序提供服务的接口称为 **系统调用 (System Call)**。用户程序通过执行系统调用，从用户态陷入内核态，请求内核完成特定功能，如文件操作或进程管理。

一个典型的例子就是 Shell。Shell 本身是一个普通的用户程序，它读取用户输入的命令，然后通过一系列系统调用来执行这些命令。xv6 的 Shell 实现位于 [`user/sh.c`](/source/xv6-riscv/user/sh.c.md)，它的简洁与强大充分体现了 Unix-like 系统接口设计的精髓。

整个流程的核心在 [[`main`](/source/xv6-riscv/user/zombie.c.md)](source/xv6-riscv/user/sh.c.md) 函数和 [[`runcmd`](/source/xv6-riscv/user/sh.c.md)](source/xv6-riscv/user/sh.c.md) 函数中。[[`main`](/source/xv6-riscv/user/zombie.c.md)](source/xv6-riscv/user/sh.c.md) 函数循环调用 [[`getcmd`](/source/xv6-riscv/user/sh.c.md)](source/xv6-riscv/user/sh.c.md) 来获取用户输入，然后调用 [`fork`](/source/xv6-riscv/user/user.h.md) 创建一个子进程，子进程再调用 [[`runcmd`](/source/xv6-riscv/user/sh.c.md)](source/xv6-riscv/user/sh.c.md) 来解析并执行命令。


```c
// user/sh.c: main 函数的核心循环
while(getcmd(buf, sizeof(buf)) >= 0){
  if(buf[0] == 'c' && buf[1] == 'd' && buf[2] == ' '){
    // ... chdir 特殊处理 ...
    continue;
  }
  if(fork1() == 0) // 创建子进程
    runcmd(parsecmd(buf)); // 子进程执行命令
  wait(0); // 父进程等待子进程结束
}

```


接下来，我们将以 `sh.c` 为主线，深入探讨几个关键的系统调用。

## 1.3 进程创建与管理 ([`fork`](/source/xv6-riscv/user/user.h.md), [`exec`](/source/xv6-riscv/user/user.h.md), [`wait`](/source/xv6-riscv/user/user.h.md))

### 1.3.1 `fork()`: 创建一个新进程

`fork()` 是 Unix 系统中创建新进程的唯一方式。它会创建一个与调用进程（父进程）几乎完全相同的副本（子进程）。

*   **用户视角**: 在 [`sh.c`](/source/xv6-riscv/user/sh.c.md) 中，shell 通过调用 [[`fork1`](/source/xv6-riscv/user/sh.c.md)](source/xv6-riscv/user/sh.c.md)（一个 [`fork`](/source/xv6-riscv/user/user.h.md) 的简单封装）来为每个命令创建一个新的子进程。[`fork`](/source/xv6-riscv/user/user.h.md) 调用在父子进程中都会返回：在父进程中返回子进程的 PID，在子进程中返回 0。这种机制使得程序可以根据返回值区分父子进程，执行不同的逻辑。

*   **内核实现**: [`fork`](/source/xv6-riscv/user/user.h.md) 的内核实现位于 [`kernel/proc.c`](/source/xv6-riscv/kernel/proc.c.md) 的 [[`fork`](/source/xv6-riscv/user/user.h.md)](source/xv6-riscv/kernel/proc.c.md) 函数。其主要步骤包括：
    1.  调用 [[`allocproc`](/source/xv6-riscv/kernel/proc.c.md)](source/xv6-riscv/kernel/proc.c.md) 在进程表中找到一个空闲的 `struct proc`，并为其分配内核栈和陷阱帧。
    2.  调用 [`uvmcopy`](/source/xv6-riscv/kernel/defs.h.md) 复制父进程的用户内存空间到子进程。
    3.  复制父进程的文件描述符表、当前工作目录等状态。
    4.  将子进程的状态设置为 `RUNNABLE`，使其可以被调度器调度运行。
    5.  巧妙地设置子进程的陷阱帧，使其 [`fork`](/source/xv6-riscv/user/user.h.md) 系统调用的返回值（`a0` 寄存器）为 0。

### 1.3.2 `exec()`: 加载并执行一个程序

`exec()` 系统调用用于将一个新程序加载到当前进程的内存空间中，并从该程序的入口点开始执行。它会替换当前进程的内存映像，但 PID 和文件描述符表保持不变。

*   **用户视角**: 在 [`sh.c`](/source/xv6-riscv/user/sh.c.md) 的 [[`runcmd`](/source/xv6-riscv/user/sh.c.md)](source/xv6-riscv/user/sh.c.md) 函数中，对于简单的执行命令（`EXEC` 类型），子进程最终会调用 [`exec`](/source/xv6-riscv/user/user.h.md)。例如，当用户输入 `ls -l` 时，子进程会调用 `exec("ls", {"ls", "-l", 0})`。如果 [`exec`](/source/xv6-riscv/user/user.h.md) 成功，它将永不返回；如果失败（例如找不到文件），则会返回 -1。

*   **内核实现**: [`exec`](/source/xv6-riscv/user/user.h.md) 的实现位于 [`kernel/exec.c`](/source/xv6-riscv/kernel/exec.c.md) 的 [[`exec`](/source/xv6-riscv/user/user.h.md)](source/xv6-riscv/kernel/exec.c.md) 函数。其核心步骤是：
    1.  通过 [`namei`](/source/xv6-riscv/kernel/fs.c.md) 找到可执行文件的 inode。
    2.  读取并验证文件的 [ELF (Executable and Linkable Format)](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) 头，以确保它是一个合法的可执行文件。
    3.  创建一个新的页表，并根据 ELF 程序头的信息，使用 [`uvmalloc`](/source/xv6-riscv/kernel/defs.h.md) 分配内存，并调用 [[`loadseg`](/source/xv6-riscv/kernel/exec.c.md)](source/xv6-riscv/kernel/exec.c.md) 将程序的代码段和数据段从文件加载到内存中。
    4.  分配并设置用户栈，将命令行参数 `argv` 复制到栈顶。
    5.  替换进程的页表、大小，并设置程序计数器 (`epc`) 为 ELF 文件中指定的入口点。
    6.  释放旧的页表和内存。

[`fork`](/source/xv6-riscv/user/user.h.md) 和 [`exec`](/source/xv6-riscv/user/user.h.md) 的分离是 Unix 设计的一大亮点。它允许 shell 在 [`fork`](/source/xv6-riscv/user/user.h.md) 之后、[`exec`](/source/xv6-riscv/user/user.h.md) 之前执行一些额外的操作，最典型的就是 I/O 重定向。

### 1.3.3 `wait()`: 等待子进程结束

父进程通常需要等待子进程执行完毕并收集其退出状态。`wait()` 系统调用就是为此设计的。

*   **用户视角**: 在 [`sh.c`](/source/xv6-riscv/user/sh.c.md) 的主循环中，父进程在 [`fork`](/source/xv6-riscv/user/user.h.md) 之后会调用 [`wait(0)`](/source/xv6-riscv/user/sh.c.md)。这会使父进程（shell）暂停执行，直到子进程（正在执行的命令）调用 `exit()` 退出。

*   **内核实现**: [`wait`](/source/xv6-riscv/user/user.h.md) 的实现位于 [`kernel/proc.c`](/source/xv6-riscv/kernel/proc.c.md) 的 [[`wait`](/source/xv6-riscv/user/user.h.md)](source/xv6-riscv/kernel/proc.c.md) 函数。它会扫描进程表：
    1.  查找调用进程的所有子进程。
    2.  如果找到一个处于 `ZOMBIE`（僵尸）状态的子进程，说明该子进程已经退出。[`wait`](/source/xv6-riscv/user/user.h.md) 会收集子进程的退出状态，释放其 `proc` 结构和相关资源，并返回该子进程的 PID。
    3.  如果没有找到已退出的子进程，[`wait`](/source/xv6-riscv/user/user.h.md) 会调用 [[`sleep`](/source/xv6-riscv/user/user.h.md)](source/xv6-riscv/kernel/proc.c.md) 使父进程休眠，等待任意一个子进程退出时通过 [[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)](source/xv6-riscv/kernel/proc.c.md) 将其唤醒。

## 1.4 I/O 与文件描述符

在 xv6 中，所有 I/O 操作都通过文件描述符 (File Descriptor) 进行抽象。文件描述符是一个小的非负整数，内核用它来索引每个进程打开的文件表。按照惯例：
*   `0`: 标准输入 (stdin)
*   `1`: 标准输出 (stdout)
*   `2`: 标准错误 (stderr)

[[`read`](/source/xv6-riscv/user/user.h.md)](source/xv6-riscv/kernel/sysfile.c.md) 和 [[`write`](/source/xv6-riscv/user/user.h.md)](source/xv6-riscv/kernel/sysfile.c.md) 是两个核心的 I/O 系统调用，它们都通过文件描述符来操作对应的文件、设备或管道。

### 1.4.1 I/O 重定向

Shell 的一个强大功能是 I/O 重定向，例如 `echo hello > output.txt`。这正是通过巧妙地操纵文件描述符实现的。

*   **用户视角**: 在 [`sh.c`](/source/xv6-riscv/user/sh.c.md) 的 [[`runcmd`](/source/xv6-riscv/user/sh.c.md)](source/xv6-riscv/user/sh.c.md) 函数中，当解析到重定向命令（`REDIR` 类型）时，子进程会：
    1.  调用 [`close()`](/source/xv6-riscv/kernel/sysfile.c.md) 关闭标准输出（文件描述符 1）。
    2.  调用 [`open("output.txt", ...)` ](/source/xv6-riscv/kernel/sysfile.c.md)。由于文件描述符是按最小可用值分配的，新打开的文件 `output.txt` 会自动获得文件描述符 1。
    3.  之后调用 [`exec`](/source/xv6-riscv/user/user.h.md) 执行 `echo` 命令。此时，`echo` 对标准输出的所有写入都会被重定向到 `output.txt` 文件中。


```c
// user/sh.c: runcmd 中处理重定向的部分
case REDIR:
  rcmd = (struct redircmd*)cmd;
  close(rcmd->fd); // 关闭 0 (stdin) 或 1 (stdout)
  if(open(rcmd->file, rcmd->mode) < 0){ // 打开新文件，它将获得被关闭的 fd
    fprintf(2, "open %s 失败\n", rcmd->file);
    exit(1);
  }
  runcmd(rcmd->cmd); // 递归执行被重定向的命令
  break;

```


*   **内核实现**:
    *   [[`filealloc`](/source/xv6-riscv/kernel/file.c.md)](source/xv6-riscv/kernel/file.c.md): 从全局文件表 `ftable` 中分配一个 `struct file`。
    *   [[`fileclose`](/source/xv6-riscv/kernel/defs.h.md)](source/xv6-riscv/kernel/file.c.md): 减少文件的引用计数，当计数为 0 时，释放资源。
    *   每个进程的 `struct proc` 中都有一个 `ofile` 数组，用于存放指向 `struct file` 的指针，数组的索引就是文件描述符。

## 1.5 管道 ([`pipe`](/source/xv6-riscv/user/user.h.md))

管道是一种特殊的“文件”，它由内核维护一个小的缓冲区，用于在进程间传递数据。一个命令的输出可以通过管道直接作为另一个命令的输入，例如 `grep fork sh.c | wc -l`。

*   **用户视角**: 在 [`sh.c`](/source/xv6-riscv/user/sh.c.md) 的 [[`runcmd`](/source/xv6-riscv/user/sh.c.md)](source/xv6-riscv/user/sh.c.md) 中，当处理管道命令（`PIPE` 类型）时，shell 的处理过程如下：
    1.  调用 `pipe(p)` 创建一个管道。`p` 是一个包含两个整数的数组，`p[0]` 是管道的读取端，`p[1]` 是管道的写入端。
    2.  创建第一个子进程（管道左侧，如 [`grep`](/source/xv6-riscv/user/grep.c.md)）。该子进程关闭其标准输出（fd 1），然后用 [[`dup`](/source/xv6-riscv/user/user.h.md)](source/xv6-riscv/kernel/sysfile.c.md) 复制管道的写入端 `p[1]` 到 fd 1，最后关闭不再需要的 `p[0]` 和 `p[1]`，再 [`exec`](/source/xv6-riscv/user/user.h.md) 执行 [`grep`](/source/xv6-riscv/user/grep.c.md)。
    3.  创建第二个子进程（管道右侧，如 [`wc`](/source/xv6-riscv/user/wc.c.md)）。该子进程关闭其标准输入（fd 0），然后用 [`dup`](/source/xv6-riscv/user/user.h.md) 复制管道的读取端 `p[0]` 到 fd 0，最后关闭不再需要的 `p[0]` 和 `p[1]`，再 [`exec`](/source/xv6-riscv/user/user.h.md) 执行 [`wc`](/source/xv6-riscv/user/wc.c.md)。
    4.  父进程关闭自己持有的管道两端 `p[0]` 和 `p[1]`，并等待两个子进程都结束。

*   **内核实现**: [`pipe`](/source/xv6-riscv/user/user.h.md) 的实现位于 [`kernel/pipe.c`](/source/xv6-riscv/kernel/pipe.c.md)。
    1.  [`sys_pipe`](/source/xv6-riscv/kernel/sysfile.c.md) 调用 [[`pipealloc`](/source/xv6-riscv/kernel/defs.h.md)](source/xv6-riscv/kernel/pipe.c.md)，该函数会分配一个 `struct pipe` 和两个 `struct file`（一个可读，一个可写），并将它们都指向同一个 `struct pipe`。
    2.  `struct pipe` 包含一个固定大小的缓冲区 `data`，以及读写指针 `nread` 和 `nwrite`，并用一个锁 `lock` 来保护并发访问。
    3.  [[`piperead`](/source/xv6-riscv/kernel/defs.h.md)](source/xv6-riscv/kernel/pipe.c.md) 和 [[`pipewrite`](/source/xv6-riscv/kernel/defs.h.md)](source/xv6-riscv/kernel/pipe.c.md) 负责数据的读写。如果管道为空，[`piperead`](/source/xv6-riscv/kernel/defs.h.md) 会 [`sleep`](/source/xv6-riscv/user/user.h.md)；如果管道已满，[`pipewrite`](/source/xv6-riscv/kernel/defs.h.md) 会 [`sleep`](/source/xv6-riscv/user/user.h.md)。当另一端操作后，会调用 [`wakeup`](/source/xv6-riscv/kernel/defs.h.md) 唤醒对方。

## 1.6 实验要求：实现 [`pipe`](/source/xv6-riscv/user/user.h.md)

**目标**: 在 xv6 内核中实现 [`pipe`](/source/xv6-riscv/user/user.h.md) 系统调用以及相关的 [`read`](/source/xv6-riscv/user/user.h.md) 和 [`write`](/source/xv6-riscv/user/user.h.md) 功能。

**要求**:

1.  **创建 [`sys_pipe`](/source/xv6-riscv/kernel/sysfile.c.md)**: 在 [`kernel/syscall.c`](/source/xv6-riscv/kernel/syscall.c.md) 中添加 [`sys_pipe`](/source/xv6-riscv/kernel/sysfile.c.md) 的入口，并在 `sysproc.c` 中实现它。这个函数应该：
    *   接收一个指向用户空间整型数组的指针 (`int *p`)。
    *   调用 [`pipealloc`](/source/xv6-riscv/kernel/defs.h.md) 函数（需要你在 [`kernel/pipe.c`](/source/xv6-riscv/kernel/pipe.c.md) 中实现）。
    *   为管道的读端和写端分配文件描述符。
    *   将这两个文件描述符通过 [`copyout`](/source/xv6-riscv/user/usertests.c.md) 写回用户空间的数组 `p`。
2.  **实现 [`pipealloc`](/source/xv6-riscv/kernel/defs.h.md)**: 在 [`kernel/pipe.c`](/source/xv6-riscv/kernel/pipe.c.md) 中实现 [`pipealloc`](/source/xv6-riscv/kernel/defs.h.md) 函数。它需要：
    *   分配一个 `struct pipe` 结构体。
    *   调用 [`filealloc`](/source/xv6-riscv/kernel/file.c.md) 两次，为读端和写端分别分配一个 `struct file`。
    *   正确设置这两个 `struct file` 的类型（`FD_PIPE`）、权限（可读/可写）以及指向 `struct pipe` 的指针。
3.  **实现 [`pipeclose`](/source/xv6-riscv/kernel/defs.h.md)**: 在 [`kernel/pipe.c`](/source/xv6-riscv/kernel/pipe.c.md) 中实现 [`pipeclose`](/source/xv6-riscv/kernel/defs.h.md)。当管道的一端被关闭时，此函数被调用。
    *   它需要正确处理读端或写端关闭的情况。
    *   当两端都关闭时，释放 `struct pipe` 占用的内存。
    *   确保唤醒可能在另一端等待的进程。
4.  **实现 [`piperead`](/source/xv6-riscv/kernel/defs.h.md) 和 [`pipewrite`](/source/xv6-riscv/kernel/defs.h.md)**: 在 [`kernel/pipe.c`](/source/xv6-riscv/kernel/pipe.c.md) 中实现这两个函数。
    *   [`pipewrite`](/source/xv6-riscv/kernel/defs.h.md) 应将数据从用户空间复制到管道的循环缓冲区中。如果缓冲区已满，则进程应休眠。
    *   [`piperead`](/source/xv6-riscv/kernel/defs.h.md) 应将数据从管道的循环缓冲区复制到用户空间。如果缓冲区为空，则进程应休眠，直到有数据写入或写端被关闭。
    *   注意处理好并发控制（使用锁）和进程的休眠/唤醒。

**提示**:
*   参考 `file.c` 中对 `struct file` 的操作。
*   使用 [`sleep`](/source/xv6-riscv/user/user.h.md) 和 [`wakeup`](/source/xv6-riscv/kernel/defs.h.md) 来处理进程的阻塞和唤醒。
*   仔细管理 `struct pipe` 和 `struct file` 的引用计数和生命周期。

（**注意**: 本任务只要求理解并说明实验内容，无需提供具体代码实现。）