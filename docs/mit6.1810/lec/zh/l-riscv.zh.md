---
title: l-riscv.txt
---

6.1810 2022 第 5 讲：RISC-V 调用约定，栈帧，和 gdb

C 代码被编译成机器指令。机器在底层是如何工作的？
这种转换是如何工作的？
如何在 C 和汇编之间交互

为什么这很重要：有时需要编写 C 中无法表达的代码
你需要这个来完成系统调用实验！

RISC-V 抽象机器
没有 C 类控制流，没有变量、类型的概念
基础 ISA：程序计数器，32 个通用寄存器（x0--x31）

寄存器 | 名称 | 保存者 | 描述
\\-------+-------+--------+------------
x0 | zero | | 硬连线零
x1 | ra | 调用者 | 返回地址
x2 | sp | 被调用者 | 栈指针
x3 | gp | | 全局指针
x4 | tp | | 线程指针
x5-7 | t0-2 | 调用者 | 临时寄存器
x8 | s0/fp | 被调用者 | 保存寄存器/帧指针
x9 | s1 | 被调用者 | 保存寄存器
x10-11 | a0-1 | 调用者 | 函数参数/返回值
x12-17 | a2-7 | 调用者 | 函数参数
x18-27 | s2-11 | 被调用者 | 保存寄存器
x28-31 | t3-6 | 调用者 | 临时寄存器
pc | | | 程序计数器

运行示例：sum_to(n)
int sum_to(int n) {
int acc = 0;
for (int i = 0; i <= n; i++) {
acc += i;
}
return acc;
}

这在汇编代码中是什么样子？
# sum_to(n)
# 期望参数在 a0 中
# 返回结果在 a0 中
sum_to:
mv t0, a0 # t0 <- a0
li a0, 0 # a0 <- 0
loop:
add a0, a0, t0 # a0 <- a0 + t0
addi t0, t0, -1 # t0 <- t0 - 1
bnez t0, loop # 如果 t0 != 0: pc <- loop
ret

有限的抽象
没有类型化的位置参数
没有局部变量
只有寄存器
机器甚至看不到汇编代码
看到机器指令的二进制编码
每条指令：16 位或 32 位
例如 `mv t0, a0` 编码为 0x82aa
不是完全 1 对 1 的汇编编码，但接近

另一个函数如何调用 sum_to？
main:
li a0, 10 # a0 <- 10
call sum_to

调用的语义是什么？
call label := ra <- pc + 4 ; ra <- 下一条指令的地址
pc <- label ; 跳转到 label
机器不理解标签
转换为 pc 相对或绝对跳转

返回的语义是什么？
ret := pc <- ra

让我们试试：demo1.S
(gdb) file user/_demo1
(gdb) break main
(gdb) continue
为什么在运行 demo1 之前就停止了？
(gdb) layout split
(gdb) stepi
(gdb) info registers
(gdb) p $a0
(gdb) advance 18
(gdb) si
(gdb) p $a0

如果我们想要一个函数调用另一个函数怎么办？
# sum_then_double(n)
# 期望参数在 a0 中
# 返回结果在 a0 中
sum_then_double:
call sum_to
li t0, 2 # t0 <- 2
mul a0, a0, t0 # a0 <- a0 * t0
ret

main:
li a0, 10
call sum_then_double

让我们试试：demo2.S
我们陷入了无限循环
为什么：覆盖了返回地址 (ra)
如何修复：将 ra 保存在某处
在另一个寄存器中？不行，只是推迟了问题。
解决方案：保存在栈上

sum_then_double:
addi sp, sp, 16 # 函数序言：
sd ra, 0(sp) # 在栈上腾出空间，保存寄存器
call sum_to
li t0, 2
mul a0, a0, t0
ld ra, 0(sp) # 函数结尾：
addi sp, sp, -16 # 恢复寄存器，恢复栈指针
ret

