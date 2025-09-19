---
title: fs
---

# 实验：文件系统

在这个实验中，你将向 xv6 文件系统添加大文件和符号链接。

> 在编写代码之前，你应该阅读 [xv6 书籍](/assets/mit6.1810/book-riscv-rev4.pdf) 中的"第 8 章：文件系统"并研究相应的代码。

获取实验的 xv6 源代码并检出 `fs` 分支：

```
  $ git fetch
  $ git checkout fs
  $ make clean
```

## 大文件

在这个作业中，你将增加 xv6 文件的最大大小。目前 xv6 文件限制为 268 个块，或 268*BSIZE 字节（BSIZE 在 xv6 中是 1024）。这个限制来自于 xv6 inode 包含 12 个"直接"块号和一个"单间接"块号，后者指向一个包含最多 256 个更多块号的块，总共 12+256=268 个块。

[`bigfile`](/source/xv6-riscv/user/usertests.c.md#bigfile-user-usertests-c) 命令创建它能创建的最长文件，并报告该大小：
```
$ bigfile
..
wrote 268 blocks
bigfile: file is too small
$
```
测试失败是因为 [`bigfile`](/source/xv6-riscv/user/usertests.c.md#bigfile-user-usertests-c) 期望能够创建一个包含 65803 个块的文件，但未修改的 xv6 将文件限制为 268 个块。

你将修改 xv6 文件系统代码以支持每个 inode 中的"双间接"块，包含 256 个单间接块的地址，每个单间接块可以包含最多 256 个数据块的地址。结果是一个文件将能够包含最多 65803 个块，或 256*256+256+11 个块（11 而不是 12，因为我们必须牺牲一个直接块号给双间接块）。

### 预备知识

`mkfs` 程序创建 xv6 文件系统磁盘镜像并确定文件系统总共有多少个块；这个大小由 `kernel/param.h` 中的 `FSSIZE` 控制。你会看到这个实验的仓库中 `FSSIZE` 设置为 200,000 个块。你应该在 make 输出中看到来自 `mkfs/mkfs` 的以下输出：
```
nmeta 70 (boot, super, log blocks 30 inode blocks 13, bitmap blocks 25) blocks 199930 total 200000
```
这行描述了 `mkfs/mkfs` 构建的文件系统：它有 70 个元数据块（用于描述文件系统的块）和 199,930 个数据块，总共 200,000 个块。

注意 `make qemu` 会构建一个新的 `fs.img`，并将旧的保存在 `fs.img.bk` 中。如果你想用现有的 `fs.img` 运行 xv6 而不是构建一个新的，运行 `make qemu-fs`。

### 要查看的内容

磁盘上 inode 的格式由 `fs.h` 中的 `struct dinode` 定义。你特别感兴趣的是 `NDIRECT`、`NINDIRECT`、`MAXFILE` 和 `struct dinode` 的 `addrs[]` 元素。查看 xv6 文本中的图 8.3 以了解标准 xv6 inode 的图表。

在 `fs.c` 中的 `bmap()` 函数中找到文件在磁盘上的数据。看看它并确保你理解它在做什么。`bmap()` 在读取和写入文件时都会被调用。写入时，`bmap()` 会根据需要分配新块来保存文件内容，以及在需要时分配间接块来保存块地址。

`bmap()` 处理两种块号。`bn` 参数是"逻辑块号"——文件内的块号，相对于文件的开始。`ip->addrs[]` 中的块号和 [`bread()`](/source/xv6-riscv/kernel/bio.c.md#bread-kernel-bio-c) 的参数是磁盘块号。你可以将 `bmap()` 视为将文件的逻辑块号映射到磁盘块号。

### 你的任务

> 修改 `bmap()` 以实现双间接块，除了直接块和单间接块。你必须只有 11 个直接块，而不是 12 个，为你的新双间接块腾出空间；你不允许更改磁盘上 inode 的大小。`ip->addrs[]` 的前 11 个元素应该是直接块；第 12 个应该是一个单间接块（就像当前的那样）；第 13 个应该是你的新双间接块。当你 [`bigfile`](/source/xv6-riscv/user/usertests.c.md#bigfile-user-usertests-c) 写入 65803 个块并且 `usertests -q` 成功运行时，你就完成了这个练习：

```
$ bigfile
..................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................
wrote 65803 blocks
done; ok
$ usertests -q
...
ALL TESTS PASSED
$ 
```

[`bigfile`](/source/xv6-riscv/user/usertests.c.md#bigfile-user-usertests-c) 至少需要一分半钟才能运行。

提示：

*   确保你理解 `bmap()`。画出 `ip->addrs[]`、间接块、双间接块和它指向的单间接块以及数据块之间关系的图表。确保你理解为什么添加双间接块会将最大文件大小增加 256*256 个块（实际上是 -1，因为你必须将直接块的数量减少一个）。

*   思考如何用逻辑块号索引双间接块和它指向的间接块。

*   如果你改变了 `NDIRECT` 的定义，你可能必须改变 `file.h` 中 `struct inode` 的 `addrs[]` 声明。确保 `struct inode` 和 `struct dinode` 在它们的 `addrs[]` 数组中有相同数量的元素。

*   如果你改变了 `NDIRECT` 的定义，确保创建一个新的 `fs.img`，因为 `mkfs` 使用 `NDIRECT` 来构建文件系统。

*   如果你的文件系统进入不良状态，可能是由于崩溃，删除 `fs.img`（从 Unix 而不是 xv6 中执行）。`make` 将为你构建一个新的干净文件系统镜像。

*   不要忘记 [`brelse()`](/source/xv6-riscv/kernel/bio.c.md#brelse-kernel-bio-c) 你 [`bread()`](/source/xv6-riscv/kernel/bio.c.md#bread-kernel-bio-c) 的每个块。

*   你应该只在需要时分配间接块和双间接块，就像原始的 `bmap()` 一样。

*   确保 `itrunc` 释放文件的所有块，包括双间接块。

*   `usertests` 比之前的实验运行时间更长，因为对于这个实验 `FSSIZE` 更大，大文件也更大。

## 符号链接

在这个练习中，你将向 xv6 添加符号链接。符号链接（或软链接）通过路径名引用链接的文件或目录；当打开符号链接时，内核会查找链接到的名称。符号链接类似于硬链接，但硬链接仅限于指向同一磁盘上的文件，不能引用目录，并且与特定的目标 inode 绑定，而不是像符号链接那样引用目标名称当前的任何内容（如果有的话）。实现这个系统调用是理解路径名查找如何工作的好练习。

对于这个实验，你不必处理指向目录的符号链接；唯一需要知道如何跟随符号链接的系统调用是 [`open()`](/source/xv6-riscv/user/usertests.c.md#open-user-usertests-c)。

### 你的任务

> 你将实现 `symlink(char *target, char *path)` 系统调用，它在路径处创建一个指向目标文件名的新符号链接。有关更多信息，请参见 man page symlink。要测试，请将 symlinktest 添加到 Makefile 并运行它。当测试产生以下输出时（包括 usertests 成功），你的解决方案就完成了。

```
$ symlinktest
Start: test symlinks
test symlinks: ok
Start: test concurrent symlinks
test concurrent symlinks: ok
$ usertests -q
...
ALL TESTS PASSED
$ 
```

提示：

*   首先，为 symlink 创建一个新的系统调用号，向 user/usys.pl、user/user.h 添加条目，并在 kernel/sysfile.c 中实现一个空的 sys_symlink。

*   向 kernel/stat.h 添加一个新的文件类型（`T_SYMLINK`）来表示符号链接。

*   向 kernel/fcntl.h 添加一个新标志（`O_NOFOLLOW`），可以与 [`open`](/source/xv6-riscv/user/usertests.c.md#open-user-usertests-c) 系统调用一起使用。注意传递给 [`open`](/source/xv6-riscv/user/usertests.c.md#open-user-usertests-c) 的标志使用按位或运算符组合，所以你的新标志不应该与任何现有标志重叠。这将让你在将 user/symlinktest.c 添加到 Makefile 后编译它。

*   实现 `symlink(target, path)` 系统调用，创建一个指向目标的新符号链接。注意目标不需要存在系统调用就能成功。你需要选择某个地方来存储符号链接的目标路径，例如在 inode 的数据块中。`symlink` 应该返回一个整数表示成功（0）或失败（-1），类似于 `link` 和 `unlink`。

*   修改 [`open`](/source/xv6-riscv/user/usertests.c.md#open-user-usertests-c) 系统调用以处理路径指向符号链接的情况。如果文件不存在，[`open`](/source/xv6-riscv/user/usertests.c.md#open-user-usertests-c) 必须失败。当进程在标志中指定 `O_NOFOLLOW` 时，[`open`](/source/xv6-riscv/user/usertests.c.md#open-user-usertests-c) 应该打开符号链接（而不是跟随符号链接）。

*   如果链接的文件也是符号链接，你必须递归地跟随它直到到达非链接文件。如果链接形成循环，你必须返回错误代码。你可以通过在链接深度达到某个阈值（例如，10）时返回错误代码来近似实现这一点。

*   其他系统调用（例如，link 和 unlink）不得跟随符号链接；这些系统调用在符号链接本身上操作。

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

## 可选挑战练习

支持三间接块。

### 致谢

感谢 UW 的 CSEP551（2019 年秋季）工作人员提供符号链接练习。