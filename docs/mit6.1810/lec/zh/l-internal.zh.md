---
title: l-internal.txt
---

6.1810 2025 第 6 讲：系统调用入口/出口

今天：用户 -> 内核转换
系统调用，异常，设备中断
以相同方式进入内核
精心设计和重要细节
对隔离（安全）和性能至关重要

当程序发起系统调用时，需要发生什么，例如 write()？
[CPU | 用户/内核图]
CPU 资源设置为用户执行（不是内核）
32 个寄存器（包括 sp），pc，特权模式，satp
需要发生什么？
切换到管理模式
保存 32 个用户寄存器和 pc
切换到内核页表
切换到内核栈
跳转到内核 C 代码

附加目标
不让用户代码干扰用户->内核转换
例如，不在管理模式中执行用户代码！
对用户代码透明 -- 恢复时不打扰最重要
对设备中断尤其重要

今天我将专注于用户/内核转换，忽略系统调用在内核中的实现

RISC-V 重要寄存器
satp stvec sepc scause sscratch sstatus: SPP, SPIE, SIE,（参见 riscv-privileged pdf）

RISC-V 重要指令
ecall: 将 SIE 保存到 SPIE 并将 SIE = 0
切换 CPU 到内核模式（管理模式）
跳转到$stvec
sret: 切换 CPU 到先前模式（0 表示用户）
将 SIE 设置为 SPIE（启用中断）
返回到$sepc

预览：write()
write() 返回 ecall
用户\\---------------------------------------------------------------- sret
内核
uservec 在 trampoline.S
userret 在 trampoline.S
usertrap() 在 trap.c
usertrapret() 在 trap.c
syscall() 在 syscall.c ^
sys_write() 在 sysfile.c
---|

让我们观看 xv6 系统调用进入/离开内核

xv6 shell 写入其$提示符
user/sh.c第137行：write(2, "$ ", 2);
user/usys.S第29行这是write()函数，仍在用户空间
a7 告诉内核我们想要什么系统调用--SYS_write = 16
ecall -- 触发用户/内核转换

让我们首先在 ecall 上设置断点
user/sh.asm搜索：write()的ecall在地址0xca6
$ make CPUS=1 qemu-gdb
$ gdb
(gdb) b *0xca8
(gdb) c
(gdb) delete 1
(gdb) b *0xcac（以防 stepi sret 不步进）
(gdb) x/3i 0xca6

让我们打印寄存器
(gdb) p $pc
(gdb) p $sp
$pc 和$sp 在低地址--用户内存从零开始
C 在 RISC-V 上将函数参数放在 a0, a1, a2, &c;中；write() 参数：
a0 是 fd，a1 是 buf，a2 是 n
(gdb) p $a0
(gdb) p/x $a1
(gdb) x/s $a1
(gdb) p $a2
shell 正在打印$提示符，正如我们预期的

使用什么页表？
(gdb) p/x $satp
不是很有用
qemu: control-a c, info mem
有七个页面的映射[地址空间图--3.4.pdf]
指令 x2，数据，栈保护（无 PTE_U），栈
然后两个高页面：trapframe 和 trampoline
用户->内核转换的数据和代码
没有内核内存，设备，物理内存的映射

ecall 在哪里进入内核？
(gdb) p/x $stvec

让我们执行 ecall
(gdb) stepi（或 (gdb) b*$stvec 以防下一步 stepi 不步进）
我们在哪里？
(gdb) p $pc
一个很高的虚拟地址
qemu: info mem
我们仍在使用用户页表
$pc 在最后一个页面中
(gdb) x/6i $pc
这是 kernel/trampoline.S 中的 uservec
它是内核蹦床陷阱处理代码的开始
(gdb) p $sp
(gdb) p $a0
寄存器保持用户值（除了$pc）

蹦床：保存作为管理程序为陷阱执行的最初指令
必须在用户页表中，因为 ecall 不改变 satp。
在顶部以避免在用户虚拟地址空间打洞。
受保护：无 PTE_U 标志。
我们能告诉我们在管理模式吗？
我不知道直接找到模式的方法
但观察$pc 在没有 PTE_U 标志的页面中执行
没有崩溃意味着我们在管理模式中

