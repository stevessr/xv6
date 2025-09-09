---
title: mmap
---

# 实验：mmap

`mmap` 和 `munmap` 系统调用允许 UNIX 程序对其地址空间进行详细控制。它们可用于在进程之间共享内存、将文件映射到进程地址空间，以及作为用户级页面错误方案的一部分，如讲座中讨论的垃圾收集算法。
在这个实验中，你将向 xv6 添加 `mmap` 和 `munmap`，重点关注内存映射文件。

获取实验的 xv6 源代码并检出 `mmap` 分支：

```
  $ git fetch
  $ git checkout mmap
  $ make clean
```

手册页
（运行 `man 2 mmap`）显示了 `mmap` 的这个声明：
```
void *mmap(void *addr, size_t len, int prot, int flags,
           int fd, off_t offset);
```

`mmap` 可以以多种方式调用，
但这个实验只需要
与内存映射文件相关的功能子集。
你可以假设
`addr` 将始终为零，这意味着
内核应决定映射文件的虚拟地址。
`mmap` 返回该地址，如果失败则返回 0xffffffffffffffff。
`len` 是要映射的字节数；它可能与文件的长度不同。
`prot` 指示内存是否应映射为
可读、可写和/或可执行；你可以假设 
`prot` 是 `PROT_READ` 或 `PROT_WRITE`
或两者兼有。
`flags` 将是 `MAP_SHARED`，
意味着对映射内存的修改应
写回文件，或 `MAP_PRIVATE`，
意味着它们不应写回。你不必实现 `flags` 中的任何
其他位。
`fd` 是要映射的文件的打开文件描述符。
你可以假设 `offset` 为零（它是
文件中开始映射的点）。

