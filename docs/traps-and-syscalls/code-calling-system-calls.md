# 代码：调用系统调用

第一章以 [`initcode.S`](../../../xv6-riscv/user/initcode.S) 调用 `exec` 系统调用结束。让我们看看用户调用是如何到达内核中 `exec` 系统调用实现的。

[`initcode.S`](../../../xv6-riscv/user/initcode.S) 将 `exec` 的参数放在寄存器 `a0` 和 `a1` 中，并将系统调用号放在 `a7` 中。系统调用号与 `syscalls` 数组中的条目匹配，这是一个函数指针表 ([`syscall.c`](../../../xv6-riscv/kernel/syscall.c))。`ecall` 指令陷入内核并导致 `uservec`、`usertrap`，然后是 `syscall` 执行，如我们上面所见。

`syscall` ([`syscall.c`](../../../xv6-riscv/kernel/syscall.c)) 从陷阱帧中保存的 `a7` 中检索系统调用号，并用它来索引 `syscalls`。对于第一个系统调用，`a7` 包含 `SYS_exec` ([`syscall.h`](../../../xv6-riscv/kernel/syscall.h))，导致调用系统调用实现函数 `sys_exec`。

当 `sys_exec` 返回时，`syscall` 将其返回值记录在 `p->trapframe->a0` 中。这将导致原始用户空间对 `exec()` 的调用返回该值，因为 RISC-V 上的 C 调用约定将返回值放在 `a0` 中。系统调用通常返回负数表示错误，返回零或正数表示成功。如果系统调用号无效，`syscall` 会打印错误并返回 -1。