## 代码：创建地址空间

大多数用于操作地址空间和页表的 xv6 代码位于 [`vm.c`](/source/xv6-riscv/kernel/vm.c.md) 中。核心数据结构是 `pagetable_t`，它实际上是一个指向 RISC-V 根页表页的指针；一个 `pagetable_t` 可以是内核页表，也可以是每个进程的页表之一。核心函数是 [`walk`](/source/xv6-riscv/kernel/vm.c.md)，它查找虚拟地址的 PTE，和 [`mappages`](/source/xv6-riscv/kernel/defs.h.md)，它为新映射安装 PTE。以 `kvm` 开头的函数操作内核页表；以 `uvm` 开头的函数操作用户页表；其他函数则两者都用。[`copyout`](/source/xv6-riscv/user/usertests.c.md) 和 [`copyin`](/source/xv6-riscv/user/usertests.c.md) 将数据复制到或从来自由系统调用参数提供的用户虚拟地址；它们在 `vm.c` 中，因为它们需要显式地转换这些地址以找到相应的物理内存。

在引导序列的早期，[`main`](/source/xv6-riscv/user/zombie.c.md) 调用 [`kvminit`](/source/xv6-riscv/kernel/defs.h.md)，使用 [`kvmmake`](/source/xv6-riscv/kernel/vm.c.md) 创建内核的页表。这个调用发生在 xv6 在 RISC-V 上启用分页之前，所以地址直接指向物理内存。[`kvmmake`](/source/xv6-riscv/kernel/vm.c.md) 首先分配一页物理内存来存放根页表页。然后它调用 [`kvmmap`](/source/xv6-riscv/kernel/defs.h.md) 来安装内核需要的转换。这些转换包括内核的指令和数据、直到 `PHYSTOP` 的物理内存，以及实际上是设备的内存范围。[`proc_mapstacks`](/source/xv6-riscv/kernel/defs.h.md) 为每个进程分配一个内核栈。它调用 [`kvmmap`](/source/xv6-riscv/kernel/defs.h.md) 将每个栈映射到由 `KSTACK` 生成的虚拟地址，这为无效的栈保护页留出了空间。

[`kvmmap`](/source/xv6-riscv/kernel/defs.h.md) 调用 [`mappages`](/source/xv6-riscv/kernel/defs.h.md)，它将一个虚拟地址范围到相应物理地址范围的映射安装到一个页表中。它对范围内的每个虚拟地址，以页为间隔分别执行此操作。对于要映射的每个虚拟地址，[`mappages`](/source/xv6-riscv/kernel/defs.h.md) 调用 [`walk`](/source/xv6-riscv/kernel/vm.c.md) 来查找该地址的 PTE 地址。然后它初始化 PTE 以保存相关的物理页号、所需的权限（`PTE_W`、`PTE_X` 和/或 `PTE_R`）和 `PTE_V` 以将 PTE 标记为有效。

[`walk`](/source/xv6-riscv/kernel/vm.c.md) 模仿 RISC-V 分页硬件查找虚拟地址的 PTE 的过程（参见图 2）。[`walk`](/source/xv6-riscv/kernel/vm.c.md) 一次下降一级页表，使用每一级的 9 位虚拟地址来索引相关的页目录页。在每一级，它要么找到下一级页目录页的 PTE，要么找到最终页的 PTE。如果第一或第二级页目录页中的 PTE 无效，则所需的目录页尚未分配；如果设置了 `alloc` 参数，[`walk`](/source/xv6-riscv/kernel/vm.c.md) 会分配一个新的页表页，并将其物理地址放入 PTE 中。它返回树中最底层 PTE 的地址。

上述代码依赖于物理内存被直接映射到内核虚拟地址空间。例如，当 [`walk`](/source/xv6-riscv/kernel/vm.c.md) 下降页表的级别时，它从一个 PTE 中提取下一级页表的（物理）地址，然后使用该地址作为虚拟地址来获取下一级的 PTE。

[`main`](/source/xv6-riscv/user/zombie.c.md) 调用 [`kvminithart`](/source/xv6-riscv/kernel/defs.h.md) 来安装内核页表。它将根页表页的物理地址写入 `satp` 寄存器。此后，CPU 将使用内核页表转换地址。由于内核使用直接映射，下一条指令的现在的虚拟地址将映射到正确的物理内存地址。

每个 RISC-V CPU 都在一个翻译后备缓冲区 (TLB) 中缓存页表条目，当 xv6 更改页表时，它必须告诉 CPU 使相应的缓存 TLB 条目无效。如果不这样做，那么在稍后的某个时间点，TLB 可能会使用一个旧的缓存映射，指向一个在此期间已分配给另一个进程的物理页，结果，一个进程可能会在另一个进程的内存上乱写。RISC-V 有一个指令 [`sfence.vma`](/source/xv6-riscv/kernel/riscv.h.md#sfence.vma-kernel-riscv-h)，可以刷新当前 CPU 的 TLB。Xv6 在 [`kvminithart`](/source/xv6-riscv/kernel/defs.h.md) 中重新加载 `satp` 寄存器后，以及在切换到用户页表返回用户空间之前的蹦床代码中执行 [`sfence.vma`](/source/xv6-riscv/kernel/riscv.h.md#sfence.vma-kernel-riscv-h)。

在更改 `satp` 之前，也有必要发出 [`sfence.vma`](/source/xv6-riscv/kernel/riscv.h.md#sfence.vma-kernel-riscv-h)，以等待所有未完成的加载和存储完成。这种等待确保了对页表的先前更新已经完成，并确保了先前的加载和存储使用旧的页表，而不是新的页表。

为了避免刷新完整的 TLB，RISC-V CPU 可能支持地址空间标识符 (ASID)。然后，内核可以只刷新特定地址空间的 TLB 条目。Xv6 不使用此功能。