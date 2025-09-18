---
title: guidance
---

# Lab guidance

## Hardness of assignments
  
Each assignment indicates how difficult it is:

*   **Easy**: less than an
    hour. These exercise are typically often warm-up exercises for
    subsequent exercises.
*   **Moderate**: 1-2 hours.
*   **Hard**: More than 2 hours. Often these
    exercises don't require much code, but the code is tricky to get
    right.

These times are rough estimates of our expectations.  For some of
the optional assignments we don't have a solution and the hardness
is a wild guess.  If you find yourself spending more time on an
assignment than we expect, please reach out on piazza or come to
office hours.
  
The exercises in general require not many lines of code (tens to a
few hundred lines), but the code is conceptually complicated and often
details matter a lot.  So, make sure you do the assigned reading for
the labs, read the relevant files through, consult the documentation
(the RISC-V manuals etc. are on the [reference page](/mit6.1810/quiz.md))
before you write any code. 
Implement your solution in small steps (the assignments often suggest
how to break the problem down) and test whether each
step works before proceeding to the next one.

> **Warning**
> Don't start a lab the night before it is due; it's 
> more time-efficient to spread the work over
> multiple days. The manifestation of a bug in operating system kernel
> can be bewildering and may require much thought and careful debugging
> to understand and fix.

## Debugging tips

Here are some tips for debugging:

*   Make sure you understand C and pointers.  The book "The C
    programming language (second edition)" by Kernighan and Ritchie is a
    succinct description of C.  Have a look at this example
    [code](https://pdos.csail.mit.edu/6.828/2019/lec/pointers.c)
    and make sure you understand why it produces the results it does.
    
    A few common pointer idioms are particularly worth remembering:
    *   If `int *p = (int*)100`, then 
        `(int)p + 1` and `(int)(p + 1)`
        are different numbers: the first is `101` but
        the second is `104`.
        When adding an integer to a pointer, as in the second case,
        the integer is implicitly multiplied by the size of the object
        the pointer points to.

    *   `p[i]` is defined to be the same as `*(p+i)`,
        referring to the i'th object in the memory pointed to by p.
        The above rule for addition helps this definition work
        when the objects are larger than one byte.
    *    `&p[i]` is the same as `(p+i)`, yielding
        the address of the i'th object in the memory pointed to by p.

    Although most C programs never need to cast between pointers and integers,
    operating systems frequently do.
    Whenever you see an addition involving a memory address,
    ask yourself whether it is an integer addition or pointer addition
    and make sure the value being added is appropriately multiplied
    or not.

*   If you have an exercise partially working, checkpoint your
    progress by committing your code.  If you break something later, you
    can then roll back to your checkpoint and go forward in smaller
    steps.  To learn more about Git, take a look at the
    [Git user's manual](http://www.kernel.org/pub/software/scm/git/docs/user-manual.html), or this
    [CS-oriented overview of Git](http://eagain.net/articles/git-for-computer-scientists/).
  
*   If your code fails a test, make sure you understand why.
    Insert print statements until you understand what is
    going on.

*   You may find that your print statements produce a lot of output
    that you would like to search through; one way to do that is to run
    `make qemu` inside of `script` (run `man script` on your machine), which logs all console output to a
    file, which you can then search.  Don't forget to
    exit `script`.
  
*   Print statements are often a sufficiently powerful debugging tool, but
    sometimes being able to single step through some assembly code or
    inspect variables on the stack is helpful.  To use gdb with
    xv6, run make `make qemu-gdb` in one window,
    run `gdb-multiarch` (or `riscv64-linux-gnu-gdb` or `riscv64-unknown-elf-gdb`) in another
    window (if you are using Athena, make sure that the two windows are on the same Athena machine), set a break point, followed by 'c' (continue),
    and xv6 will run until it hits the
    breakpoint. See [Using the GNU Debugger](https://pdos.csail.mit.edu/6.828/2019/lec/gdb_slides.pdf) for helpful GDB tips.  (If you start gdb and see a warning of the form 'warning: File ".../.gdbinit" auto-loading has been declined', edit ~/.gdbinit to add "add-auto-load-safe-path...", as suggested by the warning.)

*   If you want to see what assembly code the compiler
    generates for the xv6 kernel or find out what instruction is at
    a particular kernel address, see the file `kernel/kernel.asm`, which
    the Makefile produces when it compiles the kernel.  (The Makefile
    also produces `.asm` for all user programs.)
  
*   If the kernel causes an unexpected fault (e.g. uses an invalid
    memory address), it will print an error message 
    that includes the program counter ("sepc") at the point where it crashed; you can
    search `kernel.asm` to find the function containing that
    program counter,
    or you can run `addr2line -e kernel/kernel pc-value` (run `man addr2line`
    for details).  If you want a backtrace, restart using gdb: run
    'make qemu-gdb' in one window, run gdb (or riscv64-linux-gnu-gdb) in
    another window, set breakpoint in panic ('b panic'), followed by
    followed by 'c' (continue). When the kernel hits the break point,
    type 'bt' to get a backtrace.

*   If your kernel hangs, perhaps due to a deadlock,
    you can use gdb to find out where it is hanging. Run
    run 'make qemu-gdb' in one window, run gdb (riscv64-linux-gnu-gdb)
    in another window, followed by followed by 'c' (continue). When the
    kernel appears to hang hit Ctrl-C in the qemu-gdb window and type
    'bt' to get a backtrace.

*   `qemu` has a "monitor" that lets you query the state
    of the emulated machine. You can get at it by typing
    control-a c (the "c" is for console). A particularly useful
    monitor command is `info mem` to print the page table.
    You may need to use the `cpu` command to select which
    core `info mem` looks at, or you could start qemu
    with `make CPUS=1 qemu` to cause there to be just one core.

It is well worth the time learning the above-mentioned tools.
