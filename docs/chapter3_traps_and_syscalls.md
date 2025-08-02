# 第 3 章: 陷阱与系统调用

## 1. 教学目标

本章旨在帮助学习者深入理解操作系统中用户态与内核态之间控制权转移的核心机制。学完本章后，你应该能够：

1.  **理解从用户态到内核态控制权转移的完整过程**：清晰地描述为何需要模式切换，以及该过程中硬件和软件各自扮演的角色。
2.  **掌握 RISC-V 的陷阱处理机制**：熟悉 `stvec`, `sepc`, `scause`, `sscratch` 等关键控制寄存器（CSRs）在陷阱处理中的功能和用途。
3.  **分析跳板页（trampoline page）的关键作用**：解释 xv6 如何利用跳板页巧妙地解决了在切换页表时仍能继续执行代码的难题。
4.  **追踪系统调用的生命周期**：能够完整地追踪一个系统调用（如 `getpid`）从用户程序发起（`ecall`）、到内核处理、再到返回用户空间的完整生命周期。

---

## 2. 核心概念：陷阱 (Trap)

在操作系统中，有三类事件会打断 CPU 正常的指令执行流，强制将控制权交给内核的特定代码进行处理。我们将这三类事件统称为**陷阱 (Trap)**：

*   **系统调用 (System Call)**：当用户程序需要操作系统提供服务时（如读写文件、创建进程），会主动执行一条特殊指令（在 RISC-V 中是 `ecall`）来请求内核的帮助。
*   **异常 (Exception)**：当一条指令执行了非法操作，例如除以零、访问一个无效的虚拟地址等，CPU 会产生一个异常。
*   **中断 (Interrupt)**：当一个外部设备（如磁盘、网卡、时钟）需要 CPU 的关注时，它会发送一个信号。这是一种异步事件，与当前正在执行的指令无关。

陷阱处理的共同目标是**透明性**：被中断的代码在恢复执行后，不应该感知到陷阱的发生。为此，内核必须在处理陷阱前后，精确地保存和恢复被打断的上下文（主要是 CPU 寄存器状态）。

在 xv6 中，所有陷阱都在内核态（Supervisor Mode）处理，这是实现系统安全和资源隔离的基础。

---

## 3. RISC-V 陷阱硬件机制

RISC-V 架构为陷阱处理提供了一套专门的控制寄存器（Control and Status Registers, CSRs）。内核通过配置这些寄存器来指导 CPU 如何应对陷阱。

以下是 xv6 中最关键的几个 CSRs：

*   `stvec` (Supervisor Trap Vector Base Address Register): 内核将它的陷阱处理入口地址写入此寄存器。发生陷阱时，CPU 会自动跳转到 `stvec` 指向的地址。
*   `sepc` (Supervisor Exception Program Counter): 发生陷阱时，CPU 会将当前的程序计数器 `pc` 保存到 `sepc` 中。当内核处理完陷阱后，执行 `sret` 指令会将 `sepc` 的值恢复到 `pc`，从而回到被打断的位置继续执行。
*   `scause` (Supervisor Cause Register): CPU 在此存入一个数字，用于描述陷阱发生的原因（是系统调用、缺页异常还是某个设备中断）。
*   `sscratch` (Supervisor Scratch Register): 这是一个“草稿”寄存器。在陷阱处理初期，所有通用寄存器都保存着用户程序的数据，内核没有可用的临时寄存器。`sscratch` 提供了一个安全的暂存空间，用于在保存用户寄存器之前进行必要的交换操作。
*   `sstatus` (Supervisor Status Register):
    *   `SIE` 位 (Supervisor Interrupt Enable): 控制是否允许设备中断。
    *   `SPP` 位 (Supervisor Previous Privilege): 记录陷阱发生前的特权级（用户态或内核态）。`sret` 指令依据此位决定返回到哪个模式。

**硬件陷阱处理流程**：
当陷阱发生时，RISC-V CPU 会原子地完成以下操作：
1.  硬件自动禁用中断（清除 `sstatus` 的 `SIE` 位）。
2.  将当前 `pc` 保存到 `sepc`。
3.  在 `scause` 中记录陷阱原因。
4.  记录当前特权级到 `sstatus` 的 `SPP` 位。
5.  将 CPU 特权级切换到 Supervisor Mode。
6.  将 `stvec` 的值加载到 `pc`，跳转到陷阱处理入口。

**关键点**：CPU 不会保存通用寄存器，也不会切换页表或堆栈。这些复杂的任务必须由内核软件来完成。

---

## 4. 跳板页：优雅地切换世界

xv6 陷阱处理面临一个核心挑战：当从用户态陷入内核时，CPU 处于 Supervisor Mode，但页表仍然是**用户页表**。这意味着 `stvec` 指向的陷阱处理代码必须在用户地址空间中是可见的。然而，陷阱处理程序很快就需要切换到**内核页表**来访问内核数据。为了在切换页表后还能继续执行，这段代码也必须在内核地址空间中可见。

xv6 通过**跳板页 (Trampoline Page)** 解决了这个问题。

