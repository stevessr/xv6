# 代码: mycpu 和 myproc

Xv6经常需要一个指向当前进程的`proc`结构的指针。在单处理器上，可以有一个全局变量指向当前的`proc`。这在多核机器上行不通，因为每个CPU执行不同的进程。解决这个问题的方法是利用每个CPU都有自己的一套寄存器这一事实。

当一个给定的CPU在内核中执行时，xv6确保CPU的`tp`寄存器始终保存CPU的hartid。RISC-V对其CPU进行编号，给每个CPU一个唯一的hartid。[`mycpu`](/source/xv6-riscv/kernel/proc.c)使用`tp`来索引一个`cpu`结构数组，并返回当前CPU的结构。一个`struct cpu`持有一个指向当前在该CPU上运行的进程（如果有的话）的`proc`结构的指针，为CPU的调度器线程保存的寄存器，以及管理中断禁用所需的嵌套自旋锁计数。

确保CPU的`tp`持有CPU的hartid有点复杂，因为用户代码可以自由修改`tp`。[`start`](/source/xv6-riscv/user/ulib.c)在CPU启动序列的早期，仍在机器模式下时设置`tp`寄存器。[`usertrapret`](/source/xv6-riscv/kernel/defs.h)在蹦床页中保存`tp`，以防用户代码修改它。最后，`uservec`在从用户空间进入内核时恢复保存的`tp`。编译器保证在内核代码中永远不会修改`tp`。如果xv6可以在需要时向RISC-V硬件请求当前的hartid会更方便，但RISC-V只允许在机器模式下这样做，而不是在监督者模式下。

[`cpuid`](/source/xv6-riscv/kernel/defs.h)和[`mycpu`](/source/xv6-riscv/kernel/proc.c)的返回值是脆弱的：如果定时器中断并导致线程让出并在稍后在不同的CPU上恢复执行，先前返回的值将不再正确。为了避免这个问题，xv6要求调用者禁用中断，并且只有在他们完成使用返回的`struct cpu`后才启用它们。

函数[`myproc`](/source/xv6-riscv/kernel/proc.c)返回当前CPU上运行的进程的`struct proc`指针。[`myproc`](/source/xv6-riscv/kernel/proc.c)禁用中断，调用[`mycpu`](/source/xv6-riscv/kernel/proc.c)，从`struct cpu`中获取当前进程指针（`c->proc`），然后启用中断。[`myproc`](/source/xv6-riscv/kernel/proc.c)的返回值即使在启用中断的情况下也是安全的：如果定时器中断将调用进程移动到不同的CPU，它的`struct proc`指针将保持不变。