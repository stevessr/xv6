---
title: 课程表
---

未来日期的笔记、视频等链接是 6.1810 课程 2023 年版本的材料副本。我们会随着课程的进展更新笔记。课程笔记可以帮助你记起课程内容，但它们*不能*替代上课。

### 9月2日当周
*   **9月2日，星期一：** (假日) 劳动节
*   **9月3日，星期二：** (特殊) 注册日
*   **9月4日，星期三：**
    *   **第1讲 (rtm):** [简介](/mit6.1810/lec/l-overview.md) (讲义: [xv6 手册](/mit6.1810/xv6/book-riscv-rev4.pdf))
    *   **准备**: [阅读第1章](/mit6.1810/xv6/book-riscv-rev4.pdf) (娱乐一下: [Unix](https://www.youtube.com/watch?v=tc4ROCJYbm0))
    *   **作业**: [实验 util: Unix 工具](/mit6.1810/labs/util.md)
*   **9月5日，星期四：**
*   **9月6日，星期五：**

### 9月9日当周
*   **9月9日，星期一：**
    *   **第2讲 (fk):** [xv6 中的 C 语言](/mit6.1810/lec/l-c.md), [幻灯片](/mit6.1810/lec/l-c_slides.pdf)
    *   **准备**: Kernighan and Ritchie (K&R) 的 2.9 (位运算符) 和 5.1 (指针和地址) 到 5.6 (指针数组) 以及 6.4 (结构体指针)
*   **9月10日，星期二：**
*   **9月11日，星期三：**
    *   **第3讲 (fk):** [操作系统设计](/mit6.1810/lec/l-os.md)
    *   **准备**: [阅读第2章](/mit6.1810/xv6/book-riscv-rev4.pdf) 和 xv6 代码: [kernel/proc.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.h), [kernel/defs.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/defs.h), [kernel/entry.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/entry.S), [kernel/main.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/main.c), [user/initcode.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/initcode.S), [user/init.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/init.c), 并略读 [kernel/proc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.c) 和 [kernel/exec.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/exec.c)
    *   **作业1截止:** [问题](/mit6.1810/homework/q.md)
    *   **作业**: [实验 syscall: 系统调用](/mit6.1810/labs/syscall.md)
*   **9月12日，星期四：** **截止**: 实验 util
*   **9月13日，星期五：**

### 9月16日当周
*   **9月16日，星期一：**
    *   **第4讲 (fk):** [页表](/mit6.1810/lec/l-vm.md)
    *   **准备**: 阅读 [第3章](/mit6.1810/xv6/book-riscv-rev4.pdf) 和 [kernel/memlayout.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/memlayout.h), [kernel/vm.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/vm.c), [kernel/kalloc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/kalloc.c), [kernel/riscv.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/riscv.h), 和 [kernel/exec.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/exec.c)
    *   **作业2截止:** [问题](/mit6.1810/homework/q.md)
*   **9月17日，星期二：**
*   **9月18日，星期三：**
    *   **第5讲 (rtm):** [系统调用入口/出口](/mit6.1810/lec/l-internal.md)
    *   **准备**: 阅读 [第4章, 4.6节除外](/mit6.1810/xv6/book-riscv-rev4.pdf) 和 [kernel/riscv.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/riscv.h), [kernel/trampoline.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/trampoline.S), 和 [kernel/trap.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/trap.c)
    *   **作业3截止:** [问题](/mit6.1810/homework/q.md)
    *   **作业**: [实验 pgtbl: 页表](/mit6.1810/labs/pgtbl.md)
*   **9月19日，星期四：** **截止**: 实验 syscall
*   **9月20日，星期五：**

### 9月23日当周
*   **9月23日，星期一：**
    *   **第6讲 (TAs):** [GDB](/mit6.1810/lec/gdb_slides.pdf) [调用约定](/mit6.1810/lec/l-riscv.md)
    *   **准备**: 阅读 [调用约定](/assets/mit6.1810/riscv-calling.pdf)
*   **9月24日，星期二：**
*   **9月25日，星期三：**
    *   **第7讲 (fk):** [页错误](/mit6.1810/lec/l-pgfaults.md) 
    *   **准备**: 阅读 [4.6节](/mit6.1810/xv6/book-riscv-rev4.pdf)
    *   **作业4截止:** [问题](/mit6.1810/homework/q.md)
    *   **作业**: [实验 traps: 陷阱](/mit6.1810/labs/traps.md)
*   **9月26日，星期四：** **截止**: 实验 pgtbl
*   **9月27日，星期五：**

### 9月30日当周
*   **9月30日，星期一：**
    *   **第8讲 (fk):** [实验问答](/mit6.1810/lec/l-QA1.md)
    *   **作业5截止:** [问题](/mit6.1810/homework/QA.md)
*   **10月1日，星期二：**
*   **10月2日，星期三：**
    *   **第9讲 (rtm):** [设备驱动](/mit6.1810/lec/l-interrupt.md), [16550.pdf](/mit6.1810/lec/16550.pdf)
    *   **准备**: 阅读 [第5章](/mit6.1810/xv6/book-riscv-rev4.pdf) 和 [kernel/kernelvec.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/kernelvec.S), [kernel/plic.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/plic.c), [kernel/console.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/console.c), [kernel/uart.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/uart.c), [kernel/printf.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/printf.c)
    *   **作业6截止:** [问题](/mit6.1810/homework/q.md)
    *   **作业**: [实验 cow: 写时复制 fork](/mit6.1810/labs/cow.md)
*   **10月3日，星期四：** **截止**: 实验 traps
*   **10月4日，星期五：** (特殊) 加课日

### 10月7日当周
*   **10月7日，星期一：**
    *   **第10讲 (fk):** [锁](/mit6.1810/lec/l-lockv2.md)
    *   **准备**: 阅读 ["锁"](/mit6.1810/xv6/book-riscv-rev4.pdf) 以及 [kernel/spinlock.h](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/spinlock.h) 和 [kernel/spinlock.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/spinlock.c)
    *   **作业7截止:** [问题](/mit6.1810/homework/q.md)
*   **10月8日，星期二：**
*   **10月9日，星期三：**
    *   **第11讲 (rtm):** [调度 1](/mit6.1810/lec/l-threads.md)
    *   **准备**: 阅读 ["调度"](/mit6.1810/xv6/book-riscv-rev4.pdf) 至 7.4 节, 以及 [kernel/proc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.c), [kernel/swtch.S](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/swtch.S)
    *   **作业8截止:** [问题](/mit6.1810/homework/q.md)
*   **10月10日，星期四：**
*   **10月11日，星期五：**

### 10月14日当周
*   **10月14日，星期一：** (假日) 原住民日
*   **10月15日，星期二：**
*   **10月16日，星期三：**
    *   **第12讲 (rtm):** 协调, [代码](/source/xv6-riscv/kernel/pipe.c)
    *   **准备**: 阅读 ["调度"](/mit6.1810/xv6/book-riscv-rev4.pdf) 的剩余部分, 以及 [kernel/proc.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/proc.c), [kernel/sleeplock.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/sleeplock.c) 的相应部分
    *   **作业9截止:** [问题](/mit6.1810/homework/q.md)
*   **10月17日，星期四：** **截止**: 实验 cow
*   **10月18日，星期五：**

### 10月21日当周
*   **10月21日，星期一：**
    *   **第13讲 (fk):** [文件系统](/mit6.1810/lec/l-fs.md) ([幻灯片](/mit6.1810/lec/l-fs1.pdf))
    *   **准备**: 阅读 [kernel/bio.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/bio.c), [kernel/fs.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/fs.c), [kernel/sysfile.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/sysfile.c), [kernel/file.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/file.c) 和 ["文件系统" (日志部分除外)](/mit6.1810/xv6/book-riscv-rev4.pdf)
    *   **作业10截止:** [问题](/mit6.1810/homework/q.md)
*   **10月22日，星期二：**
*   **10月23日，星期三：**
    *   **期中考试**: 课上进行，开卷，但不能上网。
    *   **范围**: 第1讲到第12讲，实验到实验 cow。
    *   **练习**: [往年测验](/mit6.1810/quiz.md).
    *   **作业**: [实验 net: 网络驱动](/mit6.1810/labs/net.md)
*   **10月24日，星期四：**
*   **10月25日，星期五：**

### 10月28日当周
*   **10月28日，星期一：**
    *   **第14讲 (fk):** [崩溃恢复](/mit6.1810/homework/l-crash.md) ([幻灯片](/mit6.1810/lec/l-fs2.pdf))
    *   **准备**: 阅读 [kernel/log.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/kernel/log.c) 和 ["文件系统" 章节的日志部分](/mit6.1810/xv6/book-riscv-rev4.pdf)
    *   **作业11截止:** [问题](/mit6.1810/homework/q.md)
*   **10月29日，星期二：**
*   **10月30日，星期三：**
    *   **第15讲 (rtm):** [文件系统性能和快速崩溃恢复](/mit6.1810/homework/l-journal.md)
    *   **准备**: 阅读 [Journaling the Linux ext2fs Filesystem (1998)](/mit6.1810/homework/journal-ext2fs.md)
    *   **作业12截止:** [问题](/mit6.1810/homework/q.md)
*   **10月31日，星期四：**
*   **11月1日，星期五：**

### 11月4日当周
*   **11月4日，星期一：** (假日) 编程日：不上课；完成实验
    *   **作业**: [实验 lock: 并行/锁](/mit6.1810/labs/lock.md)
*   **11月5日，星期二：** **截止**: 实验 net
*   **11月6日，星期三：** (假日) 编程日：不上课；完成实验
*   **11月7日，星期四：**
*   **11月8日，星期五：**

### 11月11日当周
*   **11月11日，星期一：** (假日) 退伍军人节
*   **11月12日，星期二：**
*   **11月13日，星期三：**
    *   **第16讲 (fk):** [应用程序的虚拟内存](/mit6.1810/homework/l-uservm.md), [常见问题](/mit6.1810/homework/uservm-faq.md) ([sqrt 示例](/source/xv6-riscv/user/usertests.c))
    *   **准备**: 阅读 [Virtual Memory Primitives for User Programs (1991)](/assets/mit6.1810/appel-li.pdf)
    *   **作业13截止:** [问题](/mit6.1810/homework/q.md)
    *   **作业**: [实验 fs: 文件系统](/mit6.1810/labs/fs.md)
*   **11月14日，星期四：** **截止**: 实验 lock
*   **11月15日，星期五：**

### 11月18日当周
*   **11月18日，星期一：**
    *   **第17讲 (rtm):** [操作系统组织](/mit6.1810/lec/l-organization.md), [常见问题](/mit6.1810/lec/l4-faq.md)
    *   **准备**: 阅读 [The Performance of micro-Kernel-Based Systems (1997)](/assets/mit6.1810/microkernel.pdf)
    *   **作业14截止:** [问题](/mit6.1810/homework/q.md)
*   **11月19日，星期二：**
*   **11月20日，星期三：**
    *   **退课日**
    *   **第18讲 (rtm):** [虚拟机](/mit6.1810/lec/l-vmm.md), [常见问题](/mit6.1810/lec/dune-faq.md)
    *   **准备**: 阅读 [Dune: Safe User-level Access to Privileged CPU Features (2012)](/assets/mit6.1810/belay-dune.pdf)
    *   **作业15截止:** [问题](/mit6.1810/homework/q.md)
    *   **作业**: [实验 mmap: Mmap](/mit6.1810/labs/mmap.md)
*   **11月21日，星期四：** **截止**: 实验 fs
*   **11月22日，星期五：**

### 11月25日当周
*   **11月25日，星期一：**
    *   **第19讲 (fk):** [内核与高级语言](/mit6.1810/lec/l-redleaf.md), [常见问题](/mit6.1810/lec/redleaf-faq.md)
    *   **准备**: 阅读 [the RedLeaf paper (2020)](/assets/mit6.1810/redleaf.pdf)
    *   **作业16截止:** [问题](/mit6.1810/homework/q.md)
*   **11月26日，星期二：**
*   **11月27日，星期三：** (假日) 编程日：不上课；完成实验
*   **11月28日 - 11月29日，星期四 - 星期五：** (假日) 感恩节

### 12月2日当周
*   **12月2日，星期一：**
    *   **第20讲 (rtm):** [网络](/mit6.1810/lec/l-net.md)
    *   **准备**: 阅读 [Receive Livelock (1996)](/assets/mit6.1810/mogul96usenix.pdf), [常见问题](/mit6.1810/lec/livelock-faq.md)
    *   **作业17截止:** [问题](/mit6.1810/homework/q.md)
*   **12月3日，星期二：**
*   **12月4日，星期三：** (假日) 编程日：不上课；完成实验
*   **12月5日，星期四：**
*   **12月6日，星期五：** **截止**: 实验 mmap

### 12月9日当周
*   **12月9日，星期一：**
    *   **第21讲 (fk):** [Meltdown](/mit6.1810/lec/l-meltdown.md), [常见问题](/mit6.1810/lec/meltdown-faq.md)
    *   **准备**: 阅读 [Meltdown (2018)](/assets/mit6.1810/meltdown.pdf)
    *   **作业18截止:** [问题](/mit6.1810/homework/q.md)
*   **12月10日，星期二：**
*   **12月11日，星期三：**
    *   **课程最后一天**
    *   **第22讲 (rtm):** [多核可扩展性与 RCU](/mit6.1810/lec/l-rcu.md) 
    *   **准备**: 阅读 [RCU paper (2013)](/assets/mit6.1810/rcu-decade-later.pdf), [常见问题](/mit6.1810/lec/rcu-faq.md)
    *   **作业19截止:** [问题](/mit6.1810/homework/q.md)
*   **12月12日，星期四：**
*   **12月13日，星期五：**

### 12月16日 - 12月20日当周
*   **12月16日，星期一 - 12月20日，星期五：**
    *   **期末考试周的期末考试：12月19日，DUPONT, 上午9点-11点**
    *   **开卷，但不能上网**
    *   **范围**: 第13讲到第22讲，实验 net 到 mmap
    *   **练习**: [往年测验](/mit6.1oeat.md).
