---
title: l-redleaf.txt
---
# 6.1810 2024 Lecture 19: Kernels and HLL

**Reading:** "RedLeaf: Isolation and Communication in Safe Operating System" (2020)

## I. Context and Motivation

### Commodity Kernels (C)
*   Developer has total control but hard to get right.

### Attractive Alternative: Rust
*   Much control, no GC (Garbage Collector).

### RedLeaf Paper Goal
*   Use HLL (High-level Language) to design OS *without* hardware isolation.
*   All code runs in supervisor mode but with **language isolation**.

## II. Challenges with C and High-Level Languages (HLL)

### Challenges with C
Memory management left to the programmer, leading to serious problems for kernel developers:
1.  **Concurrent Data Structures:** Challenging (RCU, next week).
2.  **Memory Safety Bugs:**
    *   Use-after-free (notoriously difficult to debug).
    *   Buffer overflows (security vulnerabilities).

*Security Impact and Benefits of HLL (Links for Context):*
*   `https://security.googleblog.com/2024/03/secure-by-design-googles-perspective-on.html`
*   `https://security.googleblog.com/2019/05/queue-hardening-enhancements.html`
*   `https://security.googleblog.com/2024/10/safer-with-google-advancing-memory.html`

### High-Level Languages (HLL)
*   **Automatic Memory Management:** Avoids large classes of C bugs.
*   HLLs enforces types, checks bounds.

#### HLL Memory Management
*   **Garbage Collector (GC):** Automates memory deallocation. Nice for concurrent programing, but has costs:
    *   CPU cycles at runtime.
    *   Delays execution.
    *   Extra memory.
    *   *Reference:* `https://www.usenix.org/conference/osdi18/presentation/cutler`
*   **Rust (HLL without GC):**
    *   Developer must follow **ownership rule** (only one unique pointer to each live object).
    *   *Reference:* `https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html`
    *   Allows static analysis of lifetimes of objects: **no GC**.
    *   Small runtime bounds checking for memory safety.

#### Rust and Linux
*   Replacing C with Rust is challenging: C/Rust interaction (pointers into C data structures) requires **unsafe Rust**.

## III. Isolation Models

### Hardware Isolation (Reminder)
*   Isolation enforced by **page tables**.
    *   **xv6/Monolithic:** Address spaces for kernel and user processes.
    *   **L4/Microkernel:** Splits kernel into processes.

### RedLeaf (HLL Isolation)
*   The isolation unit is the **domain**.
*   Isolation is enforced by **HLL**.
*   **Light-weight:** No system calls.
*   One domain calls a function in another domain.
*   Relies on the language to enforce isolation between domains:
    *   Cannot jump to arbitrary locations.
    *   Cannot cast arbitrarily.

### Why HLL Isolation is Useful
*   **Performance:** Fast cross-domain calls (e.g., compared to L4).
*   **Direct-Access:** Direct-access to hardware/drivers.
*   **More Isolation:** Factor kernel into many domains.

### Constraints and History
*   RedLeaf applications must be written in Rust; cannot run arbitrary binaries.
*   Long history: Lisp OSes, Singularity, etc.

## IV. The Domain Cleanup Challenge

**Problem:** Domains crash (panic, runtime violation). How to free its resources?
*   Another domain may have a pointer into crashed domain.
*   How do threads of another domain that called into the crashed domain return?
*   How to free "kernel" resources associated with domain?

**Nice Property of Unix Processes:** Data is private to process; no external pointers into the process. `killable exit` frees up all resources.

**Strawman Design:** Pass data by value.
*   *Benefit:* No external pointers into the crashed domain.
*   *Drawback:* Large objects are expensive to pass.
*   **Goal:** Zero-copy communication.

## V. RedLeaf Design Ideas

RedLeaf addresses the cleanup and zero-copy goal via:
1.  **Heap Isolation:** No outside pointers into the **private** heap.
2.  **Shared Heap w. Exchangeable Types:** Allows for **zero-copy**.
3.  **Ownership Tracking:** To deallocate objects in the shared heap.
4.  **Interface Validation:** Enforce types are exchangeable.
5.  **Cross-Domain Call Proxying:** Update ownership, handle crashes.

*Code Reference:* `git clone https://github.com/mars-research/redleaf.git`

## VI. Implementation Details

### Inter-Domain Communication (Fig 2)
*   **Shared Heap:** Contains `RRef` (Remote Reference).
    *   `RRef` info: domain owner, `refcnt`, `T` (type) info.
*   **Domain's Heap:** Two-level memory allocation.
*   **Trusted Crate:** For `Box` allocations.
*   **Exchangeable Types:** `RRef` can point to other `RRef`.
*   **IDL Compiler:** Checks interface definitions.
*   **Trusted Proxy:** For isolation, updates `RRef` ownership (only the root `RRef`).
*   Returns error when callee crashes.

### Domain Cleanup
*   **Private Heaps:** Private; no other domain has a pointer to an object in private heap.
*   **Shared Heap Deallocation (on crash):**
    1.  Find domain's `RRef` roots.
    2.  Find `drop()` for `T`.
    3.  Call `drop()`, which may deallocate children.
*   **Crash Recovery:** Crashed callee may scribble on mutable reference.
    *   Proxy returns `RpcResult` for transparent recovery.
    *   *Crucial:* References must be **immutable**.

### RedLeaf Architecture (Fig 1)
*   Everything runs in **supervisor mode**.
*   Many domains (user processes in their own domain).
*   `rv6` split into several domains (`xv6` in Rust core).
    *   Core: "syscall" dispatcher.
    *   Drivers in their own domain (microkernel design).

### Creating and Downloading Domains
*   **Challenge:** Types across domains must be identical.
*   **Solution: Trusted Compilation**
    *   Signs domain "binary," IDL files, and compiler flags.
    *   No Rust `unsafe` generated domain entry point.
    *   Microkernel checks signature (and thus all types).

## VII. Performance and TCB

### Performance
*   **Microbenchmark (Table 1):**
    *   Why is L4 slower?
    *   Why is RedLeaf only 124 cycles?
*   **Language Tax (Fig 5):** High-order functions, `Option`.
*   **Device Driver (Fig 8):**
    *   Why is `redleaf-driver` < DPDK?
    *   Why is `redleaf-domain` < `redleaf-driver`?

### HLL vs. Hardware Isolation (TCB)
*   **RedLeaf TCB (Trusted Computing Base):** Rust compiler, Rust core libraries, microkernel, IDL compiler.
*   **xv6 TCB:** RISC-V CPU, xv6-kernel (but less on the compiler).

*   **Context:** Language-level isolation in the browser (e.g., WASM).
*   Page tables are useful for other purposes than isolation.