Q: I am confused by exactly what the shim layer does and how it is implemented - it supports the Go runtime, so cannot be written in Go, but the paper also mentions no use of C. I would guess that it's written in assembly, but I'm still confused on how it is used after the system is booted, and the interface between the shim and the runtime.
A: The Go runtime assumes there is an OS underlying it and it makes system calls to it to get going. Biscuit runs on the bare hardware and so Biscuit must emulate those system calls to be able to use the Go runtime unmodified. This is what the shim layer in Biscuit does; for example, it allocates memory for the Go heap so that the runtime can get going. It mostly runs at boot time and is indeed written in assembly.
Q: It is mentioned that there are non-heap allocations in Biscuit, which is out of the scope of the heap exhaustion prevention mechanism presented. Since there is no such distinction in xv6, what exactly gets allocated in the Go heap and what doesn't?
A: Everything the kernel allocates (file descriptors, tcp state, etc.) lives in the kernel heap, except for physical memory pages. User-level programs implement typically their memory allocation (e.g., malloc in xv6), asking the kernel for extra memory pages if they need more memory. The xv6 kernel doesn't do much dynamic memory allocation, because it doesn't have a memory allocator (although you implemented one in the buddy lab); instead, it has a fixed number of file descriptors, procs structures, etc.
Q: What is a futex?
A: A way of implementing user-level locks without having to make a system call on each lock acquisition/release. Run "man 2 futex" on a Linux machine or Google it.
Q: The biscuit paper talks about "garbage collection", but doesn't really distinguish between tracing garbage collection and memory management based solely on reference counting. It seems like a lot of the issues associated with tracing collection (long stops to sweep memory, unpredictable timing) are less of an issue in reference counting schemes. Could a kernel be written in a language that only used reference counting, assuming that cyclic data structures could be avoided?
A: Biscuit has one or two cycles in its data structures. Reference counting would be an option, but if reference counts are contended between several cores, then they can tank performance. See the upcoming non-scalable locks paper. Also, see the RCU paper, which we will cover in future lecture, for the problems with contended cache lines.
Q: How does go handle interrupts without disabling further interrupts? How does it guarantee that it wont get interrupted or how does it handle it if it does.
A: Since Go typically runs on top of an OS it doesn't have to worry about interrupts, the OS deals with them. In case of Biscuit, that assumption isn't longer true so Biscuit has to do something to make it safe to accept interrupts. The way biscuit does it is to do basically nothing in the interrupt handler, other than setting a flag to indicate an interrupt happened. Then, later biscuit/go will schedule a go thread to process the interrupt; that go routine can acquire locks etc., allocate memory, etc, like any normal go thread.
Q: Also how high level is go exactly? Is it compiled or interpreted?
A: It is compiled
Q: While I see the benefits of not having to handle errors from not having enough heap space, couldn't the blocking behavior of system calls still substantially slow down programs?
A: Yes, if there is no memory, those system calls will make no progress until enough memory is available (e.g., after the kernel has killed a bad-citizen process). The POSIX interface has no good way of communicating to user-level processes that the kernel is low on memory. If the system hasn't enough memory to support the currently running applications, things will be slow.
Q: I don't quite understand how static analysis works on lots of programs, e.g. programs whose memory usage could be dependent on the algorithm / input (e.g. a program which searches over O(n^2) possible line intersections, but by some mathematical reasoning, we know that there are at most O(n) possible candidates).
A: In biscuit, the kernel programmer must annotate the Go code for loops where the analyzer cannot determine what the upperbound of the loops is (e.g., when the loop is dependent on an argument of a system call). Biscuit also avoid recursive functions for the same reason. With relatively few annotations, the tool was able to statically determine what an upperbound on the total amount of memory that each system needs to run. Building the tool was a bit of work, but it benefited from Go's packages for analyzing Go code, including a package that determines when variables go out of scope ("escape analysis").
Q: What I found most confusing about the dependency hirarchy. For example, how does Go have builtin threads at the operating system level? I though that the whole concept of threads relied on the operating system to implement.
A: Without Biscuit, the Go runtime implements multiple threads on top of OS-provided threads. The runtime has its own scheduler and context switching code. It multiplexes many go routines over a smaller number of kernel threads.
Q: The paper says that Biscuit is not optimized for NUMA. What is NUMA and why is it important?
A: Computers with NUMA are quite common. For example, if you have a server with several sockets (each socket holding a multicore processor) and with several memory banks. Often one bank is closer to one socket than another and so if the OS allocates memory in banks close to the socket that is using that memory, it is good for performance. Biscuit doesn't do this, but real operating systems do.
Q: I don't quite understand what the benefits are of using Go over other more common HLL's like Java. It seems like more popular nlanguages have features like garbage collection and type safety (and other abstractions like threads). Wouldn't building the language in a more common language potentially make developing and growing the OS easier?
A: One virtue that Go has going for it is that it designed for systems programming, but researchers in the past have implemented kernels in Java. It is possible that the results of the paper carry equally well over to Java; at a high-level they are both HLL with a good garbage collector. On the other hand, Go allocates more variables than Java on the stack instead of heap, which may change the results.
Q: Didn't we say that we need to disable interrupts during critical periods as otherwise we could deadlock due to interrupt code trying to grab locks that we had already acquired. How does Biscuit avoid such issues? Do they use locks that you can reacquire if the interrupted thread already owned it?
A: Biscuit avoids this deadlock problem by not taking locks in an interrupt handler. It basically doesn't do anything in the interrupt handler, other than setting a flag that an interrupt happened. Then, later the kernel schedules a kernel thread to process the interrupt; that is a normal thread so it can take acquire/release locks.
Q: It seems like many of the commonly used operating systems would require too much work to be converted to a HHL but I'm sure that there are a lot of methods they use to avoid the pitfalls and bugs mentioned. What are some of the techniques that we haven't taken advantage of when coding our labs / when xv6 was implemented.
A: Yeap, it would be an incredible amount of work to convert Linux to a HLL, and unlikely to make sense, since the Linux programmers are happy with C. There are indeed kernel C annotations and sanitizers to avoid common C bugs, but nevertheless they happen (see figure 6 in the paper).
Q: What are the difficulties or considerations to take when designing a garbage collection system?
A: A great question, but a very broad one and it is hard to summarize decades of research on garbage collection in a short response. This wiki page gives a high-level introduction into some of the issues: https://en.wikipedia.org/wiki/Garbage_collection_(computer_science). In the context of Biscuit, issues we were worried about is the number cycles that the garbage collector is using while running the kernel (i.e., slowing down kernel operations) and delays the garbage collector might introduce because of running a bit of collection while performing latency-sensitive operations (receiving and responding to a network package).
Q: What exactly is NGINX?
A: It is a widely-used high-performance web server. https://nginx.org/en/
Q: What is the point of comparing Biscuit against Linux on user applications if Linux contains many more features that Biscuit doesn't have? The paper acknowledges this, but goes ahead to show that Linux is 10% faster than Biscuit. How should this be interpreted?
A: With a large grain of salt. We did our best to do a fair comparison, but it is inherently imprecise. We tried to check that the comparison is fair (for example, we looked at execution profiles to see if they lined up), but it is easy to imagine that some missing feature could change the results. The conclusion to draw is that it is likely that Go isn't in the way of getting decent performance and that the difference in performance isn't going to be several factors, but instead some small fraction. We were worried going into this work that Biscuit would be much slower.
Q: In chapter 7 the paper says "Goroutine scheduling decisions and the context switch implementation live in the runtime, not in Biscuit. One consequence is that Biscuit does not control scheduling policy; it interits the runtime's policy". What exactly does that mean? Does Biscuit not have priorities for processes? What are runtime's policies? Are they usefull for general use? Can Biscuit be vulnerable to receive livelock?
A: Since Biscuit uses Go's runtime scheduler to schedule go routines, it inherits the policy that Go uses; since the Go runtime was designed to run a single multi-threaded application, and wasn't designed to run a kernel, its policy is quite simple. We didn't want to modify the Go runtime so Biscuit has a simple scheduler too. Biscuit can dynamically switch between interrupts and polling of the network, to avoid receive livelock.
Q: The most confusing part about the paper was understanding reservations - specifically the last paragraph in section 6.3.2 about fork, exit, exec and close. I don't reallu understand why we only need enough heap space for one call to close.
A: Fork/exit/exec may call close many times (once for each open file descriptor). If each call to close() results in a bit more memory being alive than the upperbound grows with the number of calls to close. What we did is make sure that when close() returns, there is no extra memory alive. As a result, it is safe to call close many times in fork/exit/exec.
Q: How did Biscuit overcome the lack of memory fence functionality in Go?
A: It used primitives from the atomic package, which issue memory fences implicitly.
Q: What is the point of using a garbage collector when malloc provides better control of performance.
A: The programmer doesn't have to free memory explicitly. For example, when the kernel cleans up an process that exited, the kernel programmer doesn't have to explicitly free every piece of memory that the process is using. The collector will free all memory that isn't reachable anymore automatically. This avoids classic C bugs such as double free, use after free, or forgetting to call free.
Q: How does the killer thread discern between good and bad citizens by assuming that the process that has the most mapped memory regions, file descriptors, and threads after garbage collection is a genuine bad citizen?
A: The killer thread has no reliable mechanism to tell good from bad citizens; it uses a heuristic: count the amount of kernel heap that a process is using. The process with most kernel objects is considered bad.
Q: Is it possible to reduce the performance reduction of garbage collection by simply supplying the machine with a lot more ram to affect how often garbage collection is done?
A: Indeed, Figure 8 quantifies how much extra memory you need to keep the GC costs under control.
Q: Was the type conversion a source of inefficiency due to the Go being strongly typed or was it not a problem?
A: Biscuit uses few Go interfaces, which have a cost, but type conversion isn't the major HLL tax. Prologue cycles for checking whether the stack must be expanded and whether the GC needs a stop of the world pause is the major one.
Q: Can you elaborate on common strategies for dealing with kernel heap exhaustion? The paper mentions that the linux kernel unwinds many function calls to hopefully get back to a state where the heap is not exhausted. How is this implemented? What does the kernel do if the unwind fails? Biscuit obviously has a different design -- was this design chosen because of limitations encountered by using the HLL, or was it chosen for other reasons?
A: Linux fails allocations and the caller must deal with it (check it and unwind further). This works, but makes the life of kernel programmers harder. One reason Biscuit doesn't follow this strategy is because Go doesn't allow allocations to fail.
Q: For how long and how many people did it take to implement Biscuit?
A: We don't have a precise number, because we tried different plans for writing Biscuit and we didn't keep track of it. Cody, as a PhD student, spent a few years doing most of the work.
Q: Out of curiosity are there any labs that we've completed that would have been impossible with Biscuit? I get the sense that Biscuit may use more memory and have performance delays but as far as correct implementation, Biscuit seems to have the necessary features of an OS kernel.
A: Nope. The features you implemented in the labs Biscuit has more advanced versions of them. In fact, Biscuit was derived from xv6 but then substantially extended to achieve high performance and to be able to run a few Linux applications unmodified.

