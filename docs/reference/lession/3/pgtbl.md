# Lab Guide: Page Tables

This guide walks through the two main tasks for the page table lab: printing a page table and implementing superpages.

---

## Part 1: Print a Page Table (Easy)

The goal is to implement a function `vmprint()` that visualizes the structure of a given page table, including virtual addresses, PTE contents, and physical addresses.

### 1. Add `vmprint` Prototype

Add the function prototype for `vmprint` to `kernel/defs.h` to make it accessible from other parts of the kernel.

**File: `kernel/defs.h`**
```diff
--- a/kernel/defs.h
+++ b/kernel/defs.h
@@ -123,6 +123,7 @@
 int             copyout(pagetable_t, uint64, char *, uint64);
 int             copyin(pagetable_t, char *, uint64, uint64);
 int             copyinstr(pagetable_t, char *, uint64, uint64);
+void            vmprint(pagetable_t);
 
 // sleeplock.c
 void            acquiresleep(struct sleeplock*);

```

### 2. Implement `vmprint`

Implement `vmprint` and a recursive helper function in `kernel/vm.c`. The helper will traverse the page table tree and print information for each valid PTE.

**File: `kernel/vm.c`**

Add the following code to the end of the file.

```c
// A helper function for vmprint.
// Recursively prints the page table entries.
static void
vmprint_recursive(pagetable_t pagetable, int level)
{
  // A page table has 512 entries.
  for(int i = 0; i < 512; i++){
    pte_t pte = pagetable[i];

    // Check if the PTE is valid.
    if(pte & PTE_V){
      // Print indentation to show the level.
      for (int j = 0; j < level; j++) {
        printf(".. ");
      }
      
      uint64 pa = PTE2PA(pte);
      printf("..%d: pte %p pa %p
", i, pte, pa);

      // If the PTE is a branch (not a leaf), recurse.
      if((pte & (PTE_R | PTE_W | PTE_X)) == 0){
        vmprint_recursive((pagetable_t)pa, level + 1);
      }
    }
  }
}

void
vmprint(pagetable_t pagetable)
{
  printf("page table %p
", pagetable);
  vmprint_recursive(pagetable, 0);
}
```

*Note: The implementation above provides a basic visualization. To fully match the lab's requested output with virtual addresses, you would need a more complex recursive function that constructs the VA for each entry based on its path from the root.*

---

## Part 2: Use Superpages (Moderate)

This task involves modifying xv6 to use 2MB superpages for large memory allocations made via `sbrk()`.

### 1. Define Superpage Constants

Add a definition for the superpage size in `kernel/riscv.h`.

**File: `kernel/riscv.h`**
```diff
--- a/kernel/riscv.h
+++ b/kernel/riscv.h
@@ -3,6 +3,7 @@
 #define PGSIZE 4096 // bytes per page
 #define PGSHIFT 12  // bits of offset within a page
 #define PGMASK (PGSIZE - 1)
+#define MEGAPAGE_SIZE (2 * 1024 * 1024) // 2MB
 
 #define KERNBASE 0x80000000L
 #define PHYSTOP (KERNBASE + 128*1024*1024)

```

### 2. Implement a Superpage Allocator

Create a simple physical memory allocator for 2MB-aligned blocks in `kernel/kalloc.c`.

**File: `kernel/kalloc.c`**

Add the following definitions and functions. This creates a small, dedicated pool of superpages.

```c
// Add with other structs at the top of kalloc.c
struct superpage {
  struct superpage *next;
};

struct {
  struct spinlock lock;
  struct superpage *freelist;
} superpage_freelist;

// In kinit(), after freerange(), initialize the superpage pool.
void
kinit()
{
  initlock(&kmem.lock, "kmem");
  initlock(&superpage_freelist.lock, "superpage");
  superpage_freelist.freelist = 0;
  
  // Carve out memory for superpages before giving it to the 4K allocator.
  char *p = (char*)PGROUNDUP((uint64)end);
  uint64 superpage_start = PGROUNDUP_2M((uint64)p); // PGROUNDUP_2M needs to be defined
  
  for(uint64 pa = superpage_start; pa + MEGAPAGE_SIZE <= PHYSTOP; pa += MEGAPAGE_SIZE) {
      // You can limit the number of superpages here if you want.
      superfree((void*)pa);
  }

  // The main allocator gets memory after the superpage pool.
  freerange((void*)(superpage_start + NUM_SUPERPAGES * MEGAPAGE_SIZE), (void*)PHYSTOP);
}


// superalloc: Allocate a 2MB superpage.
void *
superalloc(void)
{
  struct superpage *r;

  acquire(&superpage_freelist.lock);
  r = superpage_freelist.freelist;
  if(r)
    superpage_freelist.freelist = r->next;
  release(&superpage_freelist.lock);

  if(r)
    memset((char*)r, 5, MEGAPAGE_SIZE); // fill with junk
  return (void*)r;
}

// superfree: Free a 2MB superpage.
void
superfree(void *pa)
{
  struct superpage *r;

  if(((uint64)pa % MEGAPAGE_SIZE) != 0 || (char*)pa < end || (uint64)pa >= PHYSTOP)
    panic("superfree");

  // Fill with junk to catch dangling refs.
  memset(pa, 1, MEGAPAGE_SIZE);

  r = (struct superpage*)pa;

  acquire(&superpage_freelist.lock);
  r->next = superpage_freelist.freelist;
  superpage_freelist.freelist = r;
  release(&superpage_freelist.lock);
}
```
*Note: You will need to add prototypes for `superalloc`/`superfree` to `kernel/defs.h` and define helper macros like `PGROUNDUP_2M`.*

### 3. Modify Memory Management Functions

The most complex part is making `uvmalloc`, `uvmunmap`, and `uvmcopy` in `kernel/vm.c` aware of superpages.

**Conceptual Changes for `kernel/vm.c`:**

*   **`uvmalloc`:**
    *   When allocating, check if the current virtual address `a` is 2MB-aligned and if at least 2MB are being requested.
    *   If so, try to `superalloc()`.
    *   If successful, walk the page table to the level-1 PTE and install a superpage entry (a leaf PTE at level 1).
    *   Advance the allocation loop by 2MB.
    *   Otherwise, fall back to 4KB page allocation.

*   **`uvmunmap`:**
    *   When unmapping, the function must detect if a virtual address belongs to a superpage.
    *   This requires manually walking the page table levels. If a level-1 PTE is a leaf (has R/W/X bits set), it's a superpage.
    *   If a superpage is being unmapped, call `superfree()` on the 2MB physical block and clear the level-1 PTE.
    *   The loop must then be advanced by 2MB.

*   **`uvmcopy`:**
    *   When copying a process, `uvmcopy` must also detect superpages in the parent's page table.
    *   If a superpage is found, it must `superalloc()` a new 2MB block, copy the full 2MB of data from parent to child, and map the new block as a superpage in the child's page table.

---

## Submitting the Lab

1.  **Create `time.txt`:** Create a file named `time.txt` and enter the number of hours you spent on the lab.
    ```bash
    echo 10 > time.txt
    git add time.txt
    ```
2.  **Run Tests:** Ensure your code passes all tests before submitting.
    ```bash
    make grade
    ```
3.  **Commit and Create Zip:** Commit all your changes and run `make zipball` to create the `lab.zip` file for submission.
    ```bash
    git commit -am "Finish pgtbl lab"
    make zipball
    ```
4.  **Submit:** Upload `lab.zip` to the course's Gradescope page.
