# 来自用户空间的陷阱

Xv6 根据陷阱是在内核中执行还是在用户代码中执行来区别处理。以下是来自用户代码的陷阱的故事；来自内核代码的陷阱在“来自内核空间的陷阱”一节中描述。

如果在用户空间执行时发生陷阱，可能是用户程序进行了系统调用（`ecall` 指令），或者执行了非法操作，或者设备中断。来自用户空间的陷阱的高级路径是 [`uservec`](/source/xv6-riscv/kernel/trampoline.S.md)<!-- -->，然后是 [[`usertrap`](/source/xv6-riscv/kernel/trap.c.md)]；返回时是 [[`usertrapret`](/source/xv6-riscv/kernel/defs.h.md)]<!-- -->，然后是 [`userret`](/source/xv6-riscv/kernel/trampoline.S.md)<!-- -->。

xv6 陷阱处理设计的一个主要限制是 RISC-V 硬件在强制陷阱时不切换页表。这意味着 `stvec` 中的陷阱处理程序地址必须在用户页表中具有有效映射，因为在陷阱处理代码开始执行时，该页表是有效的。此外，xv6 的陷阱处理代码需要切换到内核页表；为了能够在切换后继续执行，内核页表也必须具有对 `stvec` 指向的处理程序的映射。

Xv6 使用蹦床页来满足这些要求。蹦床页包含 `uservec`，即 `stvec` 指向的 xv6 陷阱处理代码。蹦床页在每个进程的页表中映射在地址 `TRAMPOLINE`，该地址位于虚拟地址空间的顶部，以便它位于程序自己使用的内存之上。蹦床页也映射在内核页表中的地址 `TRAMPOLINE`。参见图 2-3 和图 3-2。因为蹦床页映射在用户页表中，所以陷阱可以在监督者模式下在那里开始执行。因为蹦床页在内核地址空间中映射在相同的地址，所以陷阱处理程序可以在切换到内核页表后继续执行。

`uservec` 陷阱处理程序的代码在 [`trampoline.S`](/source/xv6-riscv/kernel/trampoline.S.md) 中。当 `uservec` 启动时，所有 32 个寄存器都包含被中断的用户代码所拥有的值。这 32 个值需要保存在内存中的某个地方，以便稍后内核可以在返回用户空间之前恢复它们。存储到内存需要使用一个寄存器来保存地址，但此时没有可用的通用寄存器！幸运的是，RISC-V 以 `sscratch` 寄存器的形式提供了帮助。`uservec` 开头的 `csrw` 指令将 `a0` 保存在 `sscratch` 中。现在 `uservec` 有一个寄存器（`a0`）可以使用。

`uservec` 的下一个任务是保存 32 个用户寄存器。内核为每个进程分配一页内存用于一个 `trapframe` 结构，该结构（除其他外）有空间保存 32 个用户寄存器 ([`proc.h`](/source/xv6-riscv/kernel/proc.h.md))。因为 `satp` 仍然引用用户页表，所以 `uservec` 需要将陷阱帧映射在用户地址空间中。Xv6 将每个进程的陷阱帧映射在该进程的用户页表中的虚拟地址 `TRAPFRAME`；`TRAPFRAME` 就在 `TRAMPOLINE` 下面。进程的 `p->trapframe` 也指向陷阱帧，尽管是在其物理地址上，以便内核可以通过内核页表使用它。

因此，`uservec` 将地址 `TRAPFRAME` 加载到 `a0` 中，并在那里保存所有用户寄存器，包括从 `sscratch` 读回的用户 `a0`。

`trapframe` 包含当前进程的内核堆栈地址、当前 CPU 的 hartid、[`usertrap`](/source/xv6-riscv/kernel/trap.c.md) 函数的地址以及内核页表的地址。`uservec` 检索这些值，将 `satp` 切换到内核页表，然后跳转到 [`usertrap`](/source/xv6-riscv/kernel/trap.c.md)。

[`usertrap`](/source/xv6-riscv/kernel/trap.c.md) 的工作是确定陷阱的原因，处理它，然后返回 ([`trap.c`](/source/xv6-riscv/kernel/trap.c.md))。它首先更改 `stvec`，以便在内核中的陷阱将由 [`kernelvec`](/source/xv6-riscv/kernel/trap.c.md) 而不是 `uservec` 处理。它保存 `sepc` 寄存器（保存的用户程序计数器），因为 [`usertrap`](/source/xv6-riscv/kernel/trap.c.md) 可能会调用 [`yield`](/source/xv6-riscv/kernel/defs.h.md) 切换到另一个进程的内核线程，并且该进程可能会返回到用户空间，在此过程中它将修改 `sepc`。如果陷阱是系统调用，[`usertrap`](/source/xv6-riscv/kernel/trap.c.md) 调用 [`syscall`](/source/xv6-riscv/kernel/defs.h.md) 来处理它；如果是设备中断，则调用 [`devintr`](/source/xv6-riscv/kernel/trap.c.md)；否则是异常，内核将终止出错的进程。系统调用路径将保存的用户程序计数器加四，因为 RISC-V 在系统调用的情况下，会将程序指针指向 `ecall` 指令，但用户代码需要在后续指令处恢复执行。在退出时，[`usertrap`](/source/xv6-riscv/kernel/trap.c.md) 检查进程是否已被终止或应该让出 CPU（如果此陷阱是定时器中断）。

返回用户空间的第一步是调用 [[`usertrapret`](/source/xv6-riscv/kernel/defs.h.md)]<!-- -->。此函数设置 RISC-V 控制寄存器，为将来来自用户空间的陷阱做准备：将 `stvec` 设置为 `uservec` 并准备 `uservec` 依赖的陷阱帧字段。[`usertrapret`](/source/xv6-riscv/kernel/defs.h.md) 将 `sepc` 设置为先前保存的用户程序计数器。最后，[`usertrapret`](/source/xv6-riscv/kernel/defs.h.md) 在映射在用户和内核页表中的蹦床页上调用 `userret`；原因是在 `userret` 中的汇编代码将切换页表。

[`usertrapret`](/source/xv6-riscv/kernel/defs.h.md) 对 `userret` 的调用在 `a0` 中传递一个指向进程用户页表的指针 ([`trampoline.S`](/source/xv6-riscv/kernel/trampoline.S.md))。`userret` 将 `satp` 切换到进程的用户页表。回想一下，用户页表映射了蹦床页和 `TRAPFRAME`，但没有映射内核的其他任何内容。在用户和内核页表中以相同虚拟地址映射的蹦床页允许 `userret` 在更改 `satp` 后继续执行。从这一点开始，`userret` 唯一可以使用的数据是寄存器内容和陷阱帧的内容。`userret` 将 `TRAPFRAME` 地址加载到 `a0` 中，通过 `a0` 从陷阱帧中恢复保存的用户寄存器，恢复保存的用户 `a0`，并执行 `sret` 返回到用户空间。