---
title: faq-biscuit.md
---

Q: 我对 shim 层具体做什么以及如何实现感到困惑——它支持 Go 运行时，所以不能用 Go 编写，但论文也提到没有使用 C。我猜它是用汇编编写的，但我仍然困惑于系统启动后如何使用它，以及 shim 和运行时之间的接口。
A: Go 运行时假设有底层操作系统，并向其发出系统调用来启动。Biscuit 运行在裸机硬件上，因此 Biscuit 必须模拟这些系统调用以能够使用未经修改的 Go 运行时。这就是 Biscuit 中 shim 层所做的；例如，它为 Go 堆分配内存，以便运行时可以启动。它主要在启动时运行，确实用汇编编写。

Q: 提到 Biscuit 中存在非堆分配，这超出了所提出的堆耗尽预防机制的范围。由于 xv6 中没有这种区别，Go 堆中分配的是什么，不分配的是什么？
A: 内核分配的每样东西（文件描述符、tcp 状态等）都存在于内核堆中，除了物理内存页。用户级程序通常实现自己的内存分配（例如，xv6 中的 malloc），如果需要更多内存，会向内核请求额外的内存页。xv6 内核不进行大量动态内存分配，因为它没有内存分配器（尽管你在 buddy 实验中实现了一个）；相反，它有固定数量的文件描述符、procs 结构等。