我们是如何到这里来的？
ecall 做了四件事：
从用户模式切换到管理模式
将$pc 保存到$sepc 中 (gdb) p/x $sepc
跳转到$stvec（即设置$pc 为$stvec）(gdb) p/x $stvec
内核之前设置了$stvec，在跳转到用户空间之前
禁用（实际上是推迟）进一步中断 (gdb) p/x $sstatus
SIE 0x2 是清晰的（0x20 是 SPIE--先前的）
注意：ecall 允许用户代码切换到管理模式
但 ecall 也将$pc = $stvec
所以内核立即获得控制权，因为只有它能设置$stvec
所以用户程序本身不能以管理模式执行

ecall 能做得更少吗？
例如，不禁用中断？
现在需要发生什么？
我们还不能执行内核 C 代码...
* 保存 32 个用户寄存器值（为以后透明恢复）
* 切换到内核页表
* 为内核 C 代码设置栈
* 跳转到内核 C 代码--usertrap()

为什么 RISC-V 设计师不让 ecall 为我们做这些事？
给 O/S 设计师范围以非常快速的系统调用/异常/中断
也许 O/S 可以处理一些陷阱而无需切换页表
也许我们可以将用户和内核都映射到单个页表中
所以不需要页表切换
也许一些寄存器不必保存
也许简单的系统调用不需要栈
所以 ecall 做尽可能少的事

我们能直接把 32 个寄存器写到物理内存中的方便位置吗？
不，即使是管理模式也受页表约束
当前页表仍是用户页表，不是内核
我们能首先设置 satp 到内核页表吗？
管理模式被允许设置 satp...
但我们此时不知道内核页表的地址！
我们需要 32 个通用寄存器中的一个来保存内存地址
我们将保存 32 个用户寄存器
但所有 32 个都保存用户值，我们必须为最终返回保留

保存 32 个用户寄存器的解决方案的两个部分：
1) xv6 将第二个内核页面，trapframe，映射到用户页表中的已知虚拟地址，总是相同：0x3fffffe000
trapframe 有空间保存寄存器
内核给每个进程不同的 trapframe 页面
参见 kernel/proc.h 中的 struct trapframe
（但我们仍需要一个寄存器来保存 trapframe 的地址...）
2) RISC-V 提供 sscratch 寄存器
管理模式代码可用于临时存储
用户代码不允许使用 sscratch，所以无需保存
参见 trampoline.S 中 uservec 的开始：
csrw sscratch, a0
然后将 TRAPFRAME 加载到 a0 中
(gdb) stepi
(gdb) p/x $sscratch 0x2，旧的第一个参数 (fd)
(gdb) stepi
(gdb) stepi
(gdb) stepi
(gdb) p/x $a0 trapframe 在用户地址空间中的地址
现在 uservec() 有 32 个保存到 trapframe 的用户寄存器，通过 a0
所以它们可以在系统调用返回时恢复
让我们跳过它们
(gdb) b *0x3ffffff07e
(gdb) c

现在我们正在设置能够在内核中运行 C 代码
在此之前不行，因为 C 代码会覆盖用户寄存器和栈；因此蹦床是汇编器。
首先是栈
之前，内核将指向此进程内核栈顶部的指针放在 trapframe 中
查看 kernel/proc.h 中的 struct trapframe
"ld sp, 8(a0)" 获取内核栈指针
记住 a0 指向 trapframe
回想此时页表中映射的唯一内核数据是 trapframe，所以一切都必须从那里加载。
(gdb) stepi 检索 hart ID 到 tp 中
(gdb) stepi 我们想要跳转到内核 C 函数 usertrap()，内核之前将其保存在 trapframe 中。
"ld t0, 16(a0)" 将其提取到 t0 中，我们稍后使用它，在切换到内核页表后
(gdb) stepi 将指向内核页表的指针从 trapframe 加载到 t1 中，然后加载到 satp 中，并发出 sfence 清除 TLB。
(gdb) stepi
(gdb) stepi
(gdb) stepi

