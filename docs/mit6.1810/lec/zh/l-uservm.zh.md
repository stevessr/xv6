---
title: 第5讲：用户态虚拟内存
---

6.1810 2024 第16讲：用户态虚拟内存

**阅读材料**: Appel & Li (1991) 的《用户程序的虚拟机原语》(VM primitives for user programs)

**本讲计划:**
- 操作系统内核以创造性的方式使用虚拟内存
- 论文认为，用户级应用程序也可以从虚拟内存中受益
  - 并发垃圾回收 (Concurrent garbage collector)
  - 分代垃圾回收 (Generation garbage collector)
  - 并发检查点 (Concurrent check-pointing)
  - 数据压缩分页 (Data-compression paging)
  - 持久化存储 (Persistent stores)
- 大多数操作系统都有 `mmap()` 和用户级页错误处理机制

**需要哪些用户级虚拟内存原语？**
- `Trap`: 在用户模式下处理页错误陷阱
- `Prot1`: 降低一个页面的可访问性
- `ProtN`: 降低N个页面的可访问性
- `Unprot`: 提高一个页面的可访问性
- `Dirty`: 返回自上次调用以来被弄脏的页面列表
- `Map2`: 将同一个物理页面映射到两个不同的虚拟地址（VA），并具有不同的保护级别

Xv6 一个都不支持。
可以认为，这篇论文的观点之一就是一个好的操作系统应该支持这些原语。
那么今天的 Unix 系统怎么样呢？

**今天的 Unix: `mmap()`**
- 将内存映射到地址空间（有许多标志和选项）
- 示例：映射文件
  `mmap(NULL, len, PROT_READ|PROT_WRITE, MAP_PRIVATE, fd, offset)`
- 示例：匿名内存
  `mmap(NULL, len, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)`
  (比 `sbrk` 更受推荐)

**今天的 Unix: `mprotect()`**
- 更改一个映射的权限
- 示例：
  `mprotect(addr, len, PROT_READ)`
  `mprotect(addr, len, PROT_NONE)`
- 访问时会产生一个陷阱

**今天的 Unix: `munmap()`**
- 移除一个映射
- 示例：
  `munmap(addr, len)`

**今天的 Unix: `sigaction()`**
- 配置一个信号处理器
- (回想一下 `sigalarm()` 实验)
  `act.sa_sigaction = handle_sigsegv;`
  `act.sa_flags = SA_SIGINFO;`
  `segemptyset(&act.sa_mask)`
  `sigaction(SIGSEGV, &act, NULL);`

**其他 Linux 虚拟内存调用**
`Madvise()`, `Mincore()`, `Mremap()`, `Msync()`, `Mlock()`, `Mbind()`, `Shmat()`, ...

**虚拟内存实现**
- 地址空间由 VMA (虚拟内存区域) 和页表组成
- **VMA (virtual memory area)**
  - 连续的虚拟地址范围
  - 具有相同的权限
  - 由同一个对象（文件、匿名内存）支持
- VMA 帮助内核决定如何处理页错误

**Trap/sigaction 实现**
1.  PTE (或 TLB 条目) 被标记为“受保护”
2.  CPU 保存用户状态，跳转到内核。
3.  内核询问虚拟内存系统该怎么做？
    - 例如，从磁盘换入页面？还是核心转储 (Core dump)？
4.  虚拟内存系统查看 VMA
5.  生成信号 —— 对用户进程进行一次“上行调用 (upcall)”。
    - 在用户栈的较低位置，或在一个单独的栈上...
6.  运行用户处理器，它可以做任何事情。
    - 很可能必须为被引用的页面调用 `UNPROT`。
    - 也就是说，必须避免重复的错误。
7.  用户处理器返回到内核。
8.  内核返回到用户程序。
9.  继续或重新启动触发陷阱的指令。

**我们能支持这些用户级虚拟内存原语吗？**
- `Trap`: `sigaction` 和 `SIGSEGV`
- `Prot1`: `mprotect()`
- `ProtN`: `mprotect()`
- `Unprot`: `mprotect()`
- `Dirty`: 不直接支持，但有变通方法
- `Map2`: 不直接支持，但可以通过 `shm_open/mmap/mmap` 实现

**演示：由单个页面支持的大型平方根表**
- 应用程序代码认为有一个预先计算好的大表 `n -> sqrt(n)`
- 应用程序可以查找平方根: `sqrts[n]`
- 如果存在，速度非常快！
- 表比物理内存大
- 用户级虚拟内存原语允许它只占用*一个*页面

