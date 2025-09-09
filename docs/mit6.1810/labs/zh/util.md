---
title: 实用程序
---

# 实验：Xv6 和 Unix 实用程序

本实验将让你熟悉 xv6 及其系统调用。

## 启动 xv6

查看 [实验工具页面](/mit6.1810/labs/tools.html.md) 获取如何设置计算机运行这些实验的信息。

获取实验的 xv6 源代码的 git 仓库：
```
$ git clone git://g.csail.mit.edu/xv6-labs-2024
Cloning into 'xv6-labs-2024'...
...
$ cd xv6-labs-2024
```

这些实验所需的文件使用 [Git](http://www.git-scm.com/) 版本控制系统分发。对于每个实验，你将检出针对该实验定制的 xv6 版本。要了解更多关于 Git 的信息，请查看 [Git 用户手册](http://www.kernel.org/pub/software/scm/git/docs/user-manual.html) 或这个 [面向计算机科学家的 Git 概述](http://eagain.net/articles/git-for-computer-scientists/)。Git 允许你跟踪对代码所做的更改。例如，如果你完成了一个练习并想检查点你的进度，你可以通过运行以下命令来*提交*你的更改：
```
$ git commit -am 'my solution for util lab exercise 1'
Created commit 60d2135: my solution for util lab exercise 1
 1 files changed, 1 insertions(+), 0 deletions(-)
$
```

你可以使用 `git diff` 查看你的更改，它会显示自上次提交以来的更改。`git diff origin/util` 显示相对于初始 `util` 代码的更改。`origin/util` 是这个实验的 git 分支名称。

构建并运行 xv6：
```
$ make qemu
riscv64-unknown-elf-gcc    -c -o kernel/entry.o kernel/entry.S
riscv64-unknown-elf-gcc -Wall -Werror -O -fno-omit-frame-pointer -ggdb -DSOL_UTIL -MD -mcmodel=medany -ffreestanding -fno-common -nostdlib -mno-relax -I. -fno-stack-protector -fno-pie -no-pie   -c -o kernel/start.o kernel/start.c
...
riscv64-unknown-elf-ld -z max-page-size=4096 -N -e main -Ttext 0 -o user/_zombie user/zombie.o user/ulib.o user/usys.o user/printf.o user/umalloc.o
riscv64-unknown-elf-objdump -S user/_zombie > user/zombie.asm
riscv64-unknown-elf-objdump -t user/_zombie | sed '1,/SYMBOL TABLE/d; s/ .* / /; /^$/d' > user/zombie.sym
mkfs/mkfs fs.img README  user/xargstest.sh user/_cat user/_echo user/_forktest user/_grep user/_init user/_kill user/_ln user/_ls user/_mkdir user/_rm user/_sh user/_stressfs user/_usertests user/_grind user/_wc user/_zombie
nmeta 46 (boot, super, log blocks 30 inode blocks 13, bitmap blocks 1) blocks 954 total 1000
balloc: first 591 blocks have been allocated
balloc: write bitmap block at sector 45
qemu-system-riscv64 -machine virt -bios none -kernel kernel/kernel -m 128M -smp 3 -nographic -drive file=fs.img,if=none,format=raw,id=x0 -device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0

xv6 kernel is booting

hart 2 starting
hart 1 starting
init: starting sh
$
```

如果你在提示符下输入 [`ls`](/source/xv6-riscv/user/ls.c.md#ls-user-ls-c)，你应该看到类似于以下的输出：
```
$ ls
.              1 1 1024
..             1 1 1024
README         2 2 2227
xargstest.sh   2 3 93
cat            2 4 32864
echo           2 5 31720
forktest       2 6 15856
grep           2 7 36240
init           2 8 32216
kill           2 9 31680
ln             2 10 31504
ls             2 11 34808
mkdir          2 12 31736
rm             2 13 31720
sh             2 14 54168
stressfs       2 15 32608
usertests      2 16 178800
grind          2 17 47528
wc             2 18 33816
zombie         2 19 31080
console        3 20 0
```
这些是 `mkfs` 包含在初始文件系统中的文件；大多数是你可运行的程序。你刚运行了其中一个：[`ls`](/source/xv6-riscv/user/ls.c.md#ls-user-ls-c)。

xv6 没有 `ps` 命令，但是如果你输入 `Ctrl-p`，内核将打印有关每个进程的信息。如果你现在尝试，你会看到两行：一行用于 `init`，一行用于 `sh`。

要退出 qemu 输入：`Ctrl-a x`（同时按 `Ctrl` 和 `a`，然后按 `x`）。

## sleep

> 为 xv6 实现一个用户级的 [`sleep`](/source/xv6-riscv/user/usertests.c.md#sleep-user-usertests-c) 程序，类似于 UNIX sleep 命令。你的 [`sleep`](/source/xv6-riscv/user/usertests.c.md#sleep-user-usertests-c) 应该暂停用户指定的 ticks 数量。tick 是 xv6 内核定义的时间概念，即定时器芯片两次中断之间的时间。你的解决方案应该在文件 `user/sleep.c` 中。

一些提示：
*   在开始编码之前，阅读 [xv6 书籍](/mit6.1810/xv6/book-riscv-rev4.pdf.md) 的第 1 章。

*   将你的代码放在 `user/sleep.c` 中。查看 `user/` 中的一些其他程序（例如，`user/echo.c`、`user/grep.c` 和 `user/rm.c`）以了解如何将命令行参数传递给程序。

*   将你的 [`sleep`](/source/xv6-riscv/user/usertests.c.md#sleep-user-usertests-c) 程序添加到 Makefile 中的 `UPROGS`；一旦你这样做了，`make qemu` 将编译你的程序，你将能够从 xv6 shell 运行它。

*   如果用户忘记传递参数，sleep 应该打印一条错误消息。

*   命令行参数作为字符串传递；你可以使用 [`atoi`](/source/xv6-riscv/user/ulib.c.md#atoi-user-ulib-c) 将其转换为整数（参见 user/ulib.c）。

*   使用系统调用 [`sleep`](/source/xv6-riscv/user/usertests.c.md#sleep-user-usertests-c)。

*   查看 `kernel/sysproc.c` 获取实现 [`sleep`](/source/xv6-riscv/user/usertests.c.md#sleep-user-usertests-c) 系统调用的 xv6 内核代码（查找 [`sys_sleep`](/source/xv6-riscv/kernel/sysproc.c.md#sys_sleep-kernel-sysproc-c)），`user/user.h` 获取可从用户程序调用的 [`sleep`](/source/xv6-riscv/user/usertests.c.md#sleep-user-usertests-c) 的 C 定义，以及 `user/usys.S` 获取从用户代码跳转到内核的汇编代码以进行 [`sleep`](/source/xv6-riscv/user/usertests.c.md#sleep-user-usertests-c)。

*   sleep 的 [`main`](/source/xv6-riscv/user/zombie.c.md#main-user-zombie-c) 应该在完成后调用 `exit(0)`。

*   查看 Kernighan 和 Ritchie 的书籍 *The C programming language (second edition)* (K&R) 来学习 C。

从 xv6 shell 运行程序：
```
$ make qemu
...
init: starting sh
$ sleep 10
(一段时间内什么都不会发生)
$
```
当如上所示运行时，你的程序应该暂停。在命令行中（在 qemu 外部）运行 `make grade` 来查看你是否通过了 sleep 测试。

请注意 `make grade` 运行所有测试，包括下面任务的测试。如果你想为一个任务运行等级测试，输入：
```
$ ./grade-lab-util sleep
```
这将运行匹配 "sleep" 的等级测试。或者，你可以输入：
```
$ make GRADEFLAGS=sleep grade
```
这会做同样的事情。

## pingpong

> 编写一个用户级程序，使用 xv6 系统调用通过一对管道在两个进程之间"乒乓"一个字节，每个方向一个管道。父进程应该向子进程发送一个字节；子进程应该打印 "`<pid>`: received ping"，其中 `<pid>` 是它的进程 ID，在管道上向父进程写入字节，然后退出；父进程应该从子进程读取字节，打印 "`<pid>`: received pong"，然后退出。你的解决方案应该在文件 `user/pingpong.c` 中。

一些提示：
*   将程序添加到 Makefile 中的 `UPROGS`。
*   你需要使用 `pipe`、[`fork`](/source/xv6-riscv/kernel/proc.c.md#fork-kernel-proc-c)、[`write`](/source/xv6-riscv/user/usertests.c.md#write-user-usertests-c)、[`read`](/source/xv6-riscv/kernel/console.c.md#read-kernel-console-c) 和 `getpid` 系统调用。
*   xv6 上的用户程序有一组有限的库函数可用。你可以在 `user/user.h` 中看到列表；源代码（除了系统调用）在 `user/ulib.c`、`user/printf.c` 和 `user/umalloc.c` 中。

从 xv6 shell 运行程序，它应该产生以下输出：
```
$ make qemu
...
init: starting sh
$ pingpong
4: received ping
3: received pong
$
```
你的程序应该在两个进程之间交换一个字节，并产生如上所示的输出。运行 `make grade` 进行检查。

## primes

> 使用管道为 xv6 编写一个并发素数筛选器程序，使用 [此页面](http://swtch.com/~rsc/thread/) 中间位置的图片和周围文本中说明的设计。这个想法归功于 Unix 管道的发明者 Doug McIlroy。你的解决方案应该在文件 `user/primes.c` 中。

你的目标是使用 `pipe` 和 [`fork`](/source/xv6-riscv/kernel/proc.c.md#fork-kernel-proc-c) 来设置管道。第一个进程将数字 2 到 280 输入到管道中。对于每个素数，你将安排创建一个进程，该进程从其左侧邻居通过管道读取，并通过另一个管道向其右侧邻居写入。由于 xv6 的文件描述符和进程数量有限，第一个进程可以在 280 处停止。

一些提示：
*   要小心关闭进程不需要的文件描述符，因为否则你的程序会在第一个进程到达 280 之前耗尽 xv6 的资源。

*   一旦第一个进程到达 280，它应该等待直到整个管道终止，包括所有子进程、孙进程等。因此，主要的 primes 进程应该只在所有输出都已打印并且所有其他 primes 进程都已退出后才退出。

*   提示：当管道的写入端关闭时，[`read`](/source/xv6-riscv/kernel/console.c.md#read-kernel-console-c) 返回零。

*   直接写入 32 位（4 字节）`int` 到管道中是最简单的，而不是使用格式化的 ASCII I/O。

*   你应该只在需要时创建管道中的进程。

*   将程序添加到 Makefile 中的 `UPROGS`。

*   如果编译器对函数 `primes` 出现无限递归错误，你可能需要声明 `void primes(int) __attribute__((noreturn));` 来指示 `primes` 不返回。

你的解决方案应该实现一个基于管道的筛选器，并产生以下输出：
```
$ make qemu
...
init: starting sh
$ primes
prime 2
prime 3
prime 5
prime 7
prime 11
prime 13
prime 17
prime 19
prime 23
prime 29
prime 31
...
$
```

## find

> 为 xv6 编写一个简单版本的 UNIX find 程序：查找具有特定名称的目录树中的所有文件。你的解决方案应该在文件 `user/find.c` 中。

一些提示：
*   查看 user/ls.c 了解如何读取目录。
*   使用递归允许 find 递归到子目录中。
*   不要递归到 "." 和 ".."。
*   对文件系统的更改在 qemu 的运行之间持续存在；要获得干净的文件系统，请运行 `make clean` 然后运行 `make qemu`。
*   你需要使用 C 字符串。查看 K&R（C 书籍），例如第 5.5 节。
*   注意 == 不像在 Python 中那样比较字符串。使用 strcmp() 代替。
*   将程序添加到 Makefile 中的 `UPROGS`。

你的解决方案应该产生以下输出（当文件系统包含文件 `b`、`a/b` 和 `a/aa/b` 时）：
```
$ make qemu
...
init: starting sh
$ echo > b
$ mkdir a
$ echo > a/b
$ mkdir a/aa
$ echo > a/aa/b
$ find . b
./b
./a/b
./a/aa/b
$
```

运行 `make grade` 查看我们的测试结果。

## xargs

> 为 xv6 编写一个简单版本的 UNIX xargs 程序：其参数描述要运行的命令，它从标准输入读取行，并为每一行运行命令，将该行附加到命令的参数中。你的解决方案应该在文件 `user/xargs.c` 中。

以下示例说明了 xargs 的行为：
```
$ echo hello too | xargs echo bye
bye hello too
$
```
注意这里的命令是 "echo bye"，附加的参数是 "hello too"，使得命令变为 "echo bye hello too"，输出 "bye hello too"。

请注意，UNIX 上的 xargs 进行了一种优化，它会一次将多个参数提供给命令。我们不期望你进行这种优化。要使 UNIX 上的 xargs 按照我们希望的方式运行，请使用 -n 选项设置为 1 运行。例如
```
$ (echo 1 ; echo 2) | xargs -n 1 echo
1
2
$
```

一些提示：
*   使用 [`fork`](/source/xv6-riscv/kernel/proc.c.md#fork-kernel-proc-c) 和 [`exec`](/source/xv6-riscv/user/usertests.c.md#exec-user-usertests-c) 在输入的每一行上调用命令。在父进程中使用 [`wait`](/source/xv6-riscv/kernel/proc.c.md#wait-kernel-proc-c) 等待子进程完成命令。
*   要读取单行输入，请一次读取一个字符，直到出现换行符（'\n'）。
*   kernel/param.h 声明了 MAXARG，如果你需要声明 argv 数组，这可能很有用。
*   将程序添加到 Makefile 中的 `UPROGS`。
*   对文件系统的更改在 qemu 的运行之间持续存在；要获得干净的文件系统，请运行 `make clean` 然后运行 `make qemu`。

xargs、find 和 grep 结合得很好：
```
$ find . b | xargs grep hello
```
将在 "." 目录下的每个名为 b 的文件上运行 "grep hello"。

要测试你的 xargs 解决方案，请运行 shell 脚本 xargstest.sh。你的解决方案应该产生以下输出：
```
$ make qemu
...
init: starting sh
$ sh < xargstest.sh
$ $ $ $ $ $ hello
hello
hello
$ $
```
你可能需要回去修复 find 程序中的错误。输出中有许多 `$` 是因为 xv6 shell 没有意识到它正在处理来自文件而不是控制台的命令，并且为文件中的每个命令打印一个 `$`。

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

*   编写一个 uptime 程序，使用 `uptime` 系统调用以 ticks 形式打印正常运行时间。
      
*   在 find 的名称匹配中支持正则表达式。`grep.c` 对正则表达式有一些基本支持。
      
*   xv6 shell（`user/sh.c`）只是另一个用户程序。它缺少真实 shell 中的许多功能，但你可以修改和改进它。例如，修改 shell 使其在处理来自文件的 shell 命令时不打印 `$`，修改 shell 以支持 wait，修改 shell 以支持制表符补全，修改 shell 以保持传递的 shell 命令历史记录，或者任何你希望你的 shell 做的其他事情。（如果你非常有雄心，你可能需要修改内核以支持你需要的内核功能；xv6 不支持太多。）
```