为什么在 satp 改变时没有崩溃？
毕竟我们刚在执行时切换了页表！
答案：蹦床页面在内核页表和每个用户页表中都映射到相同的虚拟地址
(gdb) p $pc
qemu: info mem 有了内核页表我们现在可以使用内核函数和数据
jr t0 是跳转到 usertrap()（使用从 trapframe 检索的 t0）
(gdb) p/x $t0
(gdb) p usertrap
(gdb) stepi
(gdb) layout src

现在我们在 kernel/trap.c 中的 usertrap()
来自用户空间的所有陷阱都遵循我们刚才看到的路径
系统调用，设备中断，异常

Q: 如果在蹦床代码执行时发生设备中断会怎样？
usertrap() 在 scause 寄存器中查看陷阱原因
(gdb) p $scause
什么是 8？
riscv-privileged.pdf 第 123 页
scause = 8 是系统调用（"来自 U 模式的环境调用"）
(gdb) next ... 直到 syscall()
(gdb) step
(gdb) next

现在我们在 syscall() kernel/syscall.c中
myproc() 使用 tp 检索当前 struct proc *
p->xxx 通常是当前进程 struct proc 中的槽
syscall() 从保存的寄存器 a7 中检索系统调用号
p->trapframe 指向 trapframe，带保存的寄存器
p->trapframe->a7 持有 16, SYS_write
p->trapframe->a0 持有 write() 第一个参数--fd
p->trapframe->a1 持有 buf
p->trapframe->a2 持有 n

Q: 为什么这段代码不能直接查看 a7？为什么必须在 p->trapframe 中查看？
(gdb) next ...
(gdb) p num
然后通过 syscalls[num]调度，函数表
(gdb) p syscalls[num]
(gdb) next ...
(gdb) step
啊哈，我们在 sys_write 中。
此时系统调用实现是相当普通的 C 代码。
让我们跳到结尾，看系统调用如何返回到用户空间。
(gdb) finish
注意 write() 产生了控制台输出（shell 的$提示符）
syscall() 的 p->tf->a0 赋值导致（最终）a0 持有返回值
RISC-V 上的 C 调用约定将返回值放在 a0 中
(gdb) next
回到 usertrap()
(gdb) p p->trapframe->a0
sys_write() 返回 2--两个字符--$和空格
(gdb) next
(gdb) step
现在我们在 usertrapret() 中，它开始返回到用户程序的过程
我们需要为下一次用户->内核转换做准备
stvec = uservec（蹦床），为下一次 ecall
trapframe satp = 内核页表，为下一次 uservec
trapframe sp = 内核栈顶
trapframe trap = usertrap
trapframe hartid = hartid（在 tp 中）
最后，蹦床使用 RISC-V sret 指令
我们需要准备一些 sret 使用的寄存器
sstatus -- "先前模式"字段 = 0 -- 用户模式
sepc -- 保存的用户程序计数器（从陷阱入口）
我们需要切换到用户页表
在 usertrapret() 中不行，因为它在用户页表中未映射。
需要在用户和内核页表中都映射的页面--蹦床。
跳转到 trampoline.S 中的 userret
(gdb) b 129
(gdb) c
(gdb) tui disable
(gdb) step
(gdb) x/8i $pc
a0 持有用户页表地址
csrw satp 切换到用户地址空间
(gdb) stepi
(gdb) stepi
(qemu) info mem
现在从 trapframe 加载 32 个寄存器
这些恢复用户寄存器
让我们跳过它们
(gdb) b *0x3ffffff11a
(gdb) c
a0 最后恢复，之后我们不能再访问 TRAPFRAME
(gdb) si
(gdb) p/x $a0 -- 从 write() 返回的值
现在我们在 sret 指令上
sret: 复制 sepc 到 pc
切换模式到用户
重新启用中断（实际上是复制 SPIE 到 SIE）
在新 pc 继续...
(gdb) p $pc
(gdb) p/x $sepc
(gdb) stepi
(gdb) p $pc
现在我们在用户程序中 ($pc = 0xcac)
从 write() 函数返回 2
(gdb) p/x $a0
我们完成了系统调用！

摘要
大部分复杂性是由于：
隔离
速度
几个设计问题思考：
邪恶程序能滥用入口机制吗？
你能想到使硬件或软件更简单的方法吗？
你能想到使陷阱更快的方法吗？