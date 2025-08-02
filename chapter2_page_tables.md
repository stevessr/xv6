# 第 2 章: 页表 (Page Tables)

本章深入探讨操作系统中内存管理的基石——页表。我们将学习页表如何实现虚拟地址和物理地址之间的转换，这是现代操作系统实现进程隔离、内存保护和高效资源复用的核心机制。

## 1. 教学目标

1.  **理解页表的核心作用**: 明白为什么需要页表以及它在虚拟内存管理中扮演的角色。
2.  **掌握 RISC-V Sv39 分页机制**: 学习 RISC-V 架构下三级页表的结构和地址翻译过程。
3.  **分析 xv6 地址空间布局**: 探究 xv6 如何设计和映射内核与用户进程的地址空间。
4.  **掌握核心函数原理**: 理解页表硬件（如 `satp` 寄存器）与内核软件（如 [`walk`](xv6-riscv/kernel/vm.c:141) 函数）的协同工作方式。

## 2. 核心概念：为什么需要页表？

在现代操作系统中，每个进程都认为自己独享一个巨大且连续的内存空间，这个空间被称为 **虚拟地址空间 (Virtual Address Space)**。然而，计算机的物理内存（RAM）是有限的，并且需要被所有进程以及内核共享。

**页表 (Page Table)** 就是解决这一矛盾的关键。它像一本地址翻译词典，负责将指令使用的 **虚拟地址 (Virtual Address)** 转换为 **物理地址 (Physical Address)**，最终指向真实的物理内存位置。

这种间接性带来了诸多好处：
*   **隔离性**: 每个进程拥有独立的页表，操作系统可以确保一个进程无法访问到另一个进程的内存，提供了强大的安全保障。
*   **灵活性**: 虚拟地址可以是连续的，但它们映射的物理内存页可以散落在物理内存的任何地方，从而高效地利用了碎片化的物理内存。
*   **内存共享**: 多个虚拟地址可以映射到同一个物理地址。xv6 利用这一点在所有进程中共享内核代码和 `trampoline` 页。
*   **内存保护**: 页表可以为每个内存页设置访问权限（读、写、执行），防止程序发生意外或恶意的内存访问，如栈溢出或修改代码段。

## 3. RISC-V Sv39 分页硬件

xv6 运行在 RISC-V 的 Sv39 分页模式下。这意味着在 64 位的虚拟地址中，只有低 39 位被用于地址翻译。

### 3.1. Sv39 虚拟地址结构

一个 39 位的虚拟地址被分为四个部分：

```
| 38..30 (9 bits) | 29..21 (9 bits) | 20..12 (9 bits) | 11..0 (12 bits) |
|-----------------|-----------------|-----------------|-----------------|
| L2 索引         | L1 索引         | L0 索引         | 页内偏移 (Offset) |
```

*   **三级索引 (L2, L1, L0)**: 每个索引都是 9 位，用于在三级页表结构中进行查找。`2^9 = 512`，因此每级页表页恰好可以容纳 512 个页表项。
*   **页内偏移 (Offset)**: 低 12 位 (`2^12 = 4096`) 指明了在一个 4KB 内存页中的具体字节位置。

### 3.2. 三级页表结构

为了节省内存，Sv39 采用了三级页表结构。试想，如果使用单级页表，需要 `2^27` 个条目，会占用巨大的内存空间。三级结构允许在虚拟地址空间大片未被使用时，无需为之分配页表页。

地址翻译过程如下：
1.  CPU 使用 **L2 索引** 在 **根页表 (Root Page Table)** 中找到第一个页表项 (PTE)。
2.  这个 PTE 指向一个 **中级页表 (Level-1 Page Table)** 的物理地址。
3.  CPU 使用 **L1 索引** 在该中级页表中找到第二个 PTE。
4.  这个 PTE 指向一个 **底层页表 (Level-0 Page Table)** 的物理地址。
5.  CPU 使用 **L0 索引** 在该底层页表中找到最终的 PTE。
6.  这个最终的 PTE 包含目标数据页的 **物理页号 (Physical Page Number, PPN)**。
7.  将 PPN 与虚拟地址中的 **页内偏移** 组合，形成最终的 56 位物理地址。

如果在此过程中任何一个PTE被标记为无效，硬件会触发一个 **缺页异常 (Page Fault)**，交由内核处理。

![RISC-V Page Table Translation](xv6-chinese/pic/f2-2.png)

### 3.3. 页表项 (PTE)

每个 PTE 是一个 64 位的值，其结构定义在 [`kernel/riscv.h`](xv6-riscv/kernel/riscv.h:489)。

