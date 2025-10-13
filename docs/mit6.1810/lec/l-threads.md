---
title: l-threads.txt
---
# Lecture 11: Thread Switching

**6.1810 2024**

**Topic:** More "under the hood" with xv6 (Process/Thread Switching)

**Previously:** System calls, interrupts, page tables, locks
**Today:** Process/thread switching

---

## Why Support Concurrent Tasks?

*   **Time-sharing:** Many users and/or many running programs.
*   **Program structure:** Example: prime number sieve.
*   **Parallel programming:** Exploit multi-core hardware.

---

## What's a Thread?

*   Think about code that's executing in the ordinary serial way.
*   Suppose we wanted to **suspend it**, put it to one side, do other things, and then later **resume that code**?

**What would we need to preserve?**

*   Memory
*   Stack
*   CPU's registers
*   CPU's program counter

A "thread" alternates between executing code, and, when suspended, the saved state needed to resume it.
*   [Simple two-thread alternation diagram]
*   A threading system manages the switching among threads.

---

## xv6 Thread Usage

*   [Simple diagram]
*   Each xv6 process has a single **user-level thread** and a single **kernel thread**.
*   A process's kernel thread:
    *   Executes system call implementations.
    *   May have to suspend itself to wait for input, etc., or to let other processes' threads run.
*   xv6 kernel threads **share memory**:
    *   They all execute in the kernel address space.
    *   They all use kernel data structures, thus they need to use locks.
*   A process's user and kernel threads are **not independent**:
    *   If executing in kernel, user thread is waiting for trap return.
    *   If executing in user space, kernel thread is empty.

> I'll use "process" and "thread" interchangeably in this context.

### xv6 Process/Thread Saved State

If an xv6 process is not executing, it's often waiting for some event (console, pipe, disk, etc.) because it made a system call into the kernel (e.g., `read()`).

*   It may be waiting midway through a complex kernel system call implementation.
*   Needs to resume in kernel system call code where it left off.
*   Thus, its kernel registers (and stack) must be saved.

| State Component | Saved State | Location |
| :--- | :--- | :--- |
| **User Memory** | User memory | |
| **User Registers** | Saved registers | `trapframe` (TF) |
| **Kernel Stack** | Kernel stack | |
| **Kernel Registers** | Saved registers | `"context"` (CTX) |

### Process State (`p->state`)

`p->state` tells the scheduler how to handle the process:

*   **RUNNING:** Executing on a CPU right now (either in user or kernel).
*   **RUNNABLE:** Wants to execute, but isn't (suspended, in kernel).
*   **SLEEPING:** Waiting for an event (suspended, in kernel `read()`, `wait()`, etc.).
*   *Helps avoid mistakes like executing on two CPUs at the same time.*

---

## The Context Switch

How xv6 switches from one process to another. E.g., P1 calls `read()` which waits, P2 is `RUNNABLE`.
*   [P1, TF1, KSTACK1, CTX1, swtch(), CTXs, STACKs, swtch(), CTX2, KSTACK2, TF2, P2]

### Transitions

Getting from one user process to another involves multiple transitions:

1.  **User -> Kernel:** Saves user registers in `trapframe`.
2.  **Kernel Thread -> Scheduler Thread:** Saves kernel thread registers in `context`.
3.  **Scheduler Thread -> Kernel Thread:** Restores kernel thread registers from `context`.
4.  **Kernel -> User:** Restores user registers from `trapframe`.

### `struct proc` in `proc.h`

*   `p->trapframe`: Holds saved user thread's registers.
*   `p->context`: Holds saved kernel thread's registers.
*   `p->kstack`: Points to the thread's kernel stack.
*   `p->state`: Is `RUNNING`, `RUNNABLE`, `SLEEPING`, etc.
*   `p->lock`: Protects `p->state` (and other things...).
*   `proc[NPROC]` array in `proc.c`: One per process.

---

## Why a Separate Scheduler Thread?

*   So that there's always a stack on which to run the scheduler loop.
    *   E.g., switching away from an exiting process.
    *   E.g., fewer processes than CPUs.

### Scheduler Thread Details

*   One per CPU; each has a stack and a `struct context`.
*   A kernel thread always switches to this CPU's scheduler thread.
*   The scheduler thread then switches to another kernel thread, if one is `RUNNABLE`.
*   **There are never direct process-to-process switches.**
*   Each CPU's scheduler thread keeps scanning the `proc[]` process table until it finds a `RUNNABLE` thread.
*   If there is no `RUNNABLE` thread, the scheduler is "idle."

---

## Pre-emption (Involuntary Context Switch)

*   **Problem:** What if user code computes without ever making a system call? Will that stop other processes from running?
*   **Solution:** CPU's timer hardware forces a periodic interrupt.
*   xv6 timer handler switches (`"yields"`).

This is called "pre-emption" or "involuntary context switch."

### Code Demonstration: Pre-emptive Switch

The demo uses two CPU-bound processes (`aaa.c`, `bbb.c`) running on a single-CPU QEMU, alternating execution driven by timer interrupts.

1.  **Break on Timer Interrupt:**
    ```bash
    (gdb) tb trap.c:81
    (gdb) c
    # We are in usertrap(), handling a timer interrupt from user space.
    ```

2.  **Interrupted Process State Check (P1):**
    ```bash
    (gdb) p p->name # e.g., "aaa"
    (gdb) p/x p->trapframe->epc # Shows where user code was interrupted (e.g., in the increment loop).
    ```

3.  **Entering `yield()`:**
    ```bash
    (gdb) step into yield() in proc.c
    (gdb) p p->state # Change from RUNNING to RUNNABLE.
    # Note: yield() acquires p->lock to prevent another CPU from running this RUNNABLE thread!
    # The kernel stack is still in use; kernel registers are not yet saved.
    ```