你的实现应该
在页面错误的响应中懒惰地填充
页表。也就是说，`mmap` 本身不应分配物理内存或
读取文件。相反，在（或由）[`usertrap`](/source/xv6-riscv/kernel/trap.c.md#usertrap-kernel-trap-c) 中的页面错误处理代码中执行此操作，如写时复制实验中所示。
懒惰的原因是确保 `mmap`
大文件时速度快，并且 `mmap`
比物理内存大的文件成为可能。

如果映射相同 `MAP_SHARED`
文件的进程**不**共享物理页面，这是可以的。

手册页
（运行 `man 2 munmap`）显示了 `munmap` 的这个声明：
```
int munmap(void *addr, size_t len);
```

`munmap` 应该移除
指定地址范围内的 mmap 映射（如果有的话）。如果进程已修改内存并且
将其映射为 `MAP_SHARED`，则应首先将修改
写入文件。`munmap` 调用可能只覆盖
mmap 区域的一部分，但你可以假设它将在
开始、结束或整个区域取消映射（但不会在
区域中间打孔）。当进程退出时，任何
对 `MAP_SHARED` 区域的修改都应
写入相关文件，就像进程已调用 `munmap` 一样。

> 你应该实现足够的 `mmap` 和 `munmap`
> 功能以使
> `mmaptest` 测试程序工作。如果 `mmaptest`
> 不使用 `mmap` 功能，则无需实现
> 该功能。
> 你还必须确保 `usertests -q` 继续工作。

完成后，你应该看到类似于这样的输出：
```
$ mmaptest
test basic mmap
test basic mmap: OK
test mmap private
test mmap private: OK
test mmap read-only
test mmap read-only: OK
test mmap read/write
test mmap read/write: OK
test mmap dirty
test mmap dirty: OK
test not-mapped unmap
test not-mapped unmap: OK
test lazy access
test lazy access: OK
test mmap two files
test mmap two files: OK
test fork
test fork: OK
test munmap prevents access
usertrap(): unexpected scause 0xd pid=7
            sepc=0x924 stval=0xc0001000
usertrap(): unexpected scause 0xd pid=8
            sepc=0x9ac stval=0xc0000000
test munmap prevents access: OK
test writes to read-only mapped memory
usertrap(): unexpected scause 0xf pid=9
            sepc=0xaf4 stval=0xc0000000
test writes to read-only mapped memory: OK
mmaptest: all tests succeeded
$ usertests -q
usertests starting
...
ALL TESTS PASSED
$ 
```

以下是一些提示：

*   首先将 `_mmaptest` 添加到 `UPROGS`，
    和 `mmap` 和 `munmap` 系统调用，以便
    编译 `user/mmaptest.c`。目前，只需从 `mmap` 和 `munmap` 返回
    错误。我们在 `kernel/fcntl.h` 中为你定义了
    `PROT_READ` 等。
    运行 `mmaptest`，它将在第一次 mmap 调用时失败。
      
*   跟踪 `mmap` 为每个进程映射的内容。
    定义一个对应于"虚拟内存区域"讲座中描述的 VMA（虚拟
    内存区域）的结构。
    这应该记录地址、长度、权限、文件等。
    为 mmap 创建的虚拟内存范围。
    由于 xv6
    内核在内核中没有可变大小的内存分配器，
    可以
    声明一个固定大小的 VMA 数组并从中
    按需分配。16 的大小应该足够了。

*   实现 `mmap`：
    在进程的
    地址空间中找到一个未使用的区域
    以映射文件，
    并将 VMA 添加到进程的
    映射区域表中。
    VMA 应包含一个指向
    要映射的文件的 `struct file` 的指针；`mmap` 应该
    增加文件的引用计数，以便当文件关闭时结构不会
    消失（提示：
    参见 [`filedup`](/source/xv6-riscv/kernel/file.c.md#filedup-kernel-file-c)）。
    运行 `mmaptest`：第一个 `mmap` 应该
    成功，但对 mmap 内存的第一次访问将 
    导致页面错误并杀死 `mmaptest`。

*   添加代码以使 mmap 区域中的页面错误
    分配一个物理内存页面，读取 4096 字节的
    相关文件到
    该页面，并将其映射到用户地址空间。
    使用 [`readi`](/source/xv6-riscv/kernel/fs.c.md#readi-kernel-fs-c) 读取文件，
    它接受一个偏移量参数以在
    文件中读取（但你必须锁定/解锁传递给
    [`readi`](/source/xv6-riscv/kernel/fs.c.md#readi-kernel-fs-c) 的 inode）。不要忘记正确设置页面的权限。
    运行 `mmaptest`；它应该到达第一个 `munmap`。

*   实现 `munmap`：找到地址范围的 VMA 并
    取消映射指定的页面（提示：使用 [`uvmunmap`](/source/xv6-riscv/kernel/vm.c.md#uvmunmap-kernel-vm-c)）。
    如果 `munmap` 移除了
    之前的 `mmap` 的所有页面，它应该减少相应 `struct file` 的引用计数。
    如果取消映射的页面
    已被修改且文件映射为 `MAP_SHARED`，
    将页面写回文件。
    查看 [`filewrite`](/source/xv6-riscv/kernel/file.c.md#filewrite-kernel-file-c) 以获得灵感。

*   理想情况下，你的实现应该只写回
    程序实际修改的 `MAP_SHARED` 页面。
    RISC-V PTE 中的脏位（`D`）指示页面是否已被写入。
    然而，`mmaptest` 不检查
    非脏页面是否未写回；因此你可以不看 `D` 位就写回页面。

*   修改 [`exit`](/source/xv6-riscv/user/usertests.c.md#exit-user-usertests-c) 以取消映射进程的映射区域，
    就像调用了 `munmap` 一样。
    运行 `mmaptest`；所有通过 `test mmap two files`
    的测试都应该通过，但 `test fork` 可能不会。

*   修改 [`fork`](/source/xv6-riscv/kernel/proc.c.md#fork-kernel-proc-c) 以确保子进程具有
    与父进程相同的映射区域。
    不要
    忘记增加 VMA 的 `struct
    file` 的引用计数。在子进程的页面错误处理程序中，分配新物理页面而不是与父进程共享页面是可以的。后者会更酷，但需要更多
    实现工作。运行 `mmaptest`；它应该通过
    所有测试。
          
运行 `usertests -q` 以确保一切仍然正常工作。

## 提交实验

### 花费的时间

创建一个新文件 `time.txt`，并在其中放入一个整数，表示你在实验上花费的小时数。
`git add` 并 `git commit` 该文件。

### 答案

如果这个实验有问题，请在 `answers-*.txt` 中写下你的答案。
`git add` 并 `git commit` 这些文件。

### 提交

实验提交由 Gradescope 处理。
你需要一个 MIT gradescope 账户。
查看 Piazza 获取加入课程的入口代码。
如果需要更多帮助加入，请使用 [此链接](https://help.gradescope.com/article/gi7gm49peg-student-add-course#joining_a_course_using_a_course_code)。

当你准备好提交时，运行 `make zipball`，
这将生成 `lab.zip`。
将此 zip 文件上传到相应的 Gradescope 作业。

如果你运行 `make zipball` 并且你有未提交的更改或未跟踪的文件，你会看到类似于以下的输出：
```
 M hello.c
?? bar.c
?? foo.pyc
Untracked files will not be handed in.  Continue? [y/N]
```
检查以上行并确保你的实验解决方案所需的所有文件都被跟踪，即，不列在以 `??` 开头的行中。
你可以使用 `git add {filename}` 使 `git` 跟踪你创建的新文件。

> **警告**
> *   请运行 `make grade` 确保你的代码通过所有测试。
>     Gradescope 自动评分器将使用相同的评分程序为你的提交分配成绩。
> *   在运行 `make zipball` 之前提交任何修改的源代码。
> *   你可以在 Gradescope 上检查你的提交状态并下载提交的代码。Gradescope 实验成绩是你的最终实验成绩。

## 可选挑战
  
*   如果两个进程具有相同的文件 mmap（如
    fork 测试中），共享它们的物理页面。你需要
    物理页面上的引用计数。

*   你的解决方案可能会为每个从 mmap 文件读取的页面
    分配一个新的物理页面，即使数据也在内核
    内存的缓冲区缓存中。修改你的实现以使用
    该物理内存，而不是分配新页面。这需要
    文件块与页面大小相同（将 `BSIZE` 设置为
    4096）。你需要将 mmap 块固定在缓冲区缓存中。
    你需要担心引用计数。

*   删除懒惰分配实现和 mmap 文件实现之间的冗余。（提示：
    为懒惰分配区域创建一个 VMA。）

*   修改 [`exec`](/source/xv6-riscv/user/usertests.c.md#exec-user-usertests-c) 以对二进制文件的不同部分使用 VMA，以便你获得按需分页的可执行文件。这将
    使启动程序更快，因为 [`exec`](/source/xv6-riscv/user/usertests.c.md#exec-user-usertests-c) 将不必
    从文件系统读取任何数据。

*   实现页面换出和页面换入：让
    内核在物理内存不足时将进程的某些部分移动到磁盘。
    然后，在进程引用分页内存时
    将分页内存换入。