```c
// 定义在 kernel/riscv.h
#define PTE_V (1L << 0) // Valid
#define PTE_R (1L << 1) // Readable
#define PTE_W (1L << 2) // Writable
#define PTE_X (1L << 3) // Executable
#define PTE_U (1L << 4) // User-accessible

#define PA2PTE(pa) ((((uint64)pa) >> 12) << 10)
#define PTE2PA(pte) (((pte) >> 10) << 12)
```

*   **物理页号 (PPN)**: PTE 的高 44 位存储了物理页的地址（需右移12位得到）。
*   **标志位 (Flags)**: 低 10 位是标志位，用于控制内存页的访问权限。
    *   `PTE_V` (Valid): 若为 1，则 PTE 有效。否则，访问该页会触发异常。
    *   `PTE_R` (Readable): 允许读取。
    *   `PTE_W` (Writable): 允许写入。
    *   `PTE_X` (Executable): 允许执行（作为指令）。
    *   `PTE_U` (User): 若为 1，则用户模式可以访问。否则，仅内核（监督者模式）可访问。

为了启用分页，内核必须将根页表的物理地址写入 `satp` (Supervisor Address Translation and Protection) 寄存器。

## 4. xv6 地址空间布局

xv6 为内核和每个进程都维护了独立的页表。其地址空间布局在 [`kernel/memlayout.h`](xv6-riscv/kernel/memlayout.h) 中定义。

![xv6 Address Space Layout](xv6-chinese/pic/f2-3.png)

### 4.1. 内核地址空间

内核虚拟地址空间具有以下特点：

*   **直接映射 (Direct Mapping)**: 从 `KERNBASE` (0x80000000) 到 `PHYSTOP` 的大部分虚拟地址被直接映射到同值的物理地址。这包括：
    *   **内核代码 (.text)**: 权限为 `R-X` (可读、可执行)。
    *   **内核数据和物理内存**: 权限为 `RW-` (可读、可写)。
    *   **内存映射 I/O 设备**: 如 UART、PLIC 等，允许内核像访问内存一样控制硬件。

*   **高地址特殊映射**:
    *   **TRAMPOLINE**: 映射在虚拟地址空间的顶部。它在所有进程的页表中都存在，包含了用户态和内核态切换的代码。
    *   **内核栈 (KSTACK)**: 每个进程都有一个独立的内核栈。它们被映射在高地址，且每个栈下方都有一个无效的 **保护页 (Guard Page)**，以防止栈溢出破坏其他内存。

### 4.2. 用户地址空间

每个用户进程的地址空间从虚拟地址 0 开始，主要包含：
*   **代码 (Text)**: 权限为 `R-X`。
*   **数据 (Data)、BSS、堆 (Heap)**: 权限为 `RW-`。堆通过 `sbrk` 系统调用向上增长。
*   **用户栈 (Stack)**: 一个单独的页，权限为 `RW-`。其下方同样有一个保护页。
*   **TRAPFRAME**: 位于 `TRAMPOLINE` 之下，用于保存从用户态陷入内核时进程的上下文（寄存器状态）。

## 5. 核心代码分析

页表管理的核心逻辑位于 [`kernel/vm.c`](xv6-riscv/kernel/vm.c)。

### 5.1. `walk`: 查找 PTE

[`walk`](xv6-riscv/kernel/vm.c:141) 函数是页表操作的核心，它模拟硬件的地址翻译过程，在三级页表中查找一个给定虚拟地址 `va` 对应的最底层 PTE 的地址。

```c
// kernel/vm.c
pte_t *
walk(pagetable_t pagetable, uint64 va, int alloc)
{
  if(va >= MAXVA)
    panic("walk");

  // 从 L2 开始，逐级向下遍历
  for(int level = 2; level > 0; level--) {
    // 提取当前级别的索引
    pte_t *pte = &pagetable[PX(level, va)];
    
    if(*pte & PTE_V) {
      // PTE 有效，指向下一级页表
      pagetable = (pagetable_t)PTE2PA(*pte);
    } else {
      // PTE 无效，下一级页表不存在
      if(!alloc || (pagetable = (pde_t*)kalloc()) == 0)
        return 0; // 如果不允许分配或分配失败，则返回
      
      // 分配新页表页，并更新当前 PTE
      memset(pagetable, 0, PGSIZE);
      *pte = PA2PTE(pagetable) | PTE_V;
    }
  }
  // 返回 L0 PTE 的地址
  return &pagetable[PX(0, va)];
}
```
*   该函数循环两次（`level` 从 2 到 1）。
*   在每一级，它使用 [`PX`](xv6-riscv/kernel/riscv.h:557) 宏从 `va` 中提取 9 位索引，定位到当前页表中的 `pte`。
*   如果 `pte` 有效，它就使用 [`PTE2PA`](xv6-riscv/kernel/riscv.h:541) 提取下一级页表的物理地址，并继续下降。
*   如果 `pte` 无效且 `alloc` 参数为真，它会调用 [`kalloc`](xv6-riscv/kernel/kalloc.c:100) 分配一个新的物理页作为下一级页表，并用其物理地址更新 `pte`。
*   最终，它返回指向 L0 中目标 PTE 的指针。