Q: 什么是 futex？
A: 一种实现用户级锁而不必在每次获得/释放锁时发出系统调用的方法。在 Linux 机器上运行"man 2 futex"或 Google 它。

Q: biscuit 论文谈到了"垃圾回收"，但并没有真正区分跟踪垃圾回收和仅基于引用计数的内存管理。看来跟踪回收相关的许多问题（长时间停止以扫描内存，不可预测的时机）在引用计数方案中不那么重要。在假设可以避免循环数据结构的情况下，可以用只使用引用计数的语言编写内核吗？
A: Biscuit 的数据结构中有一个或两个循环。引用计数是一个选择，但如果引用计数在多个核心之间有竞争，那么它们会降低性能。参见即将到来的不可扩展锁论文。另外，参见我们将在未来讲座中介绍的 RCU 论文，了解竞争缓存行的问题。

Q: Go 如何在不禁用进一步中断的情况下处理中断？它如何保证不会被打断，如果被打断它如何处理？
A: 由于 Go 通常在操作系统之上运行，它不必担心中断，操作系统处理它们。在 Biscuit 的情况下，这种假设不再成立，所以 Biscuit 必须做些什么来安全地接受中断。Biscuit 的方法是在中断处理程序中基本上不做事，除了设置一个标志表示中断发生了。然后，以后 biscuit/go 将安排一个 go 线程来处理中断；那个 go 例程可以获取锁等，分配内存等，就像任何普通 go 线程一样。

