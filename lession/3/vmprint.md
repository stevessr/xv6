# Lab Guide: Print a Page Table

This guide covers the first task of the page table lab: implementing the `vmprint()` function to visualize a page table.

---

## Goal

The objective is to implement a function `vmprint()` that is called by the `kpgtbl()` system call. This function should print the contents of a page table in a hierarchical format, showing each valid Page Table Entry (PTE), its corresponding physical address, and its depth in the page table tree.

## Implementation Steps

### 1. Add `vmprint` Prototype to `defs.h`

To make the `vmprint` function callable from the system call implementation in `sysproc.c`, you must first add its prototype to the `kernel/defs.h` header file.

**File: `kernel/defs.h`**
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

### 2. Implement `vmprint` in `vm.c`

The core of this task is to implement the `vmprint` function and a recursive helper in `kernel/vm.c`. The helper function will traverse the 3-level page table and print the details for each valid entry.

**File: `kernel/vm.c`**

Add the following code to the end of the file. This implementation provides the hierarchical view requested by the lab.

```c
// A helper function for vmprint.
// Recursively prints the page table entries.
static void
vmprint_recursive(pagetable_t pagetable, int level)
{
  // A page table has 512 entries (2^9).
  for(int i = 0; i < 512; i++){
    pte_t pte = pagetable[i];

    // Check if the PTE is valid (the PTE_V bit is set).
    if(pte & PTE_V){
      // Print indentation to visualize the tree structure.
      for (int j = 0; j < level; j++) {
        printf(".. ");
      }
      
      uint64 pa = PTE2PA(pte);
      printf("..%d: pte %p pa %p\n", i, pte, pa);

      // A PTE is a branch to a lower-level table if the R, W, and X
      // bits are all zero. Otherwise, it's a leaf entry.
      if((pte & (PTE_R | PTE_W | PTE_X)) == 0){
        // Recurse into the next level of the page table.
        vmprint_recursive((pagetable_t)pa, level + 1);
      }
    }
  }
}

// The main vmprint function, called by the kpgtbl system call.
void
vmprint(pagetable_t pagetable)
{
  printf("page table %p\n", pagetable);
  vmprint_recursive(pagetable, 0);
}
```

*Note: The lab description asks for the virtual address corresponding to each PTE. The implementation above provides a simplified view. A more advanced version would require passing down and constructing the virtual address at each level of the recursion, which can be a good challenge exercise.*

After completing these changes, you can run the `print_kpgtbl()` test using `make grade` to check your work.

```