*   **定义**：跳板页是一个特殊的物理页面，包含了从用户态进入内核（`uservec`）和从内核返回用户态（`userret`）的底层汇编代码。
*   **映射**：这个页面被同时映射到**每个用户进程的虚拟地址空间**和**内核的虚拟地址空间**中，并且使用相同的虚拟地址 `TRAMPOLINE`（一个固定的高地址）。

这样，无论当前 `satp` 寄存器指向用户页表还是内核页表，`TRAMPOLINE` 这个虚拟地址总是有效的，CPU 总能在这里取到正确的指令。

### 4.1 代码分析: [`kernel/trampoline.S`](source/xv6-riscv/kernel/trampoline.S)

#### 4.1.1 `uservec`: 进入内核

当用户态发生陷阱，CPU 跳转到 `stvec` 指向的 `uservec`。

```s
.globl uservec
uservec:
    # 1. 交换 a0 和 sscratch，为保存寄存器腾出空间
    csrw sscratch, a0

    # 2. 将 trapframe 的地址加载到 a0
    #    trapframe 是为每个进程预留的、用于保存用户寄存器的内存区域
    li a0, TRAPFRAME
    
    # 3. 保存所有31个用户寄存器到 trapframe
    sd ra, 40(a0)
    sd sp, 48(a0)
    ...
    # 从 sscratch 读回原始 a0 并保存
    csrr t0, sscratch
    sd t0, 112(a0)

    # 4. 从 trapframe 中加载内核的关键信息
    ld sp, 8(a0)    # 内核栈指针
    ld tp, 32(a0)   # 当前 CPU 核心 ID (hartid)
    ld t0, 16(a0)   # C 语言陷阱处理函数 usertrap() 的地址
    ld t1, 0(a0)    # 内核页表的地址

    # 5. 切换到内核页表
    csrw satp, t1
    sfence.vma

    # 6. 跳转到 C 语言陷阱处理函数
    jr t0
```

`uservec` 的工作流程清晰地展示了从用户环境到内核环境的过渡：保存用户上下文 -> 加载内核上下文 -> 切换地址空间 -> 跳转到 C 代码。

---

## 5. C 语言陷阱处理

在 `uservec` 完成底层设置后，控制权转移到 C 函数 [`usertrap()`](source/xv6-riscv/kernel/trap.c)。

### 5.1 代码分析: [`kernel/trap.c`](source/xv6-riscv/kernel/trap.c)

```c
void
usertrap(void)
{
  // 1. 确保陷阱来自用户模式
  if((r_sstatus() & SSTATUS_SPP) != 0)
    panic("usertrap: not from user mode");

  // 2. 将 stvec 指向内核陷阱向量，防止嵌套陷阱重入 usertrap
  w_stvec((uint64)kernelvec);

  struct proc *p = myproc();
  
  // 3. 保存用户 PC (sepc)，为返回做准备
  p->trapframe->epc = r_sepc();
  
  // 4. 读取 scause，判断陷阱原因
  if(r_scause() == 8){
    // **系统调用**
    if(killed(p))
      exit(-1);
    // 返回地址指向下一条指令
    p->trapframe->epc += 4;
    // 重新开启中断
    intr_on();
    // 调用系统调用分发器
    syscall();
  } else if((which_dev = devintr()) != 0){
    // **设备中断**
  } else {
    // **异常**
    printf("usertrap(): unexpected scause ...\n");
    setkilled(p); // 杀死出错的进程
  }

  // ... 检查进程是否被杀死或需要让出 CPU ...

  // 5. 调用 usertrapret() 准备返回用户空间
  usertrapret();
}
```

`usertrap` 扮演了**陷阱分发器**的角色。它根据 `scause` 寄存器的值，将控制流导向不同的处理路径：系统调用、设备中断或异常处理。

### 5.2 系统调用分发

如果陷阱是系统调用，`usertrap` 会调用 [`syscall()`](source/xv6-riscv/kernel/syscall.c)。

#### 5.2.1 代码分析: [`kernel/syscall.c`](source/xv6-riscv/kernel/syscall.c) & [`kernel/syscall.h`](source/xv6-riscv/kernel/syscall.h)

`syscall()` 的实现非常直观：

```c
void
syscall(void)
{
  int num;
  struct proc *p = myproc();

  // 1. 从 a7 寄存器获取系统调用号
  num = p->trapframe->a7;

  // 2. 检查调用号合法性，并从 syscalls 表中查找处理函数
  if(num > 0 && num < NELEM(syscalls) && syscalls[num]) {
    // 3. 调用具体的系统调用实现，并将返回值存入 a0
    p->trapframe->a0 = syscalls[num]();
  } else {
    // 无效的系统调用
    p->trapframe->a0 = -1;
  }
}
```

它通过一个函数指针数组 `syscalls[]` 将系统调用号（如 `SYS_getpid`）映射到其实现函数（如 `sys_getpid`）。系统调用的参数通过 `arg*()` 系列函数从陷阱帧中保存的用户寄存器（`a0`-`a5`）中提取。返回值则被存入陷阱帧的 `a0` 字段，最终会恢复到用户的 `a0` 寄存器中。

