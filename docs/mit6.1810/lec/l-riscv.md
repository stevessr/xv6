---
title: l-riscv.txt
---

6.1810 2022 Lecture 5: RISC-V calling convention, stack frames, and gdb

Overview

- C code is compiled to machine instructions.
- How does the machine work at a lower level?
- How does this translation work?
- How to interact between C and asm
- Why this matters: sometimes need to write code not expressible in C
- And you need this for the syscall lab!

## RISC-V abstract machine

No C-like control flow, no concept of variables, types ...
Base ISA: Program counter, 32 general-purpose registers (x0--x31)

| reg    | name  | saver  | description                        |
| ------ | ----- | ------ | ---------------------------------- |
| x0     | zero  |        | hardwired zero                     |
| x1     | ra    | caller | return address                     |
| x2     | sp    | callee | stack pointer                      |
| x3     | gp    |        | global pointer                     |
| x4     | tp    |        | thread pointer                     |
| x5-7   | t0-2  | caller | temporary registers                |
| x8     | s0/fp | callee | saved register / frame pointer     |
| x9     | s1    | callee | saved register                     |
| x10-11 | a0-1  | caller | function arguments / return values |
| x12-17 | a2-7  | caller | function arguments                 |
| x18-27 | s2-11 | callee | saved registers                    |
| x28-31 | t3-6  | caller | temporary registers                |
| pc     |       |        | program counter                    |

### Running example: sum_to(n)

C code:

```c
int sum_to(int n) {
    int acc = 0;
    for (int i = 0; i <= n; i++) {
        acc += i;
    }
    return acc;
}
```

Equivalent assembly example:

```asm
# sum_to(n)
# expects argument in a0
# returns result in a0
sum_to:
    mv t0, a0        # t0 <- a0
    li a0, 0         # a0 <- 0
loop:
    add a0, a0, t0   # a0 <- a0 + t0
    addi t0, t0, -1  # t0 <- t0 - 1
    bnez t0, loop    # if t0 != 0: pc <- loop
    ret
```

## Limited abstractions

- No typed, positional arguments
- No local variables (at the machine level)
- Only registers

At the machine level it doesn't even see assembly; it sees binary encodings of machine instructions.
Each instruction is typically 16 or 32 bits; for example `mv t0, a0` might be encoded as 0x82aa (example).

### Function call example

How to call `sum_to` from another function:

```asm
main:
    li a0, 10   # a0 <- 10
    call sum_to
```

Call semantics:

```text
call label :=
    ra <- pc + 4 ; ra <- address of next instruction
    pc <- label   ; jump to label
```

Return semantics:

```text
ret :=
    pc <- ra
```

Example (observing with gdb): demo1.S

(gdb) file user/\_demo1
(gdb) break main
(gdb) continue
(gdb) layout split
(gdb) stepi
(gdb) info registers
(gdb) p $a0
(gdb) advance 18
(gdb) si
(gdb) p $a0

### Problem when functions call each other

If one function calls another, for example:

```asm
# sum_then_double(n)
# expects argument in a0
# returns result in a0
sum_then_double:
    call sum_to
    li t0, 2        # t0 <- 2
    mul a0, a0, t0  # a0 <- a0 * t0
    ret

main:
    li a0, 10
    call sum_then_double
```

Running demo2.S may get stuck in an infinite loop because the return address `ra` is overwritten.

