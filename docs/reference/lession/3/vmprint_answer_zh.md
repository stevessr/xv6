# 实验解答：打印页表

本文件为 `vmprint` 任务提供了完整的代码解答，包含了正确计算并显示每个页表条目对应虚拟地址的逻辑。

---

## 1. `kernel/defs.h`

添加 `vmprint` 函数的原型。

```diff
--- a/kernel/defs.h
+++ b/kernel/defs.h
@@ -123,6 +123,7 @@
 int             copyout(pagetable_t, uint64, char *, uint64);
 int             copyin(pagetable_t, char *, uint64, uint64);
 int             copyinstr(pagetable_t, char *, uint64, uint64);
+void            vmprint(pagetable_t);
 
 //sleeplock.c
 void            acquiresleep(struct sleeplock*);

```

## 2. `kernel/vm.c`

使用以下实现替换现有（或空的）`vmprint` 函数。此实现包含一个递归辅助函数，它会为每个条目构建完整的64位虚拟地址。

```c
// 在 vm.c 中添加此函数定义

// vmprint 的递归辅助函数
// level: 当前页表级别（从根开始为 0, 1, 或 2）
// va_base: 从父级别继承的虚拟地址前缀
static void
vmprint_recursive(pagetable_t pagetable, int level, uint64 va_base)
{
  if (level > 2)
    return;

  for (int i = 0; i < 512; i++) {
    pte_t pte = pagetable[i];
    if (pte & PTE_V) {
      // 为此条目计算完整的虚拟地址
      // 当前 level 的索引 `i` 构成了VA的一部分
      uint64 va = va_base | ((uint64)i << (12 + 9 * (2 - level)));
      
      // RISC-V Sv39 虚拟地址为39位。最高位（第38位）
      // 需要进行符号扩展，以填充64位地址的高25位。
      // 我们在第0级（三级页表的根）进行此符号扩展。
      if (level == 0 && (i & (1 << 8))) { // 检查L0索引的第9位是否为1
        va |= 0xFFFFFF8000000000; // 符号扩展地址
      }

      // 打印缩进以显示树状结构
      for (int j = 0; j <= level; j++) {
        printf(" ..");
      }
      
      // 打印条目信息
      printf("0x%p: pte %p pa %p\n", va, pte, PTE2PA(pte));

      // 如果PTE是一个内部节点（非叶子），则递归到下一级
      if ((pte & (P_R | P_W | P_X)) == 0) {
        vmprint_recursive((pagetable_t)PTE2PA(pte), level + 1, va);
      }
    }
  }
}

void
vmprint(pagetable_t pagetable)
{
  printf("page table %p\n", pagetable);
  vmprint_recursive(pagetable, 0, 0);
}
```

