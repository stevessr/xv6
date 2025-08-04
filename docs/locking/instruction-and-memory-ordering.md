# 指令和内存排序

很自然地会认为程序是按照源代码语句出现的顺序执行的。对于单线程代码来说，这是一个合理的心理模型，但是当多个线程通过共享内存交互时，这是不正确的。一个原因是编译器发出的加载和存储指令的顺序与源代码所暗示的顺序不同，并且可能完全省略它们（例如通过在寄存器中缓存数据）。另一个原因是 CPU 可能会为了提高性能而乱序执行指令。例如，CPU 可能会注意到在一个串行指令序列中，A 和 B 互不依赖。CPU 可能会先启动指令 B，要么是因为它的输入比 A 的输入先准备好，要么是为了重叠 A 和 B 的执行。

作为一个可能出错的例子，在 `push` 的这段代码中，如果编译器或 CPU 将对应于第 (2) 行的存储移动到第 (3) 行的 [`release`](/source/xv6-riscv/kernel/defs.h) 之后，那将是一场灾难：


```
c
      l = malloc(sizeof *l);
      l->data = data;
      acquire(&listlock);
      l->next = list;   // (2)
      list = l;
      release(&listlock);  // (3)

```


如果发生了这种重排序，将会有一个时间窗口，在此期间另一个 CPU 可以获取锁并观察到更新后的 `list`，但会看到一个未初始化的 `list->next`。

好消息是，编译器和 CPU 通过遵循一组称为**内存模型**的规则来帮助并发程序员，并通过提供一些原语来帮助程序员控制重排序。

为了告诉硬件和编译器不要重排序，xv6 在 [`acquire`](/source/xv6-riscv/kernel/defs.h) 和 [`release`](/source/xv6-riscv/kernel/defs.h) 中都使用了 `__sync_synchronize()`。`__sync_synchronize()` 是一个**内存屏障**：它告诉编译器和 CPU 不要在屏障的两侧重排序加载或存储。xv6 的 [`acquire`](/source/xv6-riscv/kernel/defs.h) 和 [`release`](/source/xv6-riscv/kernel/defs.h) 中的屏障在几乎所有重要的情况下都强制了顺序，因为 xv6 在访问共享数据时使用锁。第 9 章讨论了一些例外情况。