Fix: save `ra` on the stack (saving it in another register won't work because the call chain will clobber it):

```asm
sum_then_double:
    addi sp, sp, -16   # function prologue: make space on stack
    sd ra, 0(sp)       # save ra
    call sum_to
    li t0, 2
    mul a0, a0, t0
    ld ra, 0(sp)       # function epilogue: restore ra
    addi sp, sp, 16    # restore stack pointer
    ret
```

Example: demo3.S (using gdb's nexti and related commands)

So far our functions cooperate because we wrote all the code. In practice you must follow the calling convention so code from different sources can interoperate.

## Calling convention

- How arguments are passed: a0, a1, ..., a7; extra arguments go on the stack.
- Return values: a0, a1
- Who saves registers: there are designated caller-saved and callee-saved registers.
- `ra` is the return-address register; the callee must save it on the stack if needed.

C compilers (e.g. GCC) follow these conventions, so C and assembly interoperate.

Example: demo4.c / demo4.asm show function prologue, body, and epilogue. If a function is a leaf (does not call other functions) it usually does not need to save `ra`.

Compiling with `-fno-omit-frame-pointer` causes the compiler to keep `s0/fp` as the frame pointer.

## Stack frame diagram

```
Stack
                   .
                   .
      +->          .
      |   +-----------------+   |
      |   | return address  |   |
      |   |   previous fp ------+
      |   | saved registers |
      |   | local variables |
      |   |       ...       | <-+
      |   +-----------------+   |
      |   | return address  |   |
      +------ previous fp   |   |
          | saved registers |   |
          | local variables |   |
      +-> |       ...       |   |
      |   +-----------------+   |
      |   | return address  |   |
      |   |   previous fp ------+
      |   | saved registers |
      |   | local variables |
      |   |       ...       | <-+
      |   +-----------------+   |
      |   | return address  |   |
      +------ previous fp   |   |
          | saved registers |   |
          | local variables |   |
  $fp --> |       ...       |   |
          +-----------------+   |
          | return address  |   |
          |   previous fp ------+
          | saved registers |
  $sp --> | local variables |
          +-----------------+
```

### demo5.c (gdb example)

```
  (gdb) break g
  (gdb) si
  (gdb) si
  (gdb) si
  (gdb) si
  (gdb) p $sp
  (gdb) p $fp
  (gdb) x/g $fp-16
  (gdb) x/g 0x0000000000002fd0-16
```

Stack diagram:

```
          0x2fe0 |
          0x2fd8 | <garbage ra>       \
          0x2fd0 | <garbage fp>       / stack frame for main
          0x2fc8 | ra into main       \
  $fp --> 0x2fc0 | 0x0000000000002fe0 / stack frame for f
          0x2fb8 | ra into f          \
  $sp --> 0x2fb0 | 0x0000000000002fd0 / stack frame for g
```

GDB can automate this reasoning and use debug info:

```
    (gdb) backtrace
    (gdb) info frame
    (gdb) frame 1
    (gdb) info frame
    (gdb) frame 2
    (gdb) info frame
```

## Calling between C and assembly

If you follow the calling convention, calling between C and assembly works. Provide a function prototype so C knows how to call the assembly function.

Example: demo6.c / demo6_asm.S

(gdb) b sum_squares_to
(gdb) si ...
(gdb) x/4g $sp
(gdb) si ...

## Inline assembly

(lecture demos and examples)

## Structs and memory layout

```text
C struct layout rules
Why: misaligned load/store can be slow or unsupported (platform-dependent)
**attribute**((packed))
How to access and manipulate C structs from assembly?
Generally passed by reference
Need to know struct layout
Demo: demo7.c / demo7_asm.S
```

## Debugging (GDB)

Common GDB commands and notes:

- examine: inspect memory contents
- x/nfu addr (n: count, f: format, u: unit size)
- step/next/finish
- step: next line of C code
- next: next line of C code, skipping over function calls
- finish: continue executing until end of current function call
- stepi/nexti
- stepi: next assembly instruction
- nexti: next assembly instruction, skipping over function calls
- layout next
- conditional breakpoints: break when a condition holds
- watchpoints: break when a memory location changes value

GDB is a very powerful tool. Read the manual for more, but you probably don't need all the fancy features for this class.

## References

- RISC-V ISA specification: https://riscv.org/specifications/ (Contains detailed information)
- RISC-V ISA Reference: https://rv8.io/isa (Overview of instructions)
- RISC-V assembly language reference: https://rv8.io/asm (Overview of directives, pseudo-instructions, and more)
