# Lab Answer: Print a Page Table

This file provides the complete code solution for the `vmprint` task, including the logic to correctly calculate and display the virtual address for each page table entry.

---

## 1. `kernel/defs.h`

Add the function prototype for `vmprint`.

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

Replace the existing empty `vmprint` function (or add this if it doesn't exist) with the following implementation. This includes a recursive helper that constructs the full 64-bit virtual address for each entry.

```c
// Add this function definition in vm.c

// Recursive helper for vmprint.
// level: current page table level (0, 1, or 2 from the root).
// va_base: the virtual address prefix from parent levels.
static void
vmprint_recursive(pagetable_t pagetable, int level, uint64 va_base)
{
  if (level > 2)
    return;

  for (int i = 0; i < 512; i++) {
    pte_t pte = pagetable[i];
    if (pte & PTE_V) {
      // Calculate the full virtual address for this entry.
      // The index `i` at the current `level` contributes a part to the VA.
      uint64 va = va_base | ((uint64)i << (12 + 9 * (2 - level)));
      
      // RISC-V Sv39 virtual addresses are 39 bits. The top bit (bit 38)
      // is sign-extended to fill the upper 25 bits of the 64-bit address.
      // We perform this sign extension for level 0 (the root of the 3-level page table).
      if (level == 0 && (i & (1 << 8))) { // Check if the 9th bit of the L0 index is 1
        va |= 0xFFFFFF8000000000; // Sign-extend the address.
      }

      // Print indentation to show the tree structure.
      for (int j = 0; j <= level; j++) {
        printf(" ..");
      }
      
      // Print the entry information.
      printf("0x%p: pte %p pa %p\n", va, pte, PTE2PA(pte));

      // If the PTE is an internal node (not a leaf), recurse into the next level.
      if ((pte & (PTE_R | PTE_W | PTE_X)) == 0) {
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

