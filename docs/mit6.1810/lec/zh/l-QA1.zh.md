---
title: l-QA1
---

6.1810 2022 第 8 讲：问答；
计划：回答你的问题
方法：逐步演示工作人员解决方案
从 pgtbl 实验开始，因为它是最难的
你的问题在文件底部

time.txt:
Lab util
总提交：129，有效提交：125
平均分：8.8，中位数：8.0，标准差：3.79

Lab syscall
总提交：123，有效提交：121
平均分：7.1，中位数：6.0，标准差：3.02

Lab pgtbl
总提交：94，有效提交：90
平均分：12.5，中位数：12.0，标准差：5.11

Pgtbl 实验评论
传统上是一个困难的实验
几行代码，但难以调试的错误
- 最坏情况：qemu/xv6 停止运行
- "最好"情况：内核恐慌
难以调试：设置中的一个小错误可能直到相关页面被使用才暴露
这个实验中的错误主要是恐慌
在后续实验中错误可能更微妙，当页面错误改变页表时
对工作人员也难以调试
- 可能的原因有很多

=== ugetpid() ===
目标：避免内核转换
想法：将内核状态暴露给用户空间
用 USYSCALL 扩充用户空间图
哪些系统调用可以加速？（参见 kernel/syscall.h）
我们可以将写入内核状态的系统调用移到用户空间吗？
我们可以将读取与其他进程相关的内核状态的系统调用移到用户空间吗？
候选者：
getpid()
uptime()
fstate()? 可能，但状态太多？

演示
pgtbltest.c
ulib.c
kernel/memlayout.h
kernel/proc.c: proc_pagetable() freeproc()

Linux 有 vDSO (https://lwn.net/Articles/615809/)
vDSO: 虚拟动态共享对象
cat /proc//maps
只读，共享内存区域
vdso 库映射到每个用户程序
库解释共享区域中的数据
示例定时器测量
内核将时间发布到共享区域
vDSO 代码将 TSC 添加到最新时间
使用 vDSO（虚拟系统调用）实现的调用
clock_gettime(), getcpu(), getpid(), getppid(), gettimeofday(), set_tid_address()

=== 超页 ===
目标：更有效地使用 TLB
内存大小在增加但 TLB 容量不增加
常规页面大小从 4KB 到 64KB？
导致许多部分使用的常规页面
通常称为"内部碎片"
想法：有不同的页面大小（例如，4KB，2MB，1G）
对应页表中的级别
何时级别 PTE 是叶子而不是指向下一级别的指针？
risc-v: 当 PTE 权限设置时（参见 kernel/riscv.h）

值得吗？
https://www.usenix.org/conference/osdi-02/practical-transparent-operating-system-support-superpages
https://www.usenix.org/system/files/login/articles/login_fall20_05_zhu.pdf
https://www.usenix.org/system/files/atc20-zhu-weixi_0.pdf

实验练习
探索为超页编程页表硬件
针对一个测试用例
忽略现实世界问题（见下文）

如何开始？
阅读测试用例
阅读相关文件（vm.c 和 kalloc.c）
考虑整体设计但以最小步骤实现（"偷懒"）
如果遇到错误，可以撤销最后的小步骤
[git checkout student repo and modified it ]

测试用例
grade-lab-pgtbl
test_superpg_
test_usertests 1 sbrk of 8MB 1 fork

从简单开始：通过第一个 supercheck
supercheck 检查什么？
sbrk 最多需要 4 个超页
在 sbrk(N) 之后添加 kptbl()
我们想要转换为超页的条目是什么？
kalloc.c 在 freerange() 中预留几个区域
我们可以集成 kallocn 和 kalloc 吗？
uvmalloc() uvmallocn
为什么 mset 很重要？
walkallocn
我们可以集成 walkallocn 和 walk() 吗？
为什么设置权限位？
运行测试；查看 pgtbl 输出
我们得到了 3 个超页！
但第二个 supercheck 失败，内核在 uvmunmap 处恐慌
让我们先修复恐慌
恐慌在告诉我们什么？
fork uvmcopy() uvmcopyn()

现实世界：
目标：OS 透明地使用超页
挑战：在超页和常规页之间动态切换
分配：在页面错误时分配超页或常规页？
预留 vs 复制？
碎片：主动分页出物理内存以避免碎片
但代价是额外的磁盘读取
提升：增量收集几个常规页到超页
更新页表
但也许只有超页的部分会被使用

=== 问题 ===
你能解释为什么我们的实验的超页实现可以"更真实"吗？谢谢。

为什么我们不需要修改 uvmdealloc 来处理超页实验？

表示空闲内存的替代方法是什么？这些替代方法比存储为链表有什么优势？

页面硬件如何跟踪脏页？分页硬件如何准确跟踪脏页？

页表实验的设计选择是什么？

为什么页表是 3 级，如何在我们的实现中集成 TLB？

实践中如何决定超页和常规页之间的平衡？

对于这个实验，只有几个超页就足够了，但实践中是否需要来回切换？

你能解释不同 pte 位在超页和 vmprint 作业上下文中的作用吗？我理解页表的一般概念，但位和 PA VA 转换让我困惑。

同样，我想了解一些关于如何处理实验室的提示。

我发现 OS 中的一些文件没有太多介绍，有时发现自己在猜测和检查然后完成作业。最好有关于 OS 一般结构的入门指南，帮助我更好地导航它。

为什么 xv6 中有些文件是汇编写的，有些是 C 写的？

需要哪种语言的约束，才能让我们用一种语言而不是另一种语言写文件？

你能解释更多关于 superwalk() 以及它与页表二级和一级的关系，以及 supermappage() 如何也利用页表的级别？

关于 pgtbl 的加速系统调用，关于"哪些其他 xv6 系统调用可以使用这个共享页加速？"这个问题，有什么需要考虑的见解？

当进程想要释放一页内存但当前有一个超页内存时，正确的处理方式是什么？是否应该分裂超页并复制到许多常规页？

在 pgtbl 实验中，我注意到 uvmunmap 有 for 循环[for(a = va; a < va ++ npages*PGSIZE; a += sz)]，我甚至在包含超页的情况后也不需要更改。我很困惑为什么在超页比常规页大得多时，我不需要修改此循环的上界。这是因为测试用例没有到达循环的末尾吗？

为什么不需要为超页调用 uvmdealloc？

对于 pgtbl 第 1 题，除了理解权限（有效、可读、可执行、用户），还有其他可以推断的吗？我们如何知道它在逻辑上包含什么？