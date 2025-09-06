# 实验指南：打印页表

本指南将引导您完成页表实验的第一个任务：实现 `vmprint()` 函数以可视化页表。

---

## 目标

本任务的目标是实现一个由 `kpgtbl()` 系统调用所调用的 `vmprint()` 函数。该函数应以层级格式打印出页表内容，显示每个有效的页表条目（PTE）、其对应的物理地址以及它在页表树中的深度。

## 实现步骤

### 1. 在 `defs.h` 中添加 `vmprint` 函数原型

为了让 `sysproc.c` 中的系统调用实现能够调用 `vmprint` 函数，您必须首先将其函数原型添加到 `kernel/defs.h` 头文件中。

**文件: `kernel/defs.h`**
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

### 2. 在 `vm.c` 中实现 `vmprint`

此任务的核心是在 `kernel/vm.c` 中实现 `vmprint` 函数及其递归辅助函数。该辅助函数将遍历三级页表，并打印出每个有效条目的详细信息。

**文件: `kernel/vm.c`**

将以下代码添加到文件末尾。此实现提供了实验所要求的层级视图。

```c
// vmprint 的辅助函数。
// 递归地打印页表条目。
static void
vmprint_recursive(pagetable_t pagetable, int level)
{
  // 一个页表包含 512 个条目 (2^9)。
  for(int i = 0; i < 512; i++){
    pte_t pte = pagetable[i];

    // 检查 PTE 是否有效 (PTE_V 位是否被设置)。
    if(pte & PTE_V){
      // 打印缩进以可视化树状结构。
      for (int j = 0; j < level; j++) {
        printf(".. ");
      }
      
      uint64 pa = PTE2PA(pte);
      printf("..%d: pte %p pa %p\n", i, pte, pa);

      // 如果 PTE 的 R, W, X 位都为零，那么它是一个指向下一级页表的
      // 分支。否则，它是一个叶子条目。
      if((pte & (PTE_R | PTE_W | PTE_X)) == 0){
        // 递归到页表的下一级。
        vmprint_recursive((pagetable_t)pa, level + 1);
      }
    }
  }
}

// vmprint 主函数，由 kpgtbl 系统调用调用。
void
vmprint(pagetable_t pagetable)
{
  printf("page table %p\n", pagetable);
  vmprint_recursive(pagetable, 0);
}
```

*注意：实验指导要求打印出每个PTE对应的虚拟地址。上述实现提供了一个简化的视图。更高级的版本需要您在递归的每一层传递并构造虚拟地址，这是一个很好的挑战练习。*

完成这些更改后，您可以使用 `make grade` 运行 `print_kpgtbl()` 测试来检查您的代码。

```