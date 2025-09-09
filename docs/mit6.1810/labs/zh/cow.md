---
title: cow
---

# 实验：xv6 的写时复制 Fork

虚拟内存提供了一定程度的间接性：内核可以通过将 PTE 标记为无效或只读来拦截内存引用，导致页面错误，并可以通过修改 PTE 来改变地址的含义。在计算机系统中有一句话说，任何系统问题都可以通过增加一层间接性来解决。这个实验探讨了一个例子：写时复制 fork。

要开始实验，请切换到 cow 分支：
```
$ git fetch
$ git checkout cow
$ make clean
```

## 问题

xv6 中的 fork() 系统调用将父进程的所有用户空间内存复制到子进程中。如果父进程很大，复制可能需要很长时间。更糟糕的是，这项工作通常是浪费的：fork() 通常在子进程中跟着 exec()，这会丢弃复制的内存，通常不会使用大部分内存。另一方面，如果父进程和子进程都使用复制的页面，并且一个或两个都写入它，那么复制是真正需要的。

## 解决方案

你在实现写时复制 (COW) fork() 中的目标是推迟分配和复制物理内存页面，直到实际需要副本为止（如果需要的话）。

COW fork() 只为子进程创建一个页表，其中用户内存的 PTE 指向父进程的物理页面。COW fork() 将父进程和子进程中所有用户 PTE 标记为只读。当任一进程尝试写入这些 COW 页面时，CPU 将强制产生页面错误。内核页面错误处理程序检测到这种情况，为错误进程分配一个物理内存页面，将原始页面复制到新页面，并在错误进程的相关 PTE 中修改以引用新页面，这次 PTE 标记为可写。当页面错误处理程序返回时，用户进程将能够写入其页面副本。

COW fork() 使释放实现用户内存的物理页面变得更加棘手。一个物理页面可能被多个进程的页表引用，只有在最后一个引用消失时才应释放。在像 xv6 这样的简单内核中，这种簿记相对简单，但在生产内核中这可能很难做对；例如，参见 [Patching until the COWs come home](https://lwn.net/Articles/849638/)。

## 实现写时复制 fork

> 你的任务是在 xv6 内核中实现写时复制 fork。如果你修改的内核成功执行了 cowtest 和 'usertests -q' 程序，你就完成了。

为了帮助你测试实现，我们提供了一个名为 cowtest 的 xv6 程序（源代码在 user/cowtest.c 中）。cowtest 运行各种测试，但即使第一个测试在未修改的 xv6 上也会失败。因此，最初你会看到：

```
$ cowtest
simple: fork() failed
$ 
```

"simple" 测试分配了超过一半的可用物理内存，然后进行 fork()。fork 失败是因为没有足够的空闲物理内存来给子进程提供父进程内存的完整副本。

完成后，你的内核应该通过 cowtest 和 usertests -q 中的所有测试。即：

```
$ cowtest
simple: ok
simple: ok
three: ok
three: ok
three: ok
file: ok
forkfork: ok
ALL COW TESTS PASSED
$ usertests -q
...
ALL TESTS PASSED
$
```

这是一个合理的攻击计划。

1.  修改 [`uvmcopy()`](/source/xv6-riscv/kernel/vm.c.md#uvmcopy-kernel-vm-c) 以将父进程的物理页面映射到子进程中，而不是分配新页面。清除父子进程中具有 `PTE_W` 设置的页面的 `PTE_W`。

2.  修改 [`usertrap()`](/source/xv6-riscv/kernel/trap.c.md#usertrap-kernel-trap-c) 以识别页面错误。当在原本可写的 COW 页面上发生写页面错误时，使用 [`kalloc()`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 分配一个新页面，将旧页面复制到新页面，并在 PTE 中安装新页面，设置 `PTE_W`。
    原本只读的页面（未映射 `PTE_W`，如文本段中的页面）应保持只读并在父子进程之间共享；尝试写入此类页面的进程应被杀死。

3.  确保当最后一个 PTE 引用消失时释放每个物理页面——但不能在此之前。
    一个好的方法是为每个物理页面保留一个"引用计数"，即引用该页面的用户页表的数量。
    当 [`kalloc()`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 分配页面时，将页面的引用计数设置为一。
    当 fork 导致子进程共享页面时，增加页面的引用计数，
    每次任何进程从其页表中删除页面时，减少页面的计数。
    `kfree()` 只有在引用计数为零时才应将页面放回空闲列表。
    在固定大小的整数数组中保存这些计数是可以的。
    你必须制定一个方案来索引数组和选择其大小。
    例如，你可以用页面的物理地址除以 4096 来索引数组，
    并给数组的元素数量等于 [`kinit()`](/source/xv6-riscv/kernel/kalloc.c.md#kinit-kernel-kalloc-c) 在 kalloc.c 中放入空闲列表的任何页面的最高物理地址。
    随意修改 kalloc.c（例如，[`kalloc()`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 和 `kfree()`）以维护引用计数。

4.  修改 [`copyout()`](/source/xv6-riscv/user/usertests.c.md#copyout-user-usertests-c) 以在遇到 COW 页面时使用与页面错误相同的方案。

一些提示：

*   记录每个 PTE 是否是 COW 映射可能很有用。你可以使用 RISC-V PTE 中的 RSW（为软件保留）位来实现这一点。

*   `usertests -q` 探索了 `cowtest` 没有测试的场景，所以不要忘记检查两者的所有测试是否都通过。

*   页表标志的一些有用宏和定义在 `kernel/riscv.h` 的末尾。

*   如果发生 COW 页面错误且没有空闲内存，进程应被杀死。
  
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

*   测量你的 COW 实现减少的 xv6 复制字节数和分配的物理页面数。
    找到并利用进一步减少这些数字的机会。