**用例：并发垃圾回收 (Concurrent GC)**
- 应用程序分配内存并用它进行计算
- 应用程序被称为“修改者 (mutator)”
- 应用程序不必调用 `free` (这很容易出错，尤其是在并发程序中)
- 回收器 (Collector) 并发地寻找空闲内存
  - 应用程序不再使用的内存
  - 从任何线程的根指针或寄存器都无法访问的内存
- 传统实现需要语言/编译器支持
  - 对加载/存储操作进行插桩 (Instrument)
- 用户级虚拟内存可以避免对加载/存储进行插桩
  - 速度更快

**示例：Baker 的实时 GC 算法 (见 baker.c 中的玩具版本)**
https://dl.acm.org/citation.cfm?id=359460.359470
- 将堆分成两个区域：from-space 和 to-space
- to-space 进一步分为：已扫描 (scanned)、未扫描 (unscanned) 和新建 (new)
- 回收开始时：所有对象都在 from-space
- 将根 (roots) 复制到 to-space (寄存器和栈)
- 在 from-space 中放置指向 to-space 副本的转发指针
- 扫描结束后，from-space 就是空闲内存
- 不必为了 GC 而“停止世界 (stop the world)”
- 在每次分配时做一点扫描
- 或者在解引用 from-space 中的指针时

**观察**
- 为什么有吸引力？
  - 分配成本低。进行压缩，所以没有空闲列表。
  - 增量式：每次分配都扫描/复制一点
  - 这就是“实时”的方面
- 成本是什么？
  - 指针是否驻留在 from-space？(如果是，它需要被复制)
  - 每次解引用都需要测试和分支
  - 难以同时运行回收器和程序
  - 回收器追踪堆和程序线程之间的竞争条件
  - 风险：同一个对象的两个副本

**解决方案：让应用程序使用虚拟内存**
https://dl.acm.org/doi/10.1145/53990.53992
- 避免在应用程序线程中对引用进行显式检查
- 复制根之后，取消映射 (unmap) to-space 的未扫描部分
  - 最初是一个包含根等的页面
- 当线程访问未扫描区域时发生页错误
- 处理器只扫描该页面并检查所有对象，然后 `UNPROT`
- 每页最多一次错误
- 无需编译器更改
- 易于实现并发
  - 一个回收器线程可以与应用程序线程并发运行
  - 一个回收器线程可以在扫描后 `UNPROT` 一个页面
  - 唯一需要的同步是哪个线程正在扫描哪个页面

**现有的虚拟内存原语对于并发 GC 来说足够好吗？**
- `MAP2` 是唯一的功能性问题
  - 可以通过 `shm_open` 和在不同地址 `mmap` 对象来解决
- `trap` 等操作是否足够快？
  - 他们说不：扫描一个页面需要 500 微秒，而处理陷阱需要 1200 微秒。
  - 为什么不扫描3个页面？
  - 运行 Baker 的实际算法（带检查）会慢多少？
  - VM 版本可能更快！即使陷阱很慢。
  - 他们没有计算第二个 CPU 进行扫描所节省的时间。
- 对于并发 GC，页错误发生的频率是否是个问题？
  - 不完全是 —— 更多的错误意味着更多的扫描。
  - 也就是说，我们每页最多只会得到 <= 1 次错误。

**测量**
- Sun3/60: 2080/0.12, 17333 adds
- i7-8550U CPU @ 1.80GHz (kaby lake), Linux 6.0.7
  - 在我的笔记本上，sqrts.c 中的一次错误是 5.4 微秒 (不含 sqrt)
  - 在 2.4Ghz 下一次加法是 ~ 0.417 纳秒；因此，约等于 12980 次加法
  - 使用 performance 电源策略
- 2024: nfault 1000, Linux 6.11.6, 耗时 10233 微秒
- 1.2 GHz Athlon, FreeBSD 4.3. 对于 trap, unprot, prot.
  - 12 微秒

**用户级虚拟内存是个好主意吗？**
- 大多数用例可以通过添加指令来实现
  - 例如，在应用程序线程中对引用进行检查
- **优点:**
  - 避免编译器更改
  - CPU 提供虚拟内存支持
- **缺点:**
  - 需要操作系统支持，而且是高效的支持
  - 大多数操作系统内核无法暴露分页的原始硬件性能
  - 操作系统强加了太多抽象

**1991年到2022年有什么变化？**
- VM API 和实现发生了大量变化
- VM 系统不断发展
- 研究也在继续 (例如，见 OSDI 2020)
- 其他原语
  - `mlock`, `munlock`, `madvise`, `mremap`, `mincore`, ...
- 切换地址空间是免费的 (带标签的 TLB)
- 扩展可寻址性不再重要
  - 2^52 字节的虚拟地址空间
