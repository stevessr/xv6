# Lab Guide: Use Superpages

This guide covers the second, more advanced task of the page table lab: modifying xv6 to use 2MB superpages (or megapages) for large memory allocations.

---

## Goal

The objective is to enhance the kernel's memory management to use a single level-1 Page Table Entry (PTE) to map a 2MB region of physical memory, instead of using 512 level-2 PTEs. This should happen when a process requests a large chunk of memory via `sbrk()` that is suitably aligned.

## Conceptual Steps

This is a complex task that involves changes across the memory management system. A direct code solution is long, so this guide provides a high-level strategy.

### 1. Define Superpage Constants

First, define constants related to superpages in `kernel/riscv.h` to be used throughout the kernel.

**File: `kernel/riscv.h`**
```diff
--- a/kernel/riscv.h
+++ b/kernel/riscv.h
@@ -3,6 +3,8 @@
 #define PGSIZE 4096 // bytes per page
 #define PGSHIFT 12  // bits of offset within a page
 #define PGMASK (PGSIZE - 1)
+#define MEGAPAGE_SIZE (2 * 1024 * 1024) // 2MB
+#define MEGAPAGE_SHIFT 21 // 2^21 = 2MB
 
 #define KERNBASE 0x80000000L
 #define PHYSTOP (KERNBASE + 128*1024*1024)

```

### 2. Implement a Superpage Physical Allocator

You need a way to allocate and free 2MB-aligned chunks of physical memory. A simple approach is to create a dedicated allocator for this in `kernel/kalloc.c`.

**File: `kernel/kalloc.c`**
1.  **Data Structures:** Define a `struct` for a freelist of superpages and a lock to protect it.
2.  **`kinit()`:** In `kinit()`, before initializing the main 4KB page allocator with `freerange`, reserve a portion of physical memory for superpages. Iterate through this reserved memory in 2MB chunks and add them to your superpage freelist by calling your new `superfree()` function.
3.  **`superalloc()`:** This function should acquire the lock, pop a 2MB block from the freelist, release the lock, and return the block's address.
4.  **`superfree()`:** This function should acquire the lock, add the provided 2MB block back to the freelist, and release the lock.
5.  **`defs.h`:** Add prototypes for `superalloc()` and `superfree()` to `kernel/defs.h`.

### 3. Modify Core VM Functions in `vm.c`

This is the most involved part. `uvmalloc`, `uvmunmap`, and `uvmcopy` must all be made superpage-aware.

*   **`uvmalloc` (in `proc.c` -> `growproc` -> `uvmalloc`):**
    *   When allocating memory, check if the current virtual address is 2MB-aligned and if the allocation size is at least 2MB.
    *   If so, attempt to get a 2MB physical block from `superalloc()`.
    *   If successful, you must manually walk the page table to the level-1 PTE for that virtual address. If the level-1 page table page doesn't exist, you'll need to allocate it.
    *   Set the level-1 PTE to be a leaf entry pointing to the 2MB physical block. A non-leaf PTE becomes a leaf (and thus a superpage) by setting any of the `PTE_R`, `PTE_W`, or `PTE_X` bits.
    *   After successfully mapping a superpage, advance the allocation loop by 2MB.

*   **`uvmunmap`:**
    *   This function must be able to detect and deallocate superpages.
    *   When unmapping a virtual address, you must manually walk the page table to check if the address falls within a superpage. You can do this by inspecting the level-1 PTE. If it's a valid leaf PTE, you've found a superpage.
    *   If a superpage is found, call `superfree()` on the associated physical address and clear the level-1 PTE.
    *   The unmapping loop must then be advanced by 2MB.

*   **`uvmcopy` (for `fork()`):**
    *   When a process forks, `uvmcopy` must correctly duplicate superpage mappings.
    *   It needs to walk the parent's page table and check for superpage entries at level 1.
    *   If a superpage is found, it must: 
        1. Allocate a new 2MB block for the child using `superalloc()`.
        2. Copy the entire 2MB of data from the parent's physical block to the child's.
        3. Map the new block as a superpage in the child's page table.
    *   The copy loop should then be advanced by 2MB.

This task requires a deep understanding of the page table structure and virtual memory functions. Start small, test frequently with the `superpg_test` case in `pgtbltest`, and use `vmprint` to debug your page tables.
