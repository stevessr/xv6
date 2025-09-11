---
title: pgtbl
---

# Lab: page tables

In this lab you will explore page tables and modify them to
implement common OS features.

> Before you start coding, read Chapter 3 of
> the [xv6 book](/mit6.1810/xv6/book-riscv-rev4.pdf), and related files:
>
> *   `kernel/memlayout.h`, which captures the layout of memory.
>
> *   `kernel/vm.c`, which contains most virtual memory (VM) code.
>
> *   `kernel/kalloc.c`, which contains code for allocating and
>     freeing physical memory.
>
> It may also help to consult the [RISC-V privileged architecture manual](/assets/mit6.1810/riscv-privileged.pdf).

To start the lab, switch to the pgtbl branch:
```
$ git fetch
$ git checkout pgtbl
$ make clean
```

## Inspect a user-process page table

To help you understand RISC-V page tables, your first task is to explain
the page table for a user process.

Run `make qemu` and run the user program `pgtbltest`.
The `print_pgtbl` functions prints out the page-table entries
for the first 10 and last 10 pages of the `pgtbltest` process
using the `pgpte` system call that we added to xv6 for this
lab. The output looks as follows:
```
va 0 pte 0x21FCF45B pa 0x87F3D000 perm 0x5B
va 1000 pte 0x21FCE85B pa 0x87F3A000 perm 0x5B
...
va 0xFFFFD000 pte 0x0 pa 0x0 perm 0x0
va 0xFFFFE000 pte 0x21FD80C7 pa 0x87F60000 perm 0xC7
va 0xFFFFF000 pte 0x20001C4B pa 0x80007000 perm 0x4B
```

> For every page table entry in the `print_pgtbl` output, explain
> what it logically contains and what its permission bits are. Figure
> 3.4 in the xv6 book might be helpful, although note that the figure
> might have a slightly different set of pages than process that's being
> inspected here.  Note that xv6 doesn't place the virtual pages
> consecutively in physical memory.

## Speed up system calls

Some operating systems (e.g., Linux) speed up certain system calls by sharing
data in a read-only region between userspace and the kernel. This eliminates the
need for kernel crossings when performing these system calls.  To help you learn
how to insert mappings into a page table, your first task is to implement this
optimization for the `getpid()` system call in xv6.

> When each process is created, map one read-only page at USYSCALL (a
> virtual address defined
> in `memlayout.h`). At the start of this page, store a `struct
> usyscall` (also defined in `memlayout.h`), and initialize it to store
> the PID of the current process. For this lab, `ugetpid()` has been
> provided on the userspace side and will automatically use the USYSCALL mapping.
> You will receive full credit for this part of the lab if the `ugetpid` test
> case passes when running `pgtbltest`.

Some hints:
*   Choose permission bits that allow userspace to only read the page.
*   There are a few things that need to be done over the lifecycle of a new page.
    For inspiration, understand the trapframe handling in `kernel/proc.c`.

> Which other xv6 system call(s) could be made faster using this shared page?
> Explain how.

## Print a page table

To help you visualize RISC-V page tables, and perhaps
to aid future debugging, your next task is to write a function
that prints the contents of a page table.

> We added a system call `kpgtbl()`, which calls
> `vmprint()` in `vm.c`. It takes
> a `pagetable_t` argument, and your job is to print that pagetable
> in the format described below.

When you run `print_kpgtbl()` test, your implementation
should print the following output:

```
page table 0x0000000087f22000
..0x0000000000000000: pte 0x0000000021fc7801 pa 0x0000000087f1e000
.. ..0x0000000000000000: pte 0x0000000021fc7401 pa 0x0000000087f1d000
.. .. ..0x0000000000000000: pte 0x0000000021fc7c5b pa 0x0000000087f1f000
.. .. ..0x0000000000001000: pte 0x0000000021fc70d7 pa 0x0000000087f1c000
.. .. ..0x0000000000002000: pte 0x0000000021fc6c07 pa 0x0000000087f1b000
.. .. ..0x0000000000003000: pte 0x0000000021fc68d7 pa 0x0000000087f1a000
..0xffffffffc0000000: pte 0x0000000021fc8401 pa 0x0000000087f21000
.. ..0xffffffffffe00000: pte 0x0000000021fc8001 pa 0x0000000087f20000
.. .. ..0xffffffffffffd000: pte 0x0000000021fd4c13 pa 0x0000000087f53000
.. .. ..0xffffffffffffe000: pte 0x0000000021fd00c7 pa 0x0000000087f40000
.. .. ..0xfffffffffffff000: pte 0x000000002000184b pa 0x0000000080006000
```

The first line displays the argument to `vmprint`.
After that there is a line for each PTE, including PTEs that
refer to page-table pages deeper in the tree.
Each PTE line is indented by a number of ` ..` that indicates its
depth in the tree.
Each PTE line shows its virtual addresss, the pte bits, and the
physical address extracted from the PTE.
Don't print PTEs that are not valid.  In the above example, the
top-level page-table page has mappings for entries 0 and 255.  The next
level down for entry 0 has only index 0 mapped, and the bottom-level
for that index 0 has a few entries mapped.

Your code might emit different physical addresses than those shown above.
The number of entries and the virtual addresses should be the same.