Q: Go 到底有多高级？它是编译的还是解释的？
A: 它是编译的

Q: 虽然我看到了不需要处理堆空间不足错误的好处，但系统调用的阻塞行为不会显著减慢程序吗？
A: 是的，如果没有内存，那些系统调用将无法进展，直到有足够的内存（例如，在内核杀死问题进程后）。POSIX 接口没有好的方式将内核内存不足告诉用户级进程。如果系统没有足够的内存来支持当前运行的应用程序，事情会很慢。

Q: 我不太明白静态分析在许多程序上如何工作，例如内存使用可能依赖于算法/输入的程序（例如，搜索 O(n^2) 个可能的线相交的程序，但通过一些数学推理，我们知道最多有 O(n) 个可能的候选）。
A: 在 biscuit 中，内核程序员必须为循环注释 Go 代码，其中分析器无法确定循环的上限（例如，当循环依赖于系统调用的参数时）。Biscuit 也避免递归函数出于同样的原因。通过相对较少的注释，工具能够静态地确定每个系统运行所需的内存总量的上限。构建工具有点工作量，但它受益于 Go 分析 Go 代码的包，包括确定变量何时超出作用范围的包（"escape analysis"）。

Q: 关于依赖层次结构，我发现最令人困惑的是。例如，Go 如何在操作系统级别内置线程？我以为线程的整个概念依赖于操作系统来实现。
A: 没有 Biscuit，Go 运行时在操作系统提供的线程之上实现多个线程。运行时有自己的调度程序和上下文切换代码。它将许多 go 例程多路复用到较少的内核线程上。

Q: 论文说 Biscuit 没有为 NUMA 优化。什么是 NUMA，为什么它很重要？
A: 带有 NUMA 的计算机很常见。例如，如果你有一个有多个插座（每个插座持有多核处理器）和多个内存库的服务器。通常一个库比另一个更靠近一个插座，所以如果操作系统在靠近使用该内存的插座的库中分配内存，这对性能很好。Biscuit 不这样做，但真正的操作系统这样做。

Q: 我不太明白使用 Go 而不是其他更常见的 HLL（如 Java）有什么好处。看起来更流行的 nlanguages 有垃圾回收和类型安全等功能（和其他抽象如线程）。用更常见的语言构建语言会不会使开发和增长操作系统更容易？
A: Go 的一个优点是它为系统编程而设计，但过去研究者用 Java 实现了内核。论文的结果同样可能适用于 Java；在高级别，它们都是带有良好垃圾收集器的 HLL。另一方面，Go 比 Java 在栈而不是堆上分配更多变量，这可能会改变结果。

Q: 我们不是说过我们需要在关键期间禁用中断，否则由于中断代码试图获取我们已经获得的锁可能会死锁。Biscuit 如何避免这些问题？他们是否使用在中断线程已经拥有时可以重新获取的锁？
A: Biscuit 通过不在中断处理程序中获取锁来避免这种死锁问题。它基本上在中断处理程序中不做事，除了设置一个标志表示发生了中断。然后，以后内核安排一个内核线程来处理中断；这是一个普通线程，所以它可以获取/释放锁。

Q: 似乎许多常用的操作系统需要太多工作才能转换为 HHL，但我确信它们使用了许多方法来避免上述陷阱和错误。在编程实验室/实现 xv6 时，我们没有利用哪些技术？
A: 是的，将 Linux 转换为 HLL 需要难以置信的工作量，而且不太合理，因为 Linux 程序员对 C 很满意。确实有内核 C 注释和消毒器来避免常见的 C 错误，但它们仍然发生（参见论文中的图 6）。

Q: 设计垃圾回收系统时有哪些困难或考虑？
A: 一个好问题，但非常广泛，很难在简短的回复中总结几十年的垃圾回收研究。这个维基页面提供了一些问题的高级介绍：https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)。在 Biscuit 的上下文中，我们担心的问题是在运行内核时垃圾回收器使用的周期数（即，减慢内核操作）和垃圾回收器可能引入的延迟，因为执行一些收集而执行延迟敏感操作（接收和响应网络包）。

Q: 什么是 NGINX？
A: 它是一个广泛使用的高性能 web 服务器。https://nginx.org/en/