4.  **The `swtch()` Call:**
    ```bash
    (gdb) step into sched()
    # sched() makes checks, then calls swtch()
    (gdb) tb swtch
    (gdb) c
    # Now in kernel/swtch.S
    
    (gdb) si 28 # Execute 28 instructions (past the register saves/loads)
    (gdb) where
    # Observation: We suddenly return to scheduler(), not sched().
    # It's as if swtch() returned from a previous call made in scheduler().
    ```

### Detailed `swtch()` Mechanism (`kernel/swtch.S`)

*   `swtch()` saves registers into `xx(a0)` (i.e., `p->context.xx`).
*   It then loads registers from `xx(a1)` (i.e., `cpus[0]->context.xx`).

**Key Register Behavior:**

*   **Return Address (`ra`):** `swtch()` loads a new `ra` from `0(a1)` (`cpus[0]->context.ra`). This address is set to just after `scheduler`'s previous call to `swtch()`, making it appear as if `scheduler()` is returning from that call.
*   **Stack Pointer (`sp`):** Loading a new `sp` from `cpus[0]->context.sp` effectively switches the stack to the scheduler thread's stack.

**Saved Context Check:**

*   `swtch()` saves P1's registers in `p->context`. If `scheduler()` later switches back to P1, `swtch()` will restore this state, returning to P1's `sched()` on P1's kernel stack, as if P1's original call to `swtch()` returned.

| Question | Answer/Context |
| :--- | :--- |
| **Q: Why doesn't `swtch` need to save/restore `$pc`?** | (Implied: `ra` serves this purpose for the return flow.) |
| **Q: Why does `swtch()` save only 14 registers?** | (`ra`, `sp`, `s0..s11`). The other 18 (`zero`, `gp`, `tp`, `t0-t6`, `a0-a7`) are either constant, saved/restored by the caller (caller-saved), or volatile. |

### Back in `scheduler()`

We are now in the "scheduler thread," on the scheduler's stack.

*   `scheduler()` just returned from a previous call to `swtch()` (which switched out to P1 earlier).
*   `p` here refers to the interrupted process (P1).

**Lock Management Across `swtch()`:**

*   `yield()` acquired `p->lock`. `scheduler()` releases it. **Unusual:** the lock is released by a different thread than acquired it.

**Q: Why hold `p->lock` across `swtch()`?**
*   `p->lock` prevents interference during the critical steps: `p->state=RUNNABLE`, saving registers in `p->context`, and stopping use of `p`'s kernel stack. This ensures another CPU's scheduler won't start running `p` until all state is stable.

### Finding and Switching to P2

1.  `scheduler()`'s loop finds the next `RUNNABLE` process (P2).
2.  It locks P2 and sets its state to `RUNNING`.
3.  It calls `swtch()` to switch from the scheduler thread to P2's kernel thread.
    *   P2 will resume by returning into its own `sched()` function, just after its previous call to `swtch()`.

**Q: Does `scheduler()` give `proc[0]` an unfair advantage?** Since its `for` loop starts at `proc[0]`?
**Q: What is the "scheduling policy"?** I.e., how does xv6 decide what to run next if multiple threads are `RUNNABLE`?

---

## Kernel Pre-emption

**Q: Will a timer interrupt while in kernel cause a yield?**
*   **Yes** — `kerneltrap()` calls `yield()`. Kernel code *can* be pre-empted.
*   **Necessity:** Not strictly necessary since the kernel has no infinite CPU-bound loops, but valuable if some system calls have lots of compute or if a strict notion of thread priority is needed.

### Three Sets of Saved Registers

1.  **User registers:** In `trapframe`, via `trampoline`.
2.  **Interrupted kernel code registers:** On stack, via `kernelvec`.
3.  **Interrupt handler's registers:** In `p->context`, via `swtch()`.

---

## Locks and Context Switch (Danger)

**Q: Why isn't code allowed to hold a spinlock across a context switch?** (Other than `p->lock`)

**Scenario (Deadlock):**
1.  P1: `acquire(L1)` -> `yield()` (P1 is now `RUNNABLE` but holds `L1`)
2.  P2: `acquire(L2)` -> `acquire(L1)` (P2 is now spinning waiting for `L1`)

*   P2 is spinning in `acquire(L1)`. By definition of a spinlock, interrupts are off.
*   Timer interrupts won't occur, so P2 won't yield the CPU.
*   P1 can't execute to release `L1`, ever. The system freezes (Deadlock).

---

## Efficiency and Alternatives

**Q: Can we get rid of the separate per-CPU scheduler thread?** (Could `sched()` directly `swtch()` to a new thread?)
*   **Pros:** Faster (avoids one `swtch()` call).
*   **Cons:** Scheduling loop would run on a thread's kernel stack. Tricky if that thread is exiting or if there are too few threads for the number of CPUs (too few stacks).

**Q: Why does `scheduler()` enable interrupts, with `intr_on()`?**
*   There may be no `RUNNABLE` threads. They may all be waiting for I/O (disk, console).
*   Enabling interrupts allows devices a chance to signal completion and wake up a thread. Otherwise, the system will freeze.

### Thread Efficiency

*   **Memory cost:** A stack per thread.
*   **CPU time cost:** `swtch()` is usually efficient enough — and certainly convenient.
*   A problem if you have lots of them (memory) or switch often (CPU).

### Alternatives to Threads

*   Look up **event-driven programming** or **state machines**.
*   Threads are not the most efficient, but they are convenient.

**Q: Can a user-space process have multiple user-space threads?**
*   xv6 does not support this.
*   Others do (e.g., Linux, MacOS).

---

## Next Week

*   `sleep()` and `wakeup()` — Waiting for events.