Some hints:
*   Use the macros at the end of the file kernel/riscv.h.
*   The function [`freewalk`](/source/xv6-riscv/kernel/vm.c.md#freewalk-kernel-vm-c) may be inspirational.
*   Use `%p` in your printf calls to print out full 64-bit hex PTEs and addresses as shown in the example.

> For every leaf page in the `vmprint` output, explain what it logically
> contains and what its permission bits are, and how it relates to the
> output of the earlier `print_pgtbl()` exercise above.
> Figure 3.4 in the xv6 book might be helpful, although note that the figure might
> have a slightly different set of pages than the process that's being inspected here.

## Use superpages

The RISC-V paging hardware supports two-megabyte pages as well as
ordinary 4096-byte pages. The general idea of larger pages is called
superpages, and (since RISC-V supports more than one size) 2M pages
are called megapages. The operating system creates a superpage by
setting the PTE_V and PTE_R bits in the level-1 PTE, and setting the
physical page number to point to the start of a two-megabyte region of
physical memory. This physical address must be two-mega-byte aligned
(i.e., a multiple of two megabytes). You can read about this in the
RISC-V privileged manual by searching for megapage and superpage; in
particular, the top of page 112.

Use of superpages decreases the amount of physical memory used by the
page table, and can decrease misses in the TLB cache. For some
programs this leads to large increases in performance.

> Your job is to modify the xv6 kernel to use superpages. In particular,
> if a user program calls sbrk() with a size of 2 megabytes or more, and
> the newly created address range includes one or more areas that are
> two-megabyte-aligned and at least two megabytes in size, the kernel
> should use a single superpage (instead of hundreds of ordinary pages).
> You will receive full credit for this part of the lab if
> the `superpg_test` test case passes when
> running `pgtbltest`.

Some hints:
*   Read `superpg_test` in `user/pgtbltest.c`.
*   A good place to start is [`sys_sbrk`](/source/xv6-riscv/kernel/sysproc.c.md#sys_sbrk-kernel-sysproc-c)
    in `kernel/sysproc.c`, which is invoked by
    the [`sbrk`](/source/xv6-riscv/user/usertests.c.md#sbrk-user-usertests-c) system call.  Follow the code path to the
    function that allocates memory for [`sbrk`](/source/xv6-riscv/user/usertests.c.md#sbrk-user-usertests-c).
*   Your kernel will need to be able to allocate and free two-megabyte
    regions. Modify kalloc.c to set aside a few two-megabyte areas of
    physical memory, and create superalloc() and superfree() functions.
    You'll only need a handful of two-megabyte chunks of memory.
*
    Superpages must be allocated when a process with superpages forks,
    and freed when it exits; you'll need to modify
    [`uvmcopy()`](/source/xv6-riscv/kernel/vm.c.md#uvmcopy-kernel-vm-c) and [`uvmunmap()`](/source/xv6-riscv/kernel/vm.c.md#uvmunmap-kernel-vm-c).

Real operating systems dynamically promote a collection of pages to
a superpage.  The following reference explains why that is a good idea
and what is hard in a more serious design: [Juan Navarro, Sitaram Iyer,
Peter Druschel, and Alan Cox. Practical, transparent operating system
support for superpages. SIGOPS Oper.  Syst. Rev., 36(SI):89-104,
December 2002.](https://www.usenix.org/conference/osdi-02/practical-transparent-operating-system-support-superpages)  This reference summarizes
superpage-implementations
for different OSes:
[A
comprehensive analysis of superpage management mechanism
and policies](https://www.usenix.org/conference/atc20/presentation/zhu-weixi).

## Submit the lab

### Time spent

Create a new file, `time.txt`, and put in a single integer, the
number of hours you spent on the lab.
`git add` and `git commit` the file.

### Answers

If this lab had questions, write up your answers in `answers-*.txt`.
`git add` and `git commit` these files.

### Submit

Assignment submissions are handled by Gradescope.
You will need an MIT gradescope account.
See Piazza for the entry code to join the class.
Use [this link](https://help.gradescope.com/article/gi7gm49peg-student-add-course#joining_a_course_using_a_course_code)
if you need more help joining.

When you're ready to submit, run `make zipball`,
which will generate `lab.zip`.
Upload this zip file to the corresponding Gradescope assignment.

If you run `make zipball` and you have either uncomitted changes or
untracked files, you will see output similar to the following:
```
 M hello.c
?? bar.c
?? foo.pyc
Untracked files will not be handed in.  Continue? [y/N]
```
Inspect the above lines and make sure all files that your lab solution needs
are tracked, i.e., not listed in a line that begins with `??`.
You can cause `git` to track a new file that you create using
`git add {filename}`.

> **Warning**
> *   Please run `make grade` to ensure that your code passes all of the tests.
>     The Gradescope autograder will use the same grading program to assign your submission a grade.
> *   Commit any modified source code before running `make zipball`.
> *   You can inspect the status of your submission and download the submitted
>     code at Gradescope. The Gradescope lab grade is your final lab grade.

## Optional challenge exercises

*   Implement some ideas from the paper referenced above to make
    your super-page design more real.

*   Unmap the first page of a user process so that dereferencing a
    null pointer will result in a fault.  You will have to
    change `user.ld` to start the user text segment at, for
    example, 4096, instead of 0.

*   Add a system call that reports dirty pages (modified pages) using `PTE_D`.
