---
title: l-uservm.txt
---

6.1810 2024 第 16 讲：用户级虚拟内存

阅读：Appel & Li (1991) 的"用户程序的虚拟内存原语"

计划：
操作系统内核以创造性的方式使用虚拟内存
论文认为用户级应用程序也可以从 VM 中受益
并发垃圾收集器
代垃圾收集器
并发检查点
数据压缩分页
持久存储
大多数操作系统都有 mmap() 和用户级页面错误

什么是用户级 VM 原语？
Trap: 在用户模式下处理页面错误陷阱
Prot1: 降低页面的可访问性
ProtN: 降低 N 个页面的可访问性
Unprot: 增加页面的可访问性
Dirty: 返回自上次调用以来被修改的页面列表
Map2: 使用不同保护级别将相同的物理页面映射到两个不同的虚拟地址。

Xv6 不支持其中任何一个
一种看待这篇论文的方式是，一个好的操作系统应该支持它们
那么今天的 Unix 怎么样？

今天的 Unix：mmap()
将内存映射到地址空间（许多标志和选项）
示例：映射文件
mmap(NULL, len, PROT_READ|PROT_WRITE, MAP_PRIVATE, fd, offset)
示例：匿名内存
mmap(NULL, len, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)
（比 sbrk 更优选）

今天的 Unix：mprotect()
更改映射的权限
示例：
mprotect(addr, len, PROT_READ)
mprotect(addr, len, PROT_NONE)
在访问时会导致陷阱

今天的 Unix：munmap()
删除映射
示例：
munmap(addr, len)

今天的 Unix：sigaction()
配置信号处理程序
（想想 sigalarm() 实验）
act.sa_sigaction = handle_sigsegv;
act.sa_flags = SA_SIGINFO;
segemptyset(&act.sa_mask)
sigaction(SIGSEGV, &act, NULL);

额外的 Linux VM 调用
Madvise(), Mincore(), Mremap(), Msync(), Mlock(), Mbind(), Shmat(),..

VM 实现
地址空间由 VMA 和页表组成
VMA（虚拟内存区域）
虚拟地址的连续范围
相同权限
由同一对象支持（文件，匿名内存）
VMA 帮助内核决定如何处理页面错误

Trap/sigaction实现
PTE（或 TLB 条目）标记为"受保护"
CPU 保存用户状态，跳转到内核。
内核询问 VM 系统要做什么？
例如：从磁盘换入？核心转储？
VM 系统查看 VMA  
生成信号——对用户进程的向上调用。
在用户堆栈上降低，或在单独的堆栈上...
运行用户处理程序，可以做任何事情。
可能必须为引用的页面调用 UNPROT。
也就是说，必须避免重复错误。
用户处理程序返回到内核。
内核返回到用户程序。
继续或重新启动发生陷阱的指令。

我们可以支持用户级 VM 原语吗？
Trap: sigaction 和 SIGSEGV
Prot1: mprotect()
ProtN: mprotect()
Unprot: mprotect()
Dirty: 没有，但有变通方法
Map2: 不直接，但 shm_open/mmap/mmap

演示：由单个页面支持的大平方根表
应用程序代码认为有一个预计算的大表
n -> sqrt(n)
应用程序可以查找平方根：sqrts[n]
如果存在，则非常快！
表比物理内存大
用户级 VM 原语使其只占用一个页面

用例：并发 GC
应用程序分配内存并计算
应用程序被称为"mutator"
应用程序不必调用 free
（这容易出错，特别是在并发程序中）
收集器并发地找到空闲内存
应用程序不再使用的内存
无法从根指针或任何线程的寄存器访问
传统实现需要语言/编译器支持
检测加载/存储
用户级虚拟内存可以避免检测加载/存储
更快

示例：Baker 的实时 GC 算法（参见 baker.c 中的玩具版本）
https://dl.acm.org/citation.cfm?id=359460.359470
将堆分成 2 个区域：from-space 和 to-space
to-space 进一步分为：scanned, unscanned, 和 new
在收集开始时：所有对象都在 from-space 中
将根复制到 to-space（寄存器和堆栈）
在 from-space 中放置转发指针到 to-space 副本
在扫描结束时，from-space 是空闲内存
不必为 GC 停止整个世界
在每次分配时做一些扫描
或在取消 from-space 中指针的引用时

观察
为什么有吸引力？
分配很便宜。压缩，所以没有空闲列表。
增量：每次分配扫描/复制一点
这是"实时"方面
成本是什么？
指针在 from-space 中吗？（如果是，需要复制）
需要对每次取消引用进行测试和分支
很难同时运行收集器和程序
收集器跟踪堆和程序线程之间的竞争条件
风险：同一对象的两个副本

解决方案：让应用程序使用 VM
https://dl.acm.org/doi/10.1145/53990.53992
避免对应用程序线程中的引用进行显式检查
在复制根之后，取消映射 to-space 的未扫描部分
最初是带有根等的页面
线程访问未扫描区域时的页面错误
处理程序只扫描页面并检查所有对象，然后 UNPROT
每页最多一个错误
无需编译器更改
易于并发
收集器线程可以与应用程序线程并发运行
收集器线程可以在扫描后 UNPROT 页面
仅需同步的是哪个线程正在扫描哪个页面

现有的 VM 原语对并发 GC 足够好吗？
MAP2 是唯一功能问题
可以使用 shm_open 和在不同地址映射对象来绕过
陷阱等够快吗？
他们说否：扫描一页需要 500 微秒，获取陷阱需要 1200 微秒。
为什么不扫描 3 页？
使用检查运行 Baker 的实际算法慢多少？
VM 版本可能更快！即使有慢陷阱。
关于 2 号 CPU 扫描节省的时间怎么样？他们没有计算这个。
并发 GC 的错误发生频率是问题吗？
不是真的——更多错误意味着更多扫描。
即。我们将得到<=每页一个错误，最多。

测量
Sun3/60: 2080/0.12, 17333 次添加

i7-8550U CPU @ 1.80GHz (kaby lake), Linux 6.0.7
我笔记本电脑上 sqrts.c 中的一次错误是 5.4 微秒（无平方根）
在 2.4GHz 下一次添加约 0.417 纳秒；因此，约 12980 次添加
使用性能策略
2024: 1000 次 nfault 为 10233 微秒，Linux 6.11.6
1.2 GHz Athlon, FreeBSD 4.3. 对于 trap, unprot, prot。
12 微秒

用户级 VM 是个好主意吗？
大多数用例可以通过添加指令来实现
例如，在引用时在应用程序线程中检查
优点：
避免编译器更改
CPU 提供 VM 支持
缺点：
需要操作系统支持，和高效支持
大多数操作系统内核无法暴露分页的原始硬件性能
操作系统施加了很多抽象

1991 年到 2022 年之间发生了什么变化？
VM API 和实现的大量变化
VM 系统持续发展
持续研究（例如，参见 OSDI 2020）
其他原语
mlock, munlock, madvise, mremap, mincore,...
切换地址空间是免费的（标记 TLB）
扩展地址可用性不再重要
2^52 字节的虚拟地址空间