让我们试试：demo3.S
(gdb) ...
(gdb) nexti

到目前为止，我们的函数相互协调
这之所以有效是因为我们在编写所有涉及的代码
本来可以用任何其他方式编写
例如，在 t2 中传递参数，在 t3 中获取返回值

围绕此的约定："调用约定"
参数如何传递？a0, a1, ..., a7, 其余在栈上
值如何返回？a0, a1
谁保存寄存器？
指定为调用者或被调用者保存
ra 能是被调用者保存的寄存器吗？

我们的汇编代码应该遵循这个约定
GCC 生成的 C 代码遵循这个约定
这意味着每个人都可以互操作，包括 C/汇编互操作
阅读：demo4.c / demo4.asm
可以看到函数序言、主体、结尾
为什么它不保存 ra？叶函数，不需要
s0/fp是怎么回事？
我们用-fno-omit-frame-pointer 编译

栈
.
.
+-> .
|
+-----------------+
| return address |
|
| previous fp ------+
| saved registers |
| local variables |
| ... | <-+
+-----------------+
|
| return address |
+------ previous fp
| saved registers |
| local variables |
+-> | ... |
|
+-----------------+
|
| return address |
|
| previous fp ------+
| saved registers |
| local variables |
| ... | <-+
+-----------------+
|
| return address |
+------ previous fp
| saved registers |
| local variables |
$fp --> | ... |
+-----------------+
|
return address |
|
| previous fp ------+
| saved registers |
$sp --> | local variables |
+-----------------+

演示程序：demo5.c
(gdb) break g
(gdb) si
(gdb) si
(gdb) si
(gdb) si
(gdb) p $sp
(gdb) p $fp
(gdb) x/g $fp-16
(gdb) x/g 0x0000000000002fd0-16

栈图：
0x2fe0 | 0x2fd8 | \
0x2fd0 | / main 的栈帧
0x2fc8 | ra into main \
$fp --> 0x2fc0 | 0x0000000000002fe0 / f 的栈帧
0x2fb8 | ra into f \
$sp --> 0x2fb0 | 0x0000000000002fd0 / g 的栈帧

GDB 可以为我们自动化这种推理
此外，它还可以使用调试信息来推断叶函数等
(gdb) backtrace
(gdb) info frame
(gdb) frame 1
(gdb) info frame
(gdb) frame 2
(gdb) info frame

从汇编调用 C / 从 C 调用汇编
遵循调用约定，一切都会正常工作
编写函数原型，这样 C 就知道如何调用汇编

演示：demo6.c / demo6_asm.S
为什么我们使用 s0/s1 而不是例如 t0/t1？
(gdb) b sum_squares_to
(gdb) si ...
(gdb) x/4g $sp
(gdb) si ...

内联汇编

结构体
C 结构体布局规则
为什么：未对齐的加载/存储可能很慢或不支持（平台相关）
__attribute__((packed))
如何从汇编访问和操作 C 结构体？
通常通过引用传递
需要知道结构体布局
演示：demo7.c / demo7_asm.S

调试
检查：检查内存内容
x/nfu addr
n: 计数
f: 格式
u: 单位大小

step/next/finish
step: 下一行 C 代码
next: 下一行 C 代码，跳过函数调用
finish: 继续执行直到当前函数结束

stepi/nexti
stepi: 下一条汇编指令
nexti: 下一条汇编指令，跳过函数调用

layout
next 通过布局步进

条件断点
break，仅当条件成立时（例如变量有特定值）

观察点
当内存位置值改变时断点

GDB 是一个非常强大的工具
阅读手册了解更多！
但你可能不需要所有这些高级功能来上这门课

参考
RISC-V ISA 规范：https://riscv.org/specifications/
包含详细信息
RISC-V ISA 参考：https://rv8.io/isa
指令概述
RISC-V 汇编语言参考：https://rv8.io/asm
指令、伪指令等概述