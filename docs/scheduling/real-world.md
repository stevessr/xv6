# 现实世界

xv6调度器实现了一个简单的调度策略，即轮流运行每个进程。这个策略被称为轮询调度（round robin）。真正的操作系统实现了更复杂的策略，例如，允许进程有优先级。其思想是，一个可运行的高优先级进程将被调度器优先于一个可运行的低优先级进程。这些策略可能很快变得复杂，因为通常存在相互竞争的目标：例如，操作系统可能还希望保证公平性和高吞吐量。此外，复杂的策略可能导致意想不到的交互，例如优先级反转（priority inversion）和护航（convoys）。当一个低优先级和一个高优先级的进程都使用一个特定的锁时，可能会发生优先级反转，当低优先级进程获取该锁时，可能会阻止高优先级进程取得进展。当许多高优先级进程等待一个获取了共享锁的低优先级进程时，可能会形成一个长的等待进程护航；一旦护航形成，它可能会持续很长时间。为了避免这些问题，在复杂的调度器中需要额外的机制。

[`sleep`](/source/xv6-riscv/user/user.h.md)和[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)是一个简单而有效的同步方法，但还有许多其他方法。所有这些方法的第一个挑战是避免我们在本章开头看到的“丢失唤醒”问题。最初的Unix内核的[`sleep`](/source/xv6-riscv/user/user.h.md)只是禁用中断，这在Unix在单CPU系统上运行时就足够了。因为xv6在多处理器上运行，它向[`sleep`](/source/xv6-riscv/user/user.h.md)添加了一个显式锁。FreeBSD的`msleep`采取了同样的方法。Plan 9的[`sleep`](/source/xv6-riscv/user/user.h.md)使用一个回调函数，该函数在进入休眠前持有调度锁运行；该函数作为对休眠条件的最后检查，以避免丢失唤醒。Linux内核的[`sleep`](/source/xv6-riscv/user/user.h.md)使用一个显式的进程队列，称为等待队列，而不是一个等待通道；该队列有自己的内部锁。

在[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)中扫描整个进程集是低效的。一个更好的解决方案是在[`sleep`](/source/xv6-riscv/user/user.h.md)和[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)中用一个保存了在该结构上休眠的进程列表的数据结构替换`chan`，例如Linux的等待队列。Plan 9的[`sleep`](/source/xv6-riscv/user/user.h.md)和[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)称该结构为会合点。许多线程库将相同的结构称为条件变量；在这种情况下，操作[`sleep`](/source/xv6-riscv/user/user.h.md)和[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)被称为[`wait`](/source/xv6-riscv/user/user.h.md)和`signal`。所有这些机制都有相同的特点：休眠条件由某种在休眠期间原子地释放的锁保护。

[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)的实现唤醒了所有在特定通道上等待的进程，并且可能有很多进程在等待该特定通道。操作系统将调度所有这些进程，它们将竞争检查休眠条件。以这种方式行为的进程有时被称为惊群效应（thundering herd），最好避免。大多数条件变量有两个用于[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)的原语：`signal`，唤醒一个进程，和`broadcast`，唤醒所有等待的进程。

信号量通常用于同步。计数通常对应于管道缓冲区中可用的字节数或进程拥有的僵尸子进程数。使用显式计数作为抽象的一部分可以避免“丢失唤醒”问题：有一个关于已发生唤醒次数的显式计数。该计数还避免了虚假唤醒和惊群效应问题。

终止进程并清理它们在xv6中引入了许多复杂性。在大多数操作系统中，它甚至更复杂，因为，例如，受害者进程可能在内核深处休眠，展开其栈需要小心，因为调用栈上的每个函数可能需要进行一些清理工作。一些语言通过提供异常机制来提供帮助，但C语言没有。此外，还有其他事件可能导致休眠的进程被唤醒，即使它正在等待的事件尚未发生。例如，当一个Unix进程正在休眠时，另一个进程可能会向它发送一个`signal`。在这种情况下，进程将从被中断的系统调用返回，返回值为-1，错误代码设置为EINTR。应用程序可以检查这些值并决定做什么。Xv6不支持信号，因此不会出现这种复杂性。

Xv6对[`kill`](/source/xv6-riscv/user/user.h.md)的支持不完全令人满意：有一些休眠循环可能应该检查`p->killed`。一个相关的问题是，即使对于检查`p->killed`的[`sleep`](/source/xv6-riscv/user/user.h.md)循环，[`sleep`](/source/xv6-riscv/user/user.h.md)和[`kill`](/source/xv6-riscv/user/user.h.md)之间也存在竞争；后者可能会在受害者的休眠循环检查`p->killed`之后但在其调用[`sleep`](/source/xv6-riscv/user/user.h.md)之前设置`p->killed`并试图唤醒受害者。如果发生此问题，受害者在它等待的条件发生之前不会注意到`p->killed`。这可能会晚很多，甚至永远不会（例如，如果受害者正在等待来自控制台的输入，但用户不输入任何内容）。

一个真正的操作系统会用一个显式的空闲列表在常数时间内找到空闲的`proc`结构，而不是像[`allocproc`](/source/xv6-riscv/kernel/proc.c.md)那样进行线性时间搜索；xv6为了简单起见使用了线性扫描。