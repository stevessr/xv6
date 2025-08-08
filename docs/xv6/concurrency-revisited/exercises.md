# 练习

1. 修改 xv6 的管道实现，允许对同一个管道的读和写在不同的 CPU 上并行进行。
2. 修改 xv6 的 [`scheduler()`](/source/xv6-riscv/kernel/proc.c.md#scheduler-kernel-proc-c)，以减少不同 CPU 同时寻找可运行进程时的锁竞争。
3. 消除 xv6 的 [`fork()`](/source/xv6-riscv/kernel/sysproc.c.md#fork-kernel-sysproc-c) 中的一些串行化。