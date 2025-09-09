---
title: 页表
---

# 实验：页表

在这个实验中，你将探索页表并修改它们以实现常见的操作系统功能。

> 在开始编码之前，阅读 [xv6 书籍](/mit6.1810/xv6/book-riscv-rev4.pdf.md) 的第 3 章，以及相关文件：
>
> *   `kernel/memlayout.h`，它捕获了内存布局。
>
> *   `kernel/vm.c`，它包含大多数虚拟内存（VM）代码。
>
> *   `kernel/kalloc.c`，它包含分配和释放物理内存的代码。
>
> 查阅 [RISC-V 特权架构手册](https://drive.google.com/file/d/17GeetSnT5wW3xNuAHI95-SI1gPGd5sJ_/view?usp=drive_link) 也可能有帮助。

要开始实验，请切换到 pgtbl 分支：
```
$ git fetch
$ git checkout pgtbl
$ make clean
```

## 检查用户进程页表

为了帮助你理解 RISC-V 页表，你的第一个任务是解释用户进程的页表。

运行 `make qemu` 并运行用户程序 `pgtbltest`。`print_pgtbl` 函数使用我们为这个实验添加到 xv6 的 `pgpte` 系统调用打印出 `pgtbltest` 进程的前 10 页和后 10 页的页表条目。输出如下所示：
```
va 0 pte 0x21FCF45B pa 0x87F3D000 perm 0x5B
va 1000 pte 0x21FCE85B pa 0x87F3A000 perm 0x5B
...
va 0xFFFFD000 pte 0x0 pa 0x0 perm 0x0
va 0xFFFFE000 pte 0x21FD80C7 pa 0x87F60000 perm 0xC7
va 0xFFFFF000 pte 0x20001C4B pa 0x80007000 perm 0x4B
```

> 对于 `print_pgtbl` 输出中的每个页表条目，解释它在逻辑上包含什么以及它的权限位是什么。xv6 书籍中的图 3.4 可能有帮助，但请注意该图可能与这里检查的进程有略微不同的页面集。注意 xv6 不会将虚拟页面连续地放置在物理内存中。

## 加速系统调用

一些操作系统（例如，Linux）通过在用户空间和内核之间的只读区域共享数据来加速某些系统调用。这消除了执行这些系统调用时进行内核跨越的需要。为了帮助你学习如何在页表中插入映射，你的第一个任务是在 xv6 中为 `getpid()` 系统调用实现这种优化。

> 当每个进程创建时，在 USYSCALL（在 `memlayout.h` 中定义的虚拟地址）处映射一个只读页面。在此页面的开头，存储一个 `struct usyscall`（也在 `memlayout.h` 中定义），并初始化它以存储当前进程的 PID。对于这个实验，`ugetpid()` 已经在用户空间端提供，将自动使用 USYSCALL 映射。如果你的 `ugetpid` 测试用例在运行 `pgtbltest` 时通过，你将在此实验的这部分获得满分。

一些提示：
*   选择允许用户空间只读页面的权限位。
*   在新页面的生命周期中有几件事需要做。为了获得灵感，请理解 `kernel/proc.c` 中的 trapframe 处理。

> 哪些其他 xv6 系统调用可以通过这种共享页面变得更快？解释如何实现。

## 打印页表

为了帮助你可视化 RISC-V 页表，并且可能有助于未来的调试，你的下一个任务是编写一个打印页表内容的函数。

> 我们添加了一个系统调用 `kpgtbl()`，它调用 `vm.c` 中的 `vmprint()`。它接受一个 `pagetable_t` 参数，你的任务是以如下所述的格式打印该页表。

当你运行 `print_kpgtbl()` 测试时，你的实现应该打印以下输出：

```
page table 0x0000000087f22000
..0x0000000000000000: pte 0x0000000021fc7801 pa 0x0000000087f1e000
.. ..0x0000000000000000: pte 0x0000000021fc7401 pa 0x0000000087f1d000
.. .. ..0x0000000000000000: pte 0x0000000021fc7c5b pa 0x0000000087f1f000
.. .. ..0x0000000000001000: pte 0x0000000021fc70d7 pa 0x0000000087f1c000
.. .. ..0x0000000000002000: pte 0x0000000021fc6c07 pa 0x0000000087f1b000
.. .. ..0x0000000000003000: pte 0x0000000021fc68d7 pa 0x0000000087f1a000
..0xffffffffc0000000: pte 0x0000000021fc8401 pa 0x0000000087f21000
.. ..0xffffffffffe00000: pte 0x0000000021fc8001 pa 0x0000000087f20000
.. .. ..0xffffffffffffd000: pte 0x0000000021fd4c13 pa 0x0000000087f53000
.. .. ..0xffffffffffffe000: pte 0x0000000021fd00c7 pa 0x0000000087f40000
.. .. ..0xfffffffffffff000: pte 0x000000002000184b pa 0x0000000080006000
```

第一行显示传递给 `vmprint` 的参数。之后是每个 PTE 的一行，包括更深树中的页表页面的 PTE。每个 PTE 行由若干个 ` ..` 缩进，表示它在树中的深度。每个 PTE 行显示其虚拟地址、pte 位和从 PTE 中提取的物理地址。不要打印无效的 PTE。在上面的示例中，顶级页表页面有条目 0 和 255 的映射。下一级对于条目 0 只有索引 0 映射，而该索引 0 的底层有几个条目映射。

你的代码可能会输出与上面显示的不同物理地址。条目数量和虚拟地址应该相同。

一些提示：
*   使用文件 kernel/riscv.h 末尾的宏。
*   函数 [`freewalk`](/source/xv6-riscv/kernel/vm.c.md#freewalk-kernel-vm-c) 可能具有启发性。
*   在 printf 调用中使用 `%p` 以打印完整的 64 位十六进制 PTE 和地址，如示例中所示。

> 对于 `vmprint` 输出中的每个叶页面，解释它在逻辑上包含什么以及它的权限位是什么，以及它与上面 `print_pgtbl()` 练习输出的关系。xv6 书籍中的图 3.4 可能有帮助，但请注意该图可能与这里检查的进程有略微不同的页面集。

## 使用超级页

RISC-V 分页硬件支持 2MB 页面以及普通的 4096 字节页面。较大页面的通用概念称为超级页，（由于 RISC-V 支持多种大小）2M 页面称为兆页。操作系统通过在一级 PTE 中设置 PTE_V 和 PTE_R 位，并将物理页号设置为指向物理内存中 2MB 区域的开始来创建超级页。这个物理地址必须是 2MB 对齐的（即，2MB 的倍数）。你可以在 RISC-V 特权手册中搜索 megapage 和 superpage 来阅读相关内容；特别是第 112 页顶部。

使用超级页减少了页表使用的物理内存量，并可以减少 TLB 缓存中的未命中。对于某些程序，这会导致性能大幅提升。

> 你的任务是修改 xv6 内核以使用超级页。特别是，如果用户程序用 2MB 或更大的大小调用 sbrk()，并且新创建的地址范围包括一个或多个 2MB 对齐且至少 2MB 大小的区域，内核应使用单个超级页（而不是数百个普通页面）。如果你的 `superpg_test` 测试用例在运行 `pgtbltest` 时通过，你将在此实验的这部分获得满分。

一些提示：
*   阅读 `user/pgtbltest.c` 中的 `superpg_test`。
*   一个好的起点是 `kernel/sysproc.c` 中的 [`sys_sbrk`](/source/xv6-riscv/kernel/sysproc.c.md#sys_sbrk-kernel-sysproc-c)，它由 [`sbrk`](/source/xv6-riscv/user/usertests.c.md#sbrk-user-usertests-c) 系统调用调用。跟随代码路径到为 [`sbrk`](/source/xv6-riscv/user/usertests.c.md#sbrk-user-usertests-c) 分配内存的函数。
*   你的内核将需要能够分配和释放 2MB 区域。修改 kalloc.c 以预留一些 2MB 的物理内存区域，并创建 superalloc() 和 superfree() 函数。你只需要少量的 2MB 内存块。
*
    当具有超级页的进程 fork 时必须分配超级页，并在退出时释放；你需要修改 [`uvmcopy()`](/source/xv6-riscv/kernel/vm.c.md#uvmcopy-kernel-vm-c) 和 [`uvmunmap()`](/source/xv6-riscv/kernel/vm.c.md#uvmunmap-kernel-vm-c)。

真正的操作系统会动态地将页面集合提升为超级页。以下参考文献解释了为什么这是一个好主意以及在更严肃的设计中什么是困难的：[Juan Navarro, Sitaram Iyer, Peter Druschel, and Alan Cox. Practical, transparent operating system support for superpages. SIGOPS Oper. Syst. Rev., 36(SI):89-104, December 2002.](https://www.usenix.org/conference/osdi-02/practical-transparent-operating-system-support-superpages) 这个参考文献总结了不同操作系统的超级页实现：[A comprehensive analysis of superpage management mechanism and policies](https://www.usenix.org/conference/atc20/presentation/zhu-weixi)。

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

*   实现上述论文中的一些想法，使你的超级页设计更加真实。

*   取消映射用户进程的第一页，以便解引用空指针会导致故障。你将需要更改 `user.ld` 以在例如 4096 而不是 0 处开始用户文本段。

*   添加一个系统调用，使用 `PTE_D` 报告脏页面（修改过的页面）。