---

## 6. 完整追踪: `getpid()` 系统调用

让我们完整地追踪一次 `getpid()` 系统调用的生命周期：

1.  **用户空间**:
    *   C 库中的 `getpid()` 函数被调用。
    *   该函数将系统调用号 `SYS_getpid` (值为 11) 放入 `a7` 寄存器。
    *   执行 `ecall` 指令，触发陷阱。

2.  **硬件响应**:
    *   CPU 进入 Supervisor Mode，禁用中断。
    *   `pc` 被存入 `sepc`。
    *   `scause` 被设为 8 (Environment call from U-mode)。
    *   CPU 跳转到 `stvec` 指向的 `TRAMPOLINE` 上的 `uservec`。

3.  **跳板进入: `trampoline.S`**:
    *   `uservec` 保存所有用户寄存器到当前进程的 `trapframe`。
    *   `uservec` 从 `trapframe` 加载内核栈指针、`usertrap` 函数地址和内核页表地址。
    *   `uservec` 将内核页表地址写入 `satp`，切换地址空间。
    *   `uservec` 跳转到 `usertrap` 函数。

4.  **内核 C 代码处理: `trap.c` -> `syscall.c` -> `sysproc.c`**:
    *   `usertrap()` 发现 `scause` 是 8，判定为系统调用。
    *   `usertrap()` 将 `epc` 加 4，然后调用 `syscall()`。
    *   `syscall()` 从陷阱帧的 `a7` 读出系统调用号 11。
    *   `syscall()` 在 `syscalls` 数组中找到第 11 项，即 `sys_getpid` 函数，并调用它。
    *   `sys_getpid()` (位于 `sysproc.c`) 执行 `return myproc()->pid;`，返回当前进程的 PID。
    *   `syscall()` 将 `sys_getpid` 的返回值（即 PID）存入 `p->trapframe->a0`。
    *   `syscall()` 返回到 `usertrap()`。
    *   `usertrap()` 调用 `usertrapret()`。

5.  **准备返回: `trap.c`**:
    *   `usertrapret()` 设置 `stvec` 重新指向 `uservec`，为下一次用户陷阱做准备。
    *   它配置好 `sstatus` 寄存器，以便 `sret` 后能返回用户模式并开启中断。
    *   它将 `p->trapframe->epc` 的值写入 `sepc` 寄存器。
    *   最后，它调用 `trampoline.S` 中的 `userret` 函数，并将用户页表的地址作为参数传入。

6.  **跳板返回: `trampoline.S`**:
    *   `userret` 将用户页表地址写入 `satp`，切换回用户地址空间。
    *   `userret` 从 `trapframe` 中恢复所有 32 个用户寄存器（此时，`a0` 中已经是 `getpid` 的返回值）。
    *   `userret` 执行 `sret` 指令。

7.  **硬件响应**:
    *   `sret` 指令使 CPU 返回用户模式，并根据 `sstatus` 的设置重新开启中断。
    *   `sepc` 的值被恢复到 `pc`。

8.  **用户空间**:
    *   程序从 `ecall` 的下一条指令继续执行。
    *   `getpid()` 的 C 库函数从 `a0` 寄存器中读取返回值并返回给调用者。

至此，一次完整的系统调用结束。

---

## 7. 实验要求: 实现 `trace` 系统调用

为了巩固本章所学知识，你需要为 xv6 实现一个新的系统调用 `trace`。

**功能要求**:

`trace` 系统调用接受一个参数：一个“掩码”（mask），用于指定要追踪哪些系统调用。例如，如果 `fork` 的系统调用号是 1，`wait` 的系统调用号是 3，当用户调用 `trace(1 << 1 | 1 << 3)` 后，每当该进程执行 `fork` 或 `wait` 系统调用时，内核都应在控制台打印一行调试信息。

**打印格式**:

```
[PID] syscall [syscall_name] ([arg0], [arg1], ...) -> [return_value]
```
例如:
```
[3] syscall fork () -> 4
[3] syscall wait (0x...) -> 4
```

**实现提示**:

1.  在 `user/user.h` 中添加 `trace` 的用户空间声明。
2.  在 `user/usys.pl` 中添加 `trace` 的入口。
3.  在 [`kernel/syscall.h`](source/xv6-riscv/kernel/syscall.h) 中定义 `SYS_trace`。
4.  在 [`kernel/syscall.c`](source/xv6-riscv/kernel/syscall.c) 的 `syscalls` 数组中添加 `sys_trace`。
5.  在 `kernel/proc.h` 的 `struct proc` 中添加一个字段来保存追踪掩码 (e.g., `int tracemask`)。
6.  在 `kernel/sysproc.c` 中实现 `sys_trace()` 函数。它应该获取整型参数并将其保存到当前进程的 `tracemask` 字段。
7.  修改 [`syscall()`](source/xv6-riscv/kernel/syscall.c) 函数。在执行系统调用之后，检查当前进程的 `tracemask` 是否设置了对应系统调用号的位。如果设置了，就打印所需的追踪信息。

(**注意**: 本文稿只提供实验要求和高级指引，不提供完整的代码实现。)