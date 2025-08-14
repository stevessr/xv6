---
title: schedule
---

Links to notes, videos etc. on future days are copies of materials from the 2023 version of 6.1810. We will update the notes as the course progresses. The lecture notes may help you remember the lecture content, but they are *not* a replacement for attending lectures.

### Week of Sep 2
*   **Mon, Sep 2:** (Holiday) Labor Day
*   **Tue, Sep 3:** (Special) Reg Day
*   **Wed, Sep 4:**
    *   **LEC 1 (rtm):** [Introduction](/mit6.1810/lec/l-overview.md) (handouts: [xv6 book](/mit6.1810/xv6/book-riscv-rev4.md))
    *   **Preparation**: [Read chapter 1](/mit6.1810/xv6/book-riscv-rev4.md) (for your amusement: [Unix](https://www.youtube.com/watch?v=tc4ROCJYbm0))
    *   **Assignment**: [Lab util: Unix utilities](/mit6.1810/labs/util.md)
*   **Thu, Sep 5:**
*   **Fri, Sep 6:**

### Week of Sep 9
*   **Mon, Sep 9:**
    *   **LEC 2 (fk):** [C in xv6](/mit6.1810/lec/l-c.md), [slides](/mit6.1810/lec/l-c_slides.md)    *   **Preparation**: 2.9 (Bitwise operators) and 5.1 (Pointers and addresses) through 5.6 (Pointer arrays) and 6.4 (pointers to structures) by Kernighan and Ritchie (K&R)
*   **Tue, Sep 10:**
*   **Wed, Sep 11:**
    *   **LEC 3 (fk):** [OS design](/mit6.1810/lec/l-os.md)
    *   **Preparation**: [Read chapter 2](/mit6.1810/xv6/book-riscv-rev4.md) and xv6 code: [kernel/proc.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.h), [kernel/defs.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/defs.h), [kernel/entry.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/entry.S), [kernel/main.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/main.c), [user/initcode.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/initcode.S), [user/init.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/init.c), and skim [kernel/proc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.c) and [kernel/exec.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/exec.c)
    *   **Homework 1 due:** [Question](/mit6.1810/homework/q.md)
    *   **Assignment**: [Lab syscall: System calls](/mit6.1810/labs/syscall.md)
*   **Thu, Sep 12:** **DUE**: Lab util
*   **Fri, Sep 13:**

### Week of Sep 16
*   **Mon, Sep 16:**
    *   **LEC 4 (fk):** [page tables](/mit6.1810/lec/l-vm.md)
    *   **Preparation**: Read [Chapter 3](/mit6.1810/xv6/book-riscv-rev4.md) and [kernel/memlayout.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/memlayout.h), [kernel/vm.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/vm.c), [kernel/kalloc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/kalloc.c), [kernel/riscv.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/riscv.h), and [kernel/exec.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/exec.c)
    *   **Homework 2 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Sep 17:**
*   **Wed, Sep 18:**
    *   **LEC 5 (rtm):** [System call entry/exit](/mit6.1810/lec/l-internal.md)
    *   **Preparation**: Read [Chapter 4, except 4.6](/mit6.1810/xv6/book-riscv-rev4.md) and [kernel/riscv.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/riscv.h), [kernel/trampoline.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/trampoline.S), and [kernel/trap.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/trap.c)
    *   **Homework 3 due:** [Question](/mit6.1810/homework/q.md)
    *   **Assignment**: [Lab pgtbl: Page tables](/mit6.1810/labs/pgtbl.md)
*   **Thu, Sep 19:** **DUE**: Lab syscall
*   **Fri, Sep 20:**

### Week of Sep 23
*   **Mon, Sep 23:**
    *   **LEC 6 (TAs):** [GDB](/mit6.1810/lec/gdb_slides.md) [Calling conventions](/mit6.1810/lec/l-riscv.md)
    *   **Preparation**: Read [Calling Convention](/mit6.1810/readings/riscv-calling.md)
*   **Tue, Sep 24:**
*   **Wed, Sep 25:**
    *   **LEC 7 (fk):** [Page faults](/mit6.1810/lec/l-pgfaults.md) 
    *   **Preparation**: Read [Section 4.6](/mit6.1810/xv6/book-riscv-rev4.md)
    *   **Homework 4 due:** [Question](/mit6.1810/homework/q.md)
    *   **Assignment**: [Lab traps: Traps](/mit6.1810/labs/traps.md)
*   **Thu, Sep 26:** **DUE**: Lab pgtbl
*   **Fri, Sep 27:**

### Week of Sep 30
*   **Mon, Sep 30:**
    *   **LEC 8 (fk):** [Q&A labs](/mit6.1810/lec/l-QA1.md)
    *   **Homework 5 due:** [Question](/mit6.1810/homework/QA.md)
*   **Tue, Oct 1:**
*   **Wed, Oct 2:**
    *   **LEC 9 (rtm):** [Device drivers](/mit6.1810/lec/l-interrupt.md), [16550.pdf](/mit6.1810/lec/16550.md)
    *   **Preparation**: Read [Chapter 5](/mit6.1810/xv6/book-riscv-rev4.md) and [kernel/kernelvec.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/kernelvec.S), [kernel/plic.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/plic.c), [kernel/console.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/console.c), [kernel/uart.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/uart.c), [kernel/printf.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/printf.c)
    *   **Homework 6 due:** [Question](/mit6.1810/homework/q.md)
    *   **Assignment**: [Lab cow: Copy-on-write fork](/mit6.1810/labs/cow.md)
*   **Thu, Oct 3:** **DUE**: Lab traps
*   **Fri, Oct 4:** (Special) ADD DATE

### Week of Oct 7
*   **Mon, Oct 7:**
    *   **LEC 10 (fk):** [Locking](/mit6.1810/lec/l-lockv2.md)
    *   **Preparation**: Read ["Locking"](/mit6.1810/xv6/book-riscv-rev4.md) with [kernel/spinlock.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/spinlock.h) and [kernel/spinlock.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/spinlock.c)
    *   **Homework 7 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Oct 8:**
*   **Wed, Oct 9:**
    *   **LEC 11 (rtm):** [Scheduling 1](/mit6.1810/lec/l-threads.md)
    *   **Preparation**: Read ["Scheduling"](/mit6.1810/xv6/book-riscv-rev4.md) through Section 7.4, and [kernel/proc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.c), [kernel/swtch.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/swtch.S)
    *   **Homework 8 due:** [Question](/mit6.1810/homework/q.md)
*   **Thu, Oct 10:**
*   **Fri, Oct 11:**

### Week of Oct 14
*   **Mon, Oct 14:** (Holiday) Indigenous Peoples Day
*   **Tue, Oct 15:**
*   **Wed, Oct 16:**
    *   **LEC 12 (rtm):** [Coordination](/mit6.1810/lec/l-coordination.md), [code](/source/xv6-riscv/kernel/pipe.c.md)
    *   **Preparation**: Read remainder of ["Scheduling"](/mit6.1810/xv6/book-riscv-rev4.md), and corresponding parts of [kernel/proc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.c), [kernel/sleeplock.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/sleeplock.c)
    *   **Homework 9 due:** [Question](/mit6.1810/homework/q.md)
*   **Thu, Oct 17:** **DUE**: Lab cow
*   **Fri, Oct 18:**

### Week of Oct 21
*   **Mon, Oct 21:**
    *   **LEC 13 (fk):** [File systems](/mit6.1810/lec/l-fs.md) ([slides](/mit6.1810/lec/l-fs1.md))
    *   **Preparation**: Read [kernel/bio.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/bio.c), [kernel/fs.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/fs.c), [kernel/sysfile.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/sysfile.c), [kernel/file.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/file.c) and ["File system" (except for the logging sections)](/mit6.1810/xv6/book-riscv-rev4.md)
    *   **Homework 10 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Oct 22:**
*   **Wed, Oct 23:**
    *   **Midterm**: in class during class hours, open book and notes but closed network.
    *   **Scope**: Lectures 1 through 12, labs through lab cow.
    *   **Practice**: [previous quizzes](/mit6.1810/quiz.md).
    *   **Assignment**: [Lab net: Network driver](/mit6.1810/labs/net.md)
*   **Thu, Oct 24:**
*   **Fri, Oct 25:**

### Week of Oct 28
*   **Mon, Oct 28:**
    *   **LEC 14 (fk):** [Crash recovery](/mit6.1810/lec/l-crash.md) ([slides](/mit6.1810/lec/l-fs2.md))
    *   **Preparation**: Read [kernel/log.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/log.c) and [the logging sections of the "File system" chapter](/mit6.1810/xv6-book-riscv-rev4.md)
    *   **Homework 11 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Oct 29:**
*   **Wed, Oct 30:**
    *   **LEC 15 (rtm):** [File system performance and fast crash recovery](/mit6.1810/lec/l-journal.md)
    *   **Preparation**: Read [Journaling the Linux ext2fs Filesystem (1998)](/mit6.1810/homework/journal-ext2fs.md), [FAQ](/mit6.1810/lec/ext3-faq.md)
    *   **Homework 12 due:** [Question](/mit6.1810/homework/q.md)
*   **Thu, Oct 31:**
*   **Fri, Nov 1:**

### Week of Nov 4
*   **Mon, Nov 4:** (Holiday) Hacking day: no class meeting; work on the lab
    *   **Assignment**: [Lab lock: Parallelism/locking](/mit6.1810/labs/lock.md)
*   **Tue, Nov 5:** **DUE**: Lab net
*   **Wed, Nov 6:** (Holiday) Hacking day: no class meeting; work on the lab
*   **Thu, Nov 7:**
*   **Fri, Nov 8:**

### Week of Nov 11
*   **Mon, Nov 11:** (Holiday) Veteran's Day
*   **Tue, Nov 12:**
*   **Wed, Nov 13:**
    *   **LEC 16 (fk):** [Virtual memory for applications](/mit6.1810/lec/l-uservm.md), [FAQ](/mit6.1810/lec/uservm-faq.md) ([sqrt example](/source/xv6-riscv/user/usertests.c.md))
    *   **Preparation**: Read [Virtual Memory Primitives for User Programs (1991)](/mit6.1810/readings/appel-li.md)
    *   **Homework 13 due:** [Question](/mit6.1810/homework/q.md)
    *   **Assignment**: [Lab fs: File system](/mit6.1810/labs/fs.md)
*   **Thu, Nov 14:** **DUE**: Lab lock
*   **Fri, Nov 15:**

### Week of Nov 18
*   **Mon, Nov 18:**
    *   **LEC 17 (rtm):** [OS Organization](/mit6.1810/lec/l-organization.md), [FAQ](/mit6.1810/lec/l4-faq.md)
    *   **Preparation**: Read [The Performance of micro-Kernel-Based Systems (1997)](/mit6.1810/readings/microkernel.md)
    *   **Homework 14 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Nov 19:**
*   **Wed, Nov 20:**
    *   **DROP DATE**
    *   **LEC 18 (rtm):** [Virtual Machines](/mit6.1810/lec/l-vmm.md), [FAQ](/mit6.1810/lec/dune-faq.md)
    *   **Preparation**: Read [Dune: Safe User-level Access to Privileged CPU Features (2012)](/mit6.1810/readings/belay-dune.md)
    *   **Homework 15 due:** [Question](/mit6.1810/homework/q.md)
    *   **Assignment**: [Lab mmap: Mmap](/mit6.1810/labs/mmap.md)
*   **Thu, Nov 21:** **DUE**: Lab fs
*   **Fri, Nov 22:**

### Week of Nov 25
*   **Mon, Nov 25:**
    *   **LEC 19 (fk):** [Kernels and HLL](/mit6.1810/lec/l-redleaf.md), [FAQ](/mit6.1810/lec/redleaf-faq.md)
    *   **Preparation**: Read [the RedLeaf paper (2020)](/mit6.1810/readings/redleaf.md)
    *   **Homework 16 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Nov 26:**
*   **Wed, Nov 27:** (Holiday) Hacking day: no class meeting; work on the lab
*   **Thu, Nov 28 - Fri, Nov 29:** (Holiday) Thanksgiving

### Week of Dec 2
*   **Mon, Dec 2:**
    *   **LEC 20 (rtm):** [Networking](/mit6.1810/lec/l-net.md)
    *   **Preparation**: Read [Receive Livelock (1996)](/mit6.1810/readings/mogul96usenix.md), [FAQ](/mit6.1810/lec/livelock-faq.md)
    *   **Homework 17 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Dec 3:**
*   **Wed, Dec 4:** (Holiday) Hacking day: no class meeting; work on the lab
*   **Thu, Dec 5:**
*   **Fri, Dec 6:** **DUE**: Lab mmap

### Week of Dec 9
*   **Mon, Dec 9:**
    *   **LEC 21 (fk):** [Meltdown](/mit6.1810/lec/l-meltdown.md), [FAQ](/mit6.1810/lec/meltdown-faq.md)
    *   **Preparation**: Read [Meltdown (2018)](/mit6.1810/readings/meltdown.md)
    *   **Homework 18 due:** [Question](/mit6.1810/homework/q.md)
*   **Tue, Dec 10:**
*   **Wed, Dec 11:**
    *   **LAST DAY OF CLASSES**
    *   **LEC 22 (rtm):** [Multi-Core scalability and RCU](/mit6.1810/lec/l-rcu.md) 
    *   **Preparation**: Read [RCU paper (2013)](/mit6.1810/readings/rcu-decade-later.md), [FAQ](/mit6.1810/lec/rcu-faq.md)
    *   **Homework 19 due:** [Question](/mit6.1810/homework/q.md)
*   **Thu, Dec 12:**
*   **Fri, Dec 13:**

### Week of Dec 16 - Dec 20
*   **Mon, Dec 16 - Fri, Dec 20:**
    *   **Final in finals week: Dec 19, DUPONT, 9am-11am**
    *   **Open book and notes but closed network**
    *   **Scope**: Lectures 13 through 22, labs net through mmap
    *   **Practice**: [previous quizzes](/mit6.1810/quiz.md).
