---
title: l-rcu.txt
---
# Lecture 22: Multi-Core Scalability and RCU

**6.1810 2024**

**Today's Topic:** Multi-core kernel performance for read-heavy shared data. RCU (Read-Copy Update): very successful in Linux.

---

## The Multi-Core Scalability Puzzle

*   Parallel execution is crucial to performance on multi-core systems.
*   Kernels have natural parallelism (different process's system calls are often independent).
*   **Obstruction:** The kernel's shared resources often obstruct parallelism.
    *   E.g., memory allocator, scheduler, disk cache, i-node cache, etc.
*   **Symptom:** CPU time wasted spinning in `acquire()`.
*   Huge effort in production kernels to eliminate parallel bottlenecks.

---

## Read-Heavy Data Structures

**Focus:** Read-heavy kernel data structures (e.g., singly-linked lists: processes, cached blocks, etc.).

*   **Usage Pattern:** Most uses are **reads** that scan the list. Occasional **writers** add, delete, or change data in an element.
*   **xv6 Solution:** Requires list readers and writers to acquire a spin-lock.
    *   **Result:** Safe, but **no parallelism** even when all threads are read-only.

### Attempt 1: Read/Write Locks

| API | Semantics |
| :--- | :--- |
| `r_lock(l) / r_unlock(l)` | Lots of readers, but no writers. |
| `w_lock(l) / w_unlock(l)` | One writer, but no readers or other writers. |

#### Simplified Read/Write Lock Example

```c
struct rwlock { int n; }; 
// n=0 -> not locked
// n=-1 -> locked by one writer
// n>0 -> locked by n readers
```

**`r_lock(l)` Implementation (using Compare-And-Swap - CAS):**

```c
r_lock(l):
    while 1:
        x = l->n
        if x < 0 continue
        if CAS(&l->n, x, x + 1) return 
```

**The Scalability Problem with `r_lock()`:**

*   `r_lock()` is very slow if called a lot on many cores, **even if no writers are present**.
*   All N cores fetch `l->n` (e.g., 0), and execute `CAS(&n, 0, 1)`.
*   Only **one** `CAS` succeeds; atomic operations execute one at a time.
*   The other N-1 cores fail and must re-execute the read and `CAS`.
*   **Result:** $O(N)$ time for one CPU to acquire the read-lock, and $O(N^2)$ total time for all N cores to acquire the shared read lock.
*   **Disappointing:** The lock acquisition can take 100s or 1000s of cycles, while the list read itself might be only a few dozen cycles if cached. More cores $\rightarrow$ **less** performance.
*   **Underlying Problem:** `r_lock()` does expensive **writes** (via `CAS`), even for a read-only logical operation.

---

## Read-Copy Update (RCU)

**Goal:** Achieve pure read-only reads of shared read-write data, avoiding the writes required for locking.

*   **Fast Reads:** Readers do not lock (and thus do not write).
*   **Slower Writes:** Writers must lock, and do extra work to help reads.
*   RCU is a set of rules, patterns, and mechanisms. Used extensively in the Linux kernel.

### Why Readers Can't Simply Not Lock

If a writer is concurrent:
1.  **Modifying a string:** Reader might see a partially updated string.
2.  **Inserting/Deleting:** Reader might traverse an inconsistent list structure.

### RCU Idea 1: Write Out-of-Place

Writers don't modify data in place; instead, they prepare a new copy and swap a pointer in a single atomic step.

**Example: Change string in E2 (`Head -> E1 -> E2 -> E3 -> nil`)**

1.  Lock
2.  `e = alloc()`
3.  `e->next = E2->next`
4.  `strcpy(e->x, "xxx");` (Prepare the new element)
5.  `E1->next = e` (**Committing write**)
6.  Unlock

**Reader Safety:**
*   Reader traverses the list. At `E1`, it reads `E1->next`.
*   If read happens **before** step 5: Reader sees old `E2` and old string.
*   If read happens **after** step 5: Reader sees new `e` and new string.
*   **The Point:** The reader will never see a partially updated state. The update of `E1->next` is a "committing write" that makes **all** changes visible atomically.

**Requirements:**
*   RCU is best suited to data structures where a single pointer write commits (e.g., lists and trees).
*   Requires that 64-bit writes and reads are atomic (true on most 64-bit CPUs for aligned loads/stores).

### RCU Idea 2: Memory Barriers

*   Readers and writers must use memory barriers to enforce instruction order (prevent compiler/machine from reordering).
    *   **Writer:** Must have a barrier just before the committing write (Step 5).
    *   **Reader:** May need a barrier between reading the pointer (`Rx = E1->next`) and dereferencing `Rx` to read contents.

### RCU Idea 3: The Grace Period

**Problem:** What happens when a writer `free()`s a deleted list element?
*   Removing the visible reference prevents *new* readers, but a **concurrent reader** might still be looking at the deleted element (**Use-After-Free** risk).
*   **Writer needs to give readers time to finish** — a "grace period."

**RCU Grace Period Rules:**

1.  **Programmer Rule:** Reader cannot hold a pointer to RCU data across a context switch (i.e., between `rcu_read_lock` and `rcu_read_unlock`).
2.  **Writer Action:** Writer delays `free()` until **all CPUs have context-switched** (since a context switch implies a core is done with any pointers it held).

### Linux RCU Interface

| Role | Function | Description |
| :--- | :--- | :--- |
| **Reader** | `rcu_read_lock()` / `rcu_read_unlock()` | Disable timer interrupts to prevent pre-emption; acts as documentation. They *do not lock*. |
| | `rcu_dereference(p)` | Tells compiler to compute the pointer once; includes memory barrier. |
| **Writer** | `rcu_assign_pointer(pa, p)` | Memory fence, then `*pa = p`. This is the committing write. |
| | `synchronize_rcu()` | Implements the grace period: delays until all CPUs have context-switched. Can take a long time and yield the CPU. |
| | `call_rcu(fn, x)` | Alternative to `synchronize_rcu()`. Adds cleanup to a list and returns immediately (non-blocking deferral). |

**Writer Example (Replace first list element):**

```c
acquire(lock)
// ... prepare new element e ...
rcu_assign_pointer(&head, e) // Committing write
release(lock)

// Grace Period
synchronize_rcu() 
free(old)
// OR: call_rcu(free, old)
```

---

## RCU Performance and Applicability

### Performance Comparison (RCU vs. Read/Write Locks)

| Feature | RCU | Read/Write Locks |
| :--- | :--- | :--- |
| **Read Cost** | Nearly zero cost. | Might take 100s/1000s of cycles ($O(N^2)$ total). |
| **Parallelism** | Readers execute in parallel with a writer. | Readers block writer; writers block all readers/writers. |
| **Deadlock** | Not prone to deadlock. | Yes (e.g., if a lock is held across a yield). |
| **Write Cost** | Can take much longer due to `synchronize_rcu()`. | Faster write setup; but potentially long wait for readers to drain. |

**RCU makes sense when writes are rare or non-time-sensitive (`reads >> writes`).**

### Examples of RCU Use in Linux (Paper Section 4)

| Example | Pattern | RCU Advantage |
| :--- | :--- | :--- |
| **NMI Handler** | Read-heavy list of handlers. Unregistering is rare. | **Functionality:** NMIs cannot be disabled, so spinlocks are unusable (deadlock risk). RCU works where locking would not. |
| **IP Options** | Read IP options on every packet (high volume). Writing is rare (`setsockopt`). | **Performance:** `udp_sendmsg()` copies options without a lock. Uses `call_rcu` to defer freeing superseded options. |

### Limitations of RCU

*   Doesn't help writes.
*   Only improves performance when `reads >> writes`.
*   Not for code that must hold references across `yield`/`sleep` (can be mitigated, but complex).
*   Hard to apply if the data structure is not amenable to a single committing write (e.g., bidirectional scans of a doubly-linked list).
*   Readers can see **stale data** (e.g., old IP options are sent before update is visible).
*   Adds complexity to writers (need to manage locks, `rcu_assign_pointer`, and the grace period).

### `synchronize_rcu()` Implementation

*   The implementation relies on knowing when all cores have context-switched (i.e., passed through a "safe point").
*   In the kernel, this is easy as the kernel controls context switches. User-space doesn't know about core switches.

### Shared Write-Heavy Data

RCU is not the solution for write-heavy data. Alternatives:

1.  **Best:** Re-design for no sharing.
2.  **Second Best:** Partition data in some way and lock per partition.
    *   **Example:** `kalloc` in lab (partition by core).
    *   **Example:** Statistics counters: each core keeps its own count under a separate cheap spin lock. Reading involves acquiring *all* locks, reading, and summing the counts.

---

## RCU Summary

*   Very successful at speeding up read access to shared kernel data.
*   Totally eliminates locking cost for readers.
*   Allows readers to execute in parallel with a writer.
*   Key idea is a GC-like **grace period** to defer freeing objects.