---
title: schedule
---

Links to notes, videos etc. on future days are copies of materials from the 2024 version of 6.1810. We will update the notes as the course progresses. The lecture notes may help you remember the lecture content, but they are _not_ a replacement for attending lectures.   
  


Monday| Tuesday | Wednesday| Thursday | Friday  
---|---|---|---|---  
sep 1  
Labor Day | sep 2  
Reg Day | sep 3  
**LEC 1 (rtm):** [Introduction](lec/l-overview.txt) and [examples](lec/l-overview/)  
**Handouts:** [xv6 code](https://github.com/mit-pdos/xv6-riscv) ([PDF booklet](xv6/xv6-src-booklet-rev5.pdf)) and [xv6 book](xv6/book-riscv-rev5.pdf)  
**Homework 1 due:** [file descriptors](homework/xv6-intro.html)  
**Lab _util_ assigned**: [Unix utilities](labs/util.html) | sep 4 | sep 5  
sep 8  
**LEC 2 (nz):** [C in xv6](lec/l-c.txt) and [examples](lec/l-c/)  
**Homework 2 due:** [kernel C](homework/xv6-c.html) | sep 9 | sep 10  
**LEC 3 (fk):** [OS design](lec/l-os.txt)  
**Homework 3 due:** [kernel design](homework/xv6-design.html)  
**Lab _syscall_ assigned**: [System calls](labs/syscall.html) | sep 11  
**Lab _util_ due** | sep 12  
sep 15  
**LEC 4 (rtm):** [OS Organization](lec/l-organization.txt), [FAQ](lec/l4-faq.txt)  
**Homework 4 due:** [microkernels](homework/paper-microkernel.html) | sep 16 | sep 17  
**LEC 5 (nz):** [Page tables](lec/l-vm.txt)  
**Homework 5 due:** [page tables](homework/xv6-pgtbl.html)  
**Lab _pgtbl_ assigned**: [Page tables](labs/pgtbl.html) | sep 18  
**Lab _syscall_ due** | sep 19  
sep 22  
**LEC 6 (fk):** [System call entry/exit](lec/l-internal.txt)  
**Homework 6 due:** [Question](homework/xv6-trampoline.html) | sep 23 | sep 24  
**LEC 7 (nz):** [System call interposition](lec/l-janus.txt)  
**Homework 7 due:** [system call interposition](homework/paper-janus.html)  
**Lab _traps_ assigned**: [Traps](labs/traps.html) | sep 25  
**Lab _pgtbl_ due** | sep 26  
sep 29  
**LEC 8 (fk):** [Page faults](lec/l-pgfaults.txt)   
**Homework 8 due:** [Question](homework/xv6-pgfault.html) | sep 30 | oct 1  
**LEC 9 (rtm):** [Transparent super pages](lec/l-superpages.txt)  
**Homework 9 due:** [superpages](homework/paper-superpages.html)  
**Lab _cow_ assigned**: [Copy-on-write fork](labs/cow.html) | oct 2  
**Lab _traps_ due** | oct 3  
ADD DATE  
oct 6  
**LEC 10 (fk):** [Virtual memory for applications](lec/l-uservm.txt), [FAQ](lec/uservm-faq.txt) ([sqrt example](lec/mmap.c))  
**Homework 10 due:** [Question](homework/paper-uvm.html) | oct 7 | oct 8  
**LEC 11 (rtm):** [Device drivers](lec/l-interrupt.txt), [16550.pdf](lec/16550.pdf)  
**Homework 11 due:** [Question](homework/xv6-interrupt.html) | oct 9 | oct 10  
oct 13  
Indigenous Peoples Day | oct 14 | oct 15  
**LEC 12 (rtm):** [Locking](lec/l-lockv2.txt)  
**Homework 12 due:** [Question](homework/xv6-locks.html)  
**Lab _net_ assigned**: [Network driver](labs/net.html) | oct 16  
**Lab _cow_ due** | oct 17  
oct 20  
Hacking day; no class meeting; work on the lab | oct 21 | oct 22  
**Midterm**  
**Location:** 50-340 (Walker)  
**Time:** 1:05-2:25pm  
**Policy:** open book and notes, closed network  
**Scope:** lectures 1 through 12, labs through cow   
**Practice:** [previous quizzes](quiz.html) | oct 23 | oct 24  
oct 27  
**LEC 13 (nz):** [Thread switching](lec/l-threads.txt)   
**Homework 13 due:** [Thread switching](homework/xv6-threads.html) | oct 28 | oct 29  
**LEC 14 (rtm):** [Coordination](lec/l-coordination.txt), [code](lec/l-coordination.c)  
**Preparation** : Read remainder of ["Scheduling"](xv6/book-riscv-rev5.pdf), and corresponding parts of [kernel/proc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.c), [kernel/sleeplock.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/sleeplock.c)  
**Homework 14 due:** [Question](homework/q.html) | oct 30 | oct 31  
nov 3  
**LEC 15 (nz):** [Networking](lec/l-net.txt)  
**Homework 15 due:** [Receive livelock](homework/paper-livelock.html)  
**Lab _lock_ assigned**: [Parallelism/locking](labs/lock.html) | nov 4  
**Lab _net_ due** | nov 5  
**LEC 16 (fk):** Scheduling  
**Preparation** : Read [TBD](readings/xxx.pdf)  
**Homework 16 due:** [Question](homework/q.html) | nov 6 | nov 7  
nov 10  
Student holiday | nov 11  
Veteran's Day | nov 12  
**LEC 17 (fk):** [Multi-Core scalability and RCU](lec/l-rcu.txt)   
**Preparation** : Read [RCU paper (2013)](readings/rcu-decade-later.pdf), [FAQ](lec/rcu-faq.txt)  
**Homework 17 due:** [Question](homework/q.html)  
**Lab _fs_ assigned**: [File system](labs/fs.html) | nov 13  
**Lab _lock_ due** | nov 14  
nov 17  
**LEC 18 (rtm):** [File systems](lec/l-fs.txt) ([slides](lec/l-fs1.pdf))  
**Preparation** : Read [kernel/bio.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/bio.c), [kernel/fs.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/fs.c), [kernel/sysfile.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/sysfile.c), [kernel/file.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/file.c) and ["File system" (except for the logging sections)](xv6/book-riscv-rev5.pdf)  
**Homework 18 due:** [Question](homework/q.html) | nov 18 | nov 19  
**DROP DATE**  
**LEC 19 (fk):** [Crash recovery](lec/l-crash.txt) ([slides](lec/l-fs2.pdf))  
**Preparation** : Read [kernel/log.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/log.c) and [the logging sections of the "File system" chapter](xv6-book-riscv-rev5.pdf)  
**Homework 19 due:** [Question](homework/q.html)  
**Lab _mmap_ assigned**: [Mmap](labs/mmap.html) | nov 20  
**Lab _fs_ due** | nov 21  
nov 24  
**LEC 20 (nz):** [File system performance and fast crash recovery](lec/l-journal.txt)  
**Homework 20 due:** [ext3](homework/paper-ext3.html) | nov 25 | nov 26  
Hacking day: no class meeting; work on the lab | nov 27 - nov 28  
Thanksgiving  
dec 1  
**LEC 21 (fk):** [Containers and Virtual Machines](lec/l-vmm.txt)  
**Homework 21 due:** [Question](homework/paper-blending.html) | dec 2 | dec 3  
Hacking day: no class meeting; work on the lab | dec 4 | dec 5  
**Lab _mmap_ due**  
dec 8  
**LEC 22 (nz):** Kernel extensibility  
**Homework 22 due:** [BPF](homework/paper-bpf.html) | dec 9 | dec 10  
LAST DAY OF CLASSES  
**LEC 23 (rtm):** [Meltdown](lec/l-meltdown.txt), [FAQ](lec/meltdown-faq.txt)  
**Preparation** : Read [Meltdown (2018)](readings/meltdown.pdf)  
**Homework 23 due:** [Question](homework/q.html) | dec 11 | dec 12  
dec 15 | dec 16 | dec 17 | dec 18 | dec 19  
**Final exam:** DuPont, 1:30-4:30pm.  
**Policy:** Open book, open notes, closed network.  
**Scope:** Lectures 13 through 22, labs net through mmap.  
**Practice:** [previous quizzes](quiz.html).  
  
* * *

Questions or comments regarding 6.1810? Send e-mail to the course staff at [_61810-staff@lists.csail.mit.edu_](mailto:61810-staff@lists.csail.mit.edu). 

[![Creative Commons License](https://i.creativecommons.org/l/by/3.0/us/88x31.png)](https://creativecommons.org/licenses/by/3.0/us/)
