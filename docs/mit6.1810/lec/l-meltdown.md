---
title: l-meltdown.txt
---
# Lecture 21: Meltdown

**6.1810 2024**

**Topic:** Meltdown

---

## The Meltdown Threat

*   **Security is a Critical OS Goal:** The kernel's main strategy is **isolation** (User/Supervisor mode, page tables, defensive system calls, etc.).
*   **The Problem:** Meltdown allows malicious user code to **read kernel memory**, despite page table protections.
*   **Nature of the Attack:** One of a number of recent "micro-architectural" attacks that exploit hidden implementation details of CPUs.

---

## The Core Attack Mechanism (User Code)

This code is executed by an attacker in user space, assuming kernel memory is mapped in the user page table but with the User permission bit (`PTE_U`) clear (a near-universal practice until these attacks).

```c
1. char buf[8192] 
2. r1 = <kernel_address> 
3. r2 = *r1            // Load kernel data byte into r2
4. r2 = r2 & 1         // Isolate the low bit
5. r2 = r2 * 4096       // r2 is now 0 or 4096
6. r3 = buf[r2]         // Load from buf[0] or buf[4096]
```

The pointer `*r1` is a meaningful address, even if forbidden by permissions.

---

## Micro-architectural Concepts

The attack relies on two hidden CPU implementation details: **Speculative Execution** and **CPU Caches**.

### 1. Speculative Execution

**Goal:** Avoid stalls when waiting for slow operations (e.g., RAM load, which takes 100s of cycles).

**Mechanism:**

*   If a CPU is waiting for a branch condition (e.g., `if(r1 == 1)`) to be resolved, it **predicts** the outcome and continues executing instructions along the predicted path (**speculation**).
*   If the prediction is correct, performance is gained.
*   If the prediction is **incorrect (mis-prediction)**, the CPU **flushes** the results of the speculation (reverts register content) and restarts execution down the correct path.
*   **Transparency:** Speculation is intended to be transparent (micro-architectural), increasing performance without changing the program's computed results. The CPU makes it transparent by un-doing register assignments and not raising exceptions from incorrectly speculated instructions.

**Fault Handling:**

*   The CPU "retires" instructions only after it is sure they won't be canceled.
*   Retirement happens in order.
*   A fault (like accessing forbidden memory at `*r0`) is **delayed** until the instruction retires, which can be a while after the instruction has finished executing speculatively.

### 2. CPU Data and TLB Caches

*   **L1 Cache:** Very fast (a few cycles), often virtually indexed.
*   **System Calls:** A system call leaves kernel data in the L1 cache after returning to user space (assuming the page table maps both user and kernel).
*   **Safety Question:** Why is it safe for L1 to contain kernel data while executing user code? Permissions are checked by the TLB/cache logic, preventing direct reads.

### Micro-architectural Side-Channel

While the micro-architecture is intended to be invisible, it affects **how long instructions take**.

**The Flush+Reload Trick:**

1.  **Flush:** Ensure memory at address $Z$ is not cached (using `clflush` or by forcing it out).
2.  **Call Function $f()$**
3.  **Reload:** Load a byte from address $Z$.
4.  **Measure Time:** Record the time using a cycle counter (`rdtsc`).
5.  **Deduction:** If the load time is fast (e.g., `< 50` cycles), the load was an **L1 hit**, meaning $f()$ probably used memory at $Z$.

---

## Meltdown: Combining the Concepts

The Meltdown attack uses speculative execution to perform a forbidden kernel memory load, and uses the cache side-channel (Flush+Reload) to "leak" the result before the fault is retired.

1.  **Flush:** `clflush buf[0]` and `clflush buf[4096]`.
2.  **Speculative Code:** The 5 lines of code are run.
    *   The load at line 3 (`r2 = *r1`) is executed speculatively. **The CPU performs the load, ignoring the `PTE_U` permission, and puts the result into `r2`** (temporarily).
    *   The subsequent instructions (lines 4-6) are executed speculatively.
    *   Line 6 (`r3 = buf[r2]`) loads either `buf[0]` or `buf[4096]` into the cache, depending on the lowest bit of the kernel data (from `*r1`).
3.  **Fault Delay:** The fault from line 3 is delayed until the load instruction retires.
4.  **Reload & Deduce:** Before the fault retires, the attacker uses the Flush+Reload trick to measure access time for `buf[0]` and `buf[4096]`.
    *   The line that loads fast indicates which cache line was touched speculatively.
    *   **The change to the cache content persists** (is not canceled) even though the register assignment to `r3` is canceled due to the mis-speculation.
5.  **Result:** The attacker deduces one bit of kernel data per attempt.

### Success Rate

*   The attack often fails (indicated by 'XX' in the paper).
*   Reasons for failure are complex and unclear (e.g., kernel data not in L1, load retiring too soon, cache conflicts, TLB misses, machine activity).
*   Thousands of retries may be needed.

---

## Real-World Consequences

*   **Timesharing:** An attacker could steal other users' secrets (passwords, keys) or physical memory from other processes.
*   **Cloud:** Could potentially steal data from other cloud customers in container/VMM systems.
*   **Browser:** Untrusted plug-ins could potentially steal your data from the kernel.
*   **Note:** Meltdown is **not known** to have been used in any actual attack.

---

## Defenses

### 1. Software Fix: KAISER/KPTI

*   **Strategy:** **Don't map the kernel in user page tables.**
*   The kernel is only mapped when executing in kernel mode.
*   Requires a **page table switch** on each system call entry/exit.
*   **Performance Cost:** The switch can be slow; it may require TLB flushes (though PCID can mitigate the flush cost).
*   Many kernels (including Linux, as KPTI) adopted this soon after Meltdown was known. This is how RISC-V xv6 already works.

### 2. Hardware Fix

*   **Strategy:** Only return **permitted data** from speculative loads.
*   If `PTE_U/R/V` is clear, the speculative load returns a safe value (e.g., zero) instead of the actual data.
*   This likely has little performance cost.
*   AMD CPUs apparently worked like this all along.
*   Latest Intel CPUs now implement this (called `RDCL_NO`).

**Conclusion:** These defenses are deployed and believed to work, but the discovery that page protections were not solid was highly disturbing, and more micro-architectural surprises have emerged since.