---
title: lock
---

# 实验：锁

在这个实验中，你将获得重新设计代码以提高并行性的经验。多核机器上并行性差的一个常见症状是高锁争用。提高并行性通常涉及改变数据结构和锁定策略以减少争用。你将为 xv6 内存分配器和块缓存执行此操作。

> 在编写代码之前，请确保阅读 [xv6 书籍](/assets/mit6.1810/book-riscv-rev4.pdf) 中的以下部分：
> * 第 6 章："锁定"和相应的代码。
> * 第 3.5 节："代码：物理内存分配器"
> * 第 8.1 到 8.3 节："概述"、"缓冲区缓存层"和"代码：缓冲区缓存"

```
  $ git fetch
  $ git checkout lock
  $ make clean
```
  
## 内存分配器

程序 user/kalloctest 对 xv6 的内存分配器施加压力：三个进程增长和缩小它们的地址空间，导致多次调用 [`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 和 `kfree`。
[`kalloc`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 和 `kfree`
获取 `kmem.lock`。kalloctest 打印（作为"#test-and-set"）`acquire` 中由于尝试获取另一个核心已持有的锁而导致的循环迭代次数，对于 `kmem` 锁和其他一些锁。
`acquire` 中的循环迭代次数是锁争用的粗略度量。
在你开始实验之前，`kalloctest` 的输出看起来类似于这样：

```
$ kalloctest
start test1
test1 results:
--- lock kmem/bcache stats
lock: kmem: #test-and-set 83375 #acquire() 433015
lock: bcache: #test-and-set 0 #acquire() 1260
--- top 5 contended locks:
lock: kmem: #test-and-set 83375 #acquire() 433015
lock: proc: #test-and-set 23737 #acquire() 130718
lock: virtio_disk: #test-and-set 11159 #acquire() 114
lock: proc: #test-and-set 5937 #acquire() 130786
lock: proc: #test-and-set 4080 #acquire() 130786
tot= 83375
test1 FAIL
start test2
total free number of pages: 32497 (out of 32768)
.....
test2 OK
start test3
child done 1
child done 100000
test3 OK
start test2
total free number of pages: 32497 (out of 32768)
.....
test2 OK
start test3
..........child done 100000
--- lock kmem/bcache stats
lock: kmem: #test-and-set 28002 #acquire() 4228151
lock: bcache: #test-and-set 0 #acquire() 1374
--- top 5 contended locks:
lock: virtio_disk: #test-and-set 96998 #acquire() 147
lock: kmem: #test-and-set 28002 #acquire() 4228151
lock: proc: #test-and-set 6802 #acquire() 7125
lock: pr: #test-and-set 3321 #acquire() 5
lock: log: #test-and-set 1912 #acquire() 68
tot= 28002
0
test3 FAIL m 11720 n 28002
```

你可能会看到与此处显示的不同计数，以及不同的前 5 个争用锁的顺序。

`acquire` 为每个锁维护调用 `acquire` 的次数，以及 `acquire` 中的循环尝试但未能设置锁的次数。
kalloctest 调用一个系统调用，使内核打印 kmem 和 bcache 锁（这是本实验的重点）以及 5 个最争用锁的这些计数。如果存在锁争用，`acquire` 循环迭代的次数将很大。
系统调用返回 kmem 和 bcache 锁的循环迭代次数之和。

对于这个实验，你必须使用一个专用的未加载的多核机器。如果你使用正在做其他事情的机器，kalloctest 打印的计数将是无意义的。你可以使用专用的 Athena 工作站或你自己的笔记本电脑，但不要使用拨号机器。

kalloctest 中锁争用的根本原因是 [`kalloc()`](/source/xv6-riscv/kernel/kalloc.c.md#kalloc-kernel-kalloc-c) 有一个由单个锁保护的单一空闲列表。要消除锁争用，你必须重新设计内存分配器以避免单个锁和列表。基本思想是为每个 CPU 维护一个空闲列表，每个列表都有自己的锁。不同 CPU 上的分配和释放可以并行运行，因为每个 CPU 将在不同的列表上操作。主要挑战是处理一个 CPU 的空闲列表为空但另一个 CPU 的列表有空闲内存的情况；在这种情况下，一个 CPU 必须"窃取"另一个 CPU 的空闲列表的一部分。窃取可能会引入锁争用，但这希望是不频繁的。

> 你的任务是实现每个 CPU 的空闲列表，以及在 CPU 的空闲列表为空时进行窃取。
> 你必须给所有锁命名，名称以"kmem"开头。
> 也就是说，你应该为每个锁调用
> [`initlock`](/source/xv6-riscv/kernel/spinlock.c.md#initlock-kernel-spinlock-c)，
> 并传递一个以"kmem"开头的名称。
> 运行 kalloctest 来查看你的实现是否减少了锁争用。要检查它是否仍然可以分配所有内存，运行 `usertests sbrkmuch`。你的输出将类似于下面显示的内容，
> kmem 锁上的总争用大大减少，尽管具体数字会有所不同。确保 `usertests -q` 中的所有测试都通过。
> `make grade` 应该说 kalloctests 通过了。

```
$ kalloctest
start test1
test1 results:
--- lock kmem/bcache stats
lock: kmem: #test-and-set 0 #acquire() 94703
lock: kmem: #test-and-set 0 #acquire() 173699
lock: kmem: #test-and-set 0 #acquire() 164725
lock: bcache: #test-and-set 0 #acquire() 32
lock: bcache.bucket: #test-and-set 0 #acquire() 38
lock: bcache.bucket: #test-and-set 0 #acquire() 13
lock: bcache.bucket: #test-and-set 0 #acquire() 22
lock: bcache.bucket: #test-and-set 0 #acquire() 18
lock: bcache.bucket: #test-and-set 0 #acquire() 30
lock: bcache.bucket: #test-and-set 0 #acquire() 18
lock: bcache.bucket: #test-and-set 0 #acquire() 88
lock: bcache.bucket: #test-and-set 0 #acquire() 80
lock: bcache.bucket: #test-and-set 0 #acquire() 1045
lock: bcache.bucket: #test-and-set 0 #acquire() 16
lock: bcache.bucket: #test-and-set 0 #acquire() 4
lock: bcache.bucket: #test-and-set 0 #acquire() 8
lock: bcache.bucket: #test-and-set 0 #acquire() 8
--- top 5 contended locks:
lock: virtio_disk: #test-and-set 87542 #acquire() 147
lock: proc: #test-and-set 37123 #acquire() 497420
lock: proc: #test-and-set 27415 #acquire() 497425
lock: wait_lock: #test-and-set 9650 #acquire() 12
lock: pr: #test-and-set 4451 #acquire() 5
tot= 0
test1 OK
start test2
total free number of pages: 32463 (out of 32768)
.....
test2 OK
start test3
..........child done 100000
--- lock kmem/bcache stats
lock: kmem: #test-and-set 758 #acquire() 1375324
lock: kmem: #test-and-set 796 #acquire() 1864634
lock: kmem: #test-and-set 1395 #acquire() 1779346
lock: kmem: #test-and-set 0 #acquire() 58
lock: kmem: #test-and-set 0 #acquire() 58
lock: kmem: #test-and-set 0 #acquire() 58
lock: kmem: #test-and-set 0 #acquire() 58
lock: kmem: #test-and-set 0 #acquire() 58
lock: bcache: #test-and-set 0 #acquire() 32
lock: bcache.bucket: #test-and-set 0 #acquire() 38
lock: bcache.bucket: #test-and-set 0 #acquire() 13
lock: bcache.bucket: #test-and-set 0 #acquire() 22
lock: bcache.bucket: #test-and-set 0 #acquire() 18
lock: bcache.bucket: #test-and-set 0 #acquire() 30
lock: bcache.bucket: #test-and-set 0 #acquire() 18
lock: bcache.bucket: #test-and-set 0 #acquire() 88
lock: bcache.bucket: #test-and-set 0 #acquire() 84
lock: bcache.bucket: #test-and-set 0 #acquire() 1145
lock: bcache.bucket: #test-and-set 0 #acquire() 16
lock: bcache.bucket: #test-and-set 0 #acquire() 4
lock: bcache.bucket: #test-and-set 0 #acquire() 8
lock: bcache.bucket: #test-and-set 0 #acquire() 8
--- top 5 contended locks:
lock: proc: #test-and-set 135932 #acquire() 2617654
lock: proc: #test-and-set 99612 #acquire() 5132219
lock: virtio_disk: #test-and-set 87542 #acquire() 147
lock: proc: #test-and-set 46889 #acquire() 2538791
lock: proc: #test-and-set 33853 #acquire() 1817240
tot= 2949

test3 OK
$ usertests sbrkmuch
usertests starting
test sbrkmuch: OK
ALL TESTS PASSED
$ usertests -q
...
ALL TESTS PASSED
$
```
  
一些提示：
*   你可以使用 kernel/param.h 中的常量 `NCPU`
      
*   让 [`freerange`](/source/xv6-riscv/kernel/kalloc.c.md#freerange-kernel-kalloc-c) 将所有空闲内存给予运行 [`freerange`](/source/xv6-riscv/kernel/kalloc.c.md#freerange-kernel-kalloc-c) 的 CPU。
      
*   函数 [`cpuid`](/source/xv6-riscv/kernel/proc.c.md#cpuid-kernel-proc-c) 返回当前核心号，但
    只有在关闭中断时调用它并使用其结果才是安全的。你应该使用
    `push_off()` 和 [`pop_off()`](/source/xv6-riscv/kernel/spinlock.c.md#pop_off-kernel-spinlock-c) 来
    关闭和打开中断。
    
*   查看 kernel/sprintf.c 中的 `snprintf` 函数以获取字符串格式化想法。不过，将所有锁命名为"kmem"是可以的。
      
*   可选地使用 xv6 的竞争检测器运行你的解决方案：
    ```
	$ make clean
	$ make KCSAN=1 qemu
	$ kalloctest
	  ..
    ```
    `kalloctest` 可能会失败，但你不应该看到任何
    竞争。如果 xv6 的竞争检测器观察到竞争，它将
    打印两个描述竞争的堆栈跟踪，如下所示：
    ```
	 == race detected ==
	 backtrace for racing load
	 0x000000008000ab8a
	 0x000000008000ac8a
	 0x000000008000ae7e
	 0x0000000080000216
	 0x00000000800002e0
	 0x0000000080000f54
	 0x0000000080001d56
	 0x0000000080003704
	 0x0000000080003522
	 0x0000000080002fdc
	 backtrace for watchpoint:
	 0x000000008000ad28
	 0x000000008000af22
	 0x000000008000023c
	 0x0000000080000292
	 0x0000000080000316
	 0x000000008000098c
	 0x0000000080000ad2
	 0x000000008000113a
	 0x0000000080001df2
	 0x000000008000364c
	 0x0000000080003522
	 0x0000000080002fdc
	 ==========
    ```
    在你的操作系统上，你可以通过将堆栈跟踪剪切并粘贴到 `addr2line` 中将堆栈跟踪转换为带行号的函数名：
    ```
	 $ riscv64-linux-gnu-addr2line -e kernel/kernel
	 0x000000008000ab8a
	 0x000000008000ac8a
	 0x000000008000ae7e
	 0x0000000080000216
	 0x00000000800002e0
	 0x0000000080000f54
	 0x0000000080001d56
	 0x0000000080003704
	 0x0000000080003522
	 0x0000000080002fdc
	<kbd>ctrl-d</kbd>
	kernel/kcsan.c:157
        kernel/kcsan.c:241
        kernel/kalloc.c:174
        kernel/kalloc.c:211
        kernel/vm.c:255
        kernel/proc.c:295
        kernel/sysproc.c:54
        kernel/syscall.c:251
    ```
    你不需要运行竞争检测器，但你可能会发现它有帮助。请注意，竞争检测器会显著减慢 xv6 的速度，所以当你运行 `usertests` 时可能不想使用它。

## 缓冲区缓存

这个作业的这一半与第一半无关；
你可以处理这一半（并通过测试），无论你是否已完成第一半。

如果多个进程密集使用文件系统，它们可能会争用 `bcache.lock`，它保护 kernel/bio.c 中的磁盘块缓存。
`bcachetest` 创建
几个进程重复读取不同文件
以在 `bcache.lock` 上产生争用；
其输出看起来像这样（在你完成这个实验之前）：

```
$ bcachetest
start test0
test0 results:
--- lock kmem/bcache stats
lock: kmem: #test-and-set 0 #acquire() 33099
lock: bcache: #test-and-set 10273 #acquire() 65964
--- top 5 contended locks:
lock: virtio_disk: #test-and-set 814630 #acquire() 1221
lock: proc: #test-and-set 57695 #acquire() 67093
lock: proc: #test-and-set 24368 #acquire() 67103
lock: bcache: #test-and-set 10273 #acquire() 65964
lock: pr: #test-and-set 3441 #acquire() 5
tot= 10273
test0: FAIL
start test1

test1 OK
start test2

test2 OK
start test3

test3 OK
```
你可能会看到不同的输出，但
`bcache` 锁的测试和设置次数会很高。
如果你查看 `kernel/bio.c` 中的代码，你会看到
`bcache.lock` 保护缓存的块缓冲区列表、
每个块缓冲区中的引用计数（`b->refcnt`）以及
缓存块的身份（`b->dev` 和 `b->blockno`）。

> 修改块缓存，使得在运行 `bcachetest` 时，bcache 中所有锁的 `acquire` 循环迭代次数接近零。
> 理想情况下，涉及块缓存的所有锁的计数之和应该为零，但如果总和小于 500 也是可以的。
> 修改 [`bget`](/source/xv6-riscv/kernel/bio.c.md#bget-kernel-bio-c)
> 和 [`brelse`](/source/xv6-riscv/kernel/bio.c.md#brelse-kernel-bio-c)，使得对
> bcache 中不同块的并发查找和释放不太可能在
> 锁上冲突（例如，不必都等待
> `bcache.lock`）。
> 你必须保持不变量，即
> 最多每个块的一个副本被缓存。
> 你不得增加缓冲区的数量；
> 必须恰好有 NBUF（30）个。
> 你的修改后的缓存不需要使用 LRU 替换，
> 但它必须能够在缓存未命中时使用任何具有零
> `refcnt` 的 NBUF `struct buf`。
> 当你完成后，你的
> 输出应该类似于下面显示的内容（尽管不完全相同）。
> 确保 'usertests -q' 仍然通过。
> `make grade` 在你完成后应该通过所有测试。

```
$ bcachetest
start test0
test0 results:
--- lock kmem/bcache stats
lock: kmem: #test-and-set 0 #acquire() 33030
lock: kmem: #test-and-set 0 #acquire() 28
lock: kmem: #test-and-set 0 #acquire() 73
lock: bcache: #test-and-set 0 #acquire() 96
lock: bcache.bucket: #test-and-set 0 #acquire() 6229
lock: bcache.bucket: #test-and-set 0 #acquire() 6204
lock: bcache.bucket: #test-and-set 0 #acquire() 4298
lock: bcache.bucket: #test-and-set 0 #acquire() 4286
lock: bcache.bucket: #test-and-set 0 #acquire() 2302
lock: bcache.bucket: #test-and-set 0 #acquire() 4272
lock: bcache.bucket: #test-and-set 0 #acquire() 2695
lock: bcache.bucket: #test-and-set 0 #acquire() 4709
lock: bcache.bucket: #test-and-set 0 #acquire() 6512
lock: bcache.bucket: #test-and-set 0 #acquire() 6197
lock: bcache.bucket: #test-and-set 0 #acquire() 6196
lock: bcache.bucket: #test-and-set 0 #acquire() 6201
lock: bcache.bucket: #test-and-set 0 #acquire() 6201
--- top 5 contended locks:
lock: virtio_disk: #test-and-set 1483888 #acquire() 1221
lock: proc: #test-and-set 38718 #acquire() 76050
lock: proc: #test-and-set 34460 #acquire() 76039
lock: proc: #test-and-set 31663 #acquire() 75963
lock: wait_lock: #test-and-set 11794 #acquire() 16
tot= 0
test0: OK
start test1

test1 OK
start test2

test2 OK
start test3

test3 OK
$ usertests -q
  ...
ALL TESTS PASSED
$
```

请给所有锁命名，名称以"bcache"开头。
也就是说，你应该为每个锁调用
[`initlock`](/source/xv6-riscv/kernel/spinlock.c.md#initlock-kernel-spinlock-c)，
并传递一个以"bcache"开头的名称。

减少块缓存中的争用比 kalloc 更
棘手，因为 bcache 缓冲区在进程（因此 CPU）之间真正
共享。
对于 kalloc，可以通过
给每个 CPU 自己的
分配器来消除大部分争用；这对块缓存不起作用。
我们建议你使用哈希表查找缓存中的块号，
该哈希表每个哈希桶有一个锁。

在某些情况下，如果你的解决方案
有锁冲突是可以的：
*   当两个进程并发使用相同的块号时。
    `bcachetest` `test0` 从不这样做。
*   当两个进程并发在缓存中未命中，并且
    需要找到一个未使用的块来替换时。
    `bcachetest` `test0` 从不这样做。
*   当两个进程并发使用在你用于分区块和
    锁的任何方案中冲突的块时；例如，如果两个进程使用块号哈希到哈希表中同一槽的块。
    `bcachetest` `test0` 可能会这样做，取决于你的
    设计，但你应该尝试调整你的方案
    细节以避免冲突（例如，更改
    你的哈希表的大小）。

`bcachetest` 的 `test1` 使用比缓冲区更多的不同块，
并练习许多文件系统代码路径。

以下是一些提示：
*   阅读 xv6 书籍中对块缓存的描述（第 8.1-8.3 节）。

*   使用固定数量的桶而不动态调整
    哈希表大小是可以的。使用素数个
    桶（例如，13）以减少哈希冲突的可能性。

*   在哈希表中搜索缓冲区并在找不到缓冲区时为其分配
    条目必须是
    原子的。

*   移除所有缓冲区的列表（`bcache.head` 等）
    并且不要实现 LRU。通过此更改 [`brelse`](/source/xv6-riscv/kernel/bio.c.md#brelse-kernel-bio-c) 不需要
    获取 bcache 锁。在 [`bget`](/source/xv6-riscv/kernel/bio.c.md#bget-kernel-bio-c) 中，你可以选择
    任何具有 `refcnt == 0` 的块，而不是
    最近最少使用的块。

*   你可能无法原子地检查缓存的
    buf 并（如果未缓存）找到一个未使用的 buf；如果缓冲区不在
    缓存中，你可能必须
    释放所有锁并从头开始。在 [`bget`](/source/xv6-riscv/kernel/bio.c.md#bget-kernel-bio-c) 中序列化查找未使用的 buf 是可以的（即，[`bget`](/source/xv6-riscv/kernel/bio.c.md#bget-kernel-bio-c) 中选择
    在缓存查找未命中时重新使用的
    缓冲区的部分）。

*   你的解决方案在某些情况下可能需要持有两个锁；例如，在驱逐期间你可能需要持有 bcache 锁和
    每个桶的锁。确保你避免死锁。

*   在替换块时，你可能会将 `struct buf` 从一个
    桶移动到另一个桶，因为新块哈希到一个
    不同的桶。你可能会遇到
    一个棘手的情况：新块可能哈希到与
    旧块相同的桶。确保在这种情况下避免死锁。

*   一些调试提示：实现桶锁，但将全局 
    bcache.lock 在 bget 的开始/结束处获取/释放以序列化
    代码。一旦你确定在没有竞争条件的情况下它是正确的，
    移除全局锁并处理并发问题。你也可以
    运行 `make CPUS=1 qemu` 以使用一个核心进行测试。

*   使用 xv6 的竞争检测器查找潜在的竞争（参见上面如何
    使用竞争检测器）。
          
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

如果你运行 `make zipball` 并且你有未提交的更改或
未跟踪的文件，你会看到类似于以下的输出：
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
> *   你可以在 Gradescope 上检查你的提交状态并下载提交的
>     代码。Gradescope 实验成绩是你的最终实验成绩。

## 可选挑战练习
  
*   维护 LRU 列表，以便驱逐最近最少使用的
    缓冲区而不是任何未使用的缓冲区。
    
*   使缓冲区缓存中的查找无锁。提示：使用
    gcc 的 `__sync_*` 函数。你如何说服自己
    你的实现是正确的？