Q: 如果 Linux 包含 Biscuit 没有的许多更多功能，那么在用户应用程序上将 Biscuit 与 Linux 比较有什么意义？论文承认这一点，但继续显示 Linux 比 Biscuit 快 10%。应该如何解释？
A: 带着很大的保留。我们尽力做了公平比较，但它本质上不精确。我们尝试检查比较是否公平（例如，我们查看执行配置文件以查看它们是否一致），但很容易想象某些缺失功能可能改变结果。得出的结论是 Go 不太可能阻碍获得良好性能，性能差异不会是几个因素，而是一些小部分。我们担心这项工作会使 Biscuit 慢得多。

Q: 在第 7 章中，论文说"Goroutine 调度决策和上下文切换实现存在于运行时中，而不是 Biscuit 中。一个后果是 Biscuit 不控制调度策略；它继承运行时的策略"。这到底是什么意思？Biscuit 没有进程优先级吗？运行时的策略是什么？它们对一般使用有用吗？Biscuit 是否容易受到接收活锁的影响？
A: 由于 Biscuit 使用 Go 的运行时调度程序来调度 go 例程，它继承了 Go 使用的策略；由于 Go 运行时被设计为运行单个多线程应用程序，而不是设计为运行内核，其策略相当简单。我们不想修改 Go 运行时，所以 Biscuit 也有一个简单的调度程序。Biscuit 可以动态在中断和网络轮询之间切换，以避免接收活锁。

Q: 论文中理解最令人困惑的部分是理解预留——特别是第 6.3.2 节关于 fork、exit、exec 和 close 的最后一段。我不太明白为什么我们只需要一次 close 调用的堆空间。
A: Fork/exit/exec可能多次调用close（每个打开的文件描述符一次）。如果每次调用close()导致更多内存处于活动状态，则上限随close调用次数增长。我们做的是确保当close()返回时，没有额外的内存处于活动状态。因此，在fork/exit/exec中多次调用close是安全的。

Q: Biscuit 如何克服 Go 中缺少内存栅栏功能的问题？
A: 它使用来自 atomic 包的原语，这些原语隐式发出内存栅栏。

Q: 当 malloc 提供更好的性能控制时，使用垃圾回收器有什么意义？
A: 程序员不必显式释放内存。例如，当内核清理退出的进程时，内核程序员不必显式释放进程使用的所有内存。收集器将自动释放所有不再可达的内存。这避免了经典的 C 错误，如重复释放、使用已释放后的内存或忘记调用 free。

Q: killer 线程如何通过假设在垃圾回收后具有最多映射内存区域、文件描述符和线程的进程是真正的问题进程来区分好公民和坏公民？
A: killer 线程没有可靠的机制来区分好公民和坏公民；它使用启发式：计算进程使用的内核堆数量。具有最多内核对象的进程被认为是坏的。

Q: 是否可以通过简单地为机器提供更多的 RAM 来减少垃圾回收的性能降低，以影响垃圾回收的频率？
A: 确实，图 8 量化了你需要多少额外内存来控制 GC 成本。

Q: 由于 Go 是强类型的，类型转换是否是效率低下的原因，还是不是问题？
A: Biscuit 使用很少的 Go 接口，它们有成本，但类型转换不是主要的 HLL 税收。检查栈是否必须扩展以及 GC 是否需要停止世界的前言周期是主要的。

Q: 能详细说明处理内核堆耗尽的常见策略吗？论文提到 linux 内核展开许多函数调用，希望回到堆没有耗尽的状态。这是如何实现的？如果展开失败，内核做什么？Biscuit 显然有不同的设计——这个设计是因为使用 HLL 遇到的限制选择的，还是出于其他原因？
A: Linux 失败分配，调用者必须处理它（检查它并进一步展开）。这可行，但使内核程序员的生活更难。Biscuit 不遵循此策略的一个原因是 Go 不允许分配失败。

Q: 实现 Biscuit 花了多长时间和多少人？
A: 我们没有精确数字，因为我们尝试了不同的编写 Biscuit 计划，我们没有跟踪它。Cody 作为一名博士生，花了几年时间做大部分工作。

Q: 出于好奇，我们完成的实验中有任何在 Biscuit 上不可能的吗？我感觉 Biscuit 可能使用更多内存并有性能延迟，但在正确实现方面，Biscuit 似乎具有操作系统内核的必要功能。
A: 不。你在实验中实现的功能 Biscuit 有更高级的版本。事实上，Biscuit 源自 xv6，但随后大幅扩展以实现高性能并能够运行一些 Linux 应用程序而无需修改。