### 5.2. `mappages`: 创建映射

[`mappages`](xv6-riscv/kernel/vm.c:220) 函数用于在页表中建立一段虚拟地址到物理地址的映射。

```c
// kernel/vm.c
int
mappages(pagetable_t pagetable, uint64 va, uint64 size, uint64 pa, int perm)
{
  uint64 a, last;
  pte_t *pte;

  a = PGROUNDDOWN(va);
  last = PGROUNDDOWN(va + size - 1);
  for(;;){
    // 1. 找到或创建 L0 PTE
    if((pte = walk(pagetable, a, 1)) == 0)
      return -1;
    if(*pte & PTE_V)
      panic("mappages: remap");
    
    // 2. 填充 PTE
    *pte = PA2PTE(pa) | perm | PTE_V;
    
    if(a == last)
      break;
    
    // 3. 移动到下一页
    a += PGSIZE;
    pa += PGSIZE;
  }
  return 0;
}
```

该函数按页遍历指定的地址范围。在每次循环中：
1.  调用 `walk` 找到目标虚拟地址 `a` 对应的 L0 PTE 的地址。如果中间页表不存在，`walk` 会负责创建它们。
2.  检查该 PTE 是否已被映射，防止重复映射。
3.  用指定的物理地址 `pa` 和权限 `perm` 填充该 PTE，并设置有效位 `PTE_V`。

### 5.3. `kvmmake`: 构建内核页表

系统启动时，[`kvmmake`](xv6-riscv/kernel/vm.c:46) 函数负责创建内核页表。

```c
// kernel/vm.c
pagetable_t
kvmmake(void)
{
  pagetable_t kpgtbl;

  kpgtbl = (pagetable_t) kalloc(); // 分配根页表页
  memset(kpgtbl, 0, PGSIZE);

  // 映射硬件设备 (UART, VIRTIO, PLIC)
  kvmmap(kpgtbl, UART0, UART0, PGSIZE, PTE_R | PTE_W);
  kvmmap(kpgtbl, VIRTIO0, VIRTIO0, PGSIZE, PTE_R | PTE_W);
  kvmmap(kpgtbl, PLIC, PLIC, 0x400000, PTE_R | PTE_W);

  // 映射内核代码
  kvmmap(kpgtbl, KERNBASE, KERNBASE, (uint64)etext-KERNBASE, PTE_R | PTE_X);
  
  // 映射内核数据和物理内存
  kvmmap(kpgtbl, (uint64)etext, (uint64)etext, PHYSTOP-(uint64)etext, PTE_R | PTE_W);

  // 映射 trampoline 页
  kvmmap(kpgtbl, TRAMPOLINE, (uint64)trampoline, PGSIZE, PTE_R | PTE_X);

  // 为每个进程映射内核栈
  proc_mapstacks(kpgtbl);
  
  return kpgtbl;
}
```
`kvmmake` 的执行流程清晰地展示了内核地址空间的构建过程。它通过多次调用 [`kvmmap`](xv6-riscv/kernel/vm.c:208)（`mappages` 的一个包装器）来建立上一节描述的所有映射。

## 6. 物理内存分配器

物理内存页的分配和释放由 [`kernel/kalloc.c`](xv6-riscv/kernel/kalloc.c) 中的代码负责。它维护一个空闲物理页的 **空闲链表 (freelist)**。
*   **`kinit()`**: 在系统启动时被调用，将从内核末尾 (`end`) 到 `PHYSTOP` 之间的所有物理内存逐页加入空闲链表。
*   **`kalloc()`**: 从空闲链表的头部取下一个空闲页并返回其地址。
*   **`kfree()`**: 将一个释放的物理页重新加入到空闲链表的头部。

由于空闲页不存储任何有效数据，分配器巧妙地利用页本身的内存来存储指向下一个空闲页的指针 (`struct run`)，从而构成了链表。

## 7. 实验要求：实现简化版 `sbrk`

为了巩固本章所学知识，请完成以下实验任务：

**任务：** 编写一个用户程序，通过调用 `sbrk(n)` 来增加或减少其地址空间。

**要求：**
1.  编写一个名为 `pgprint.c` 的用户程序。
2.  该程序首先打印其当前的程序大小（program size）。
3.  然后，调用 `sbrk(4096)` 来增加一个页面的内存。
4.  再次打印增加后的程序大小。
5.  在 xv6 中运行你的程序，观察输出是否符合预期。

**提示：**
*   你可以使用 `sbrk(0)` 来获取当前的程序大小。
*   本实验的目的是观察 `sbrk` 系统调用如何影响进程的内存大小，你无需修改内核代码，只需编写用户程序即可。
