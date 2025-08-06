# I/O和文件描述符

**文件描述符**是一个小整数，代表一个内核管理的对象，进程可以从中读取或向其写入。
进程可以通过打开文件、目录或设备，或者通过创建管道，或者通过复制现有描述符来获取文件描述符。
为简单起见，我们通常将文件描述符引用的对象称为“文件”；文件描述符接口抽象了文件、管道和设备之间的差异，使它们都看起来像字节流。
我们将输入和输出称为**I/O**。

在内部，xv6内核使用文件描述符作为每个进程表的索引，因此每个进程都有一个从零开始的私有文件描述符空间。
按照惯例，进程从文件描述符0（标准输入）读取，将输出写入文件描述符1（标准输出），并将错误消息写入文件描述符2（标准错误）。
正如我们将看到的，shell利用这个惯例来实现I/O重定向和管道。shell确保它始终有三个打开的文件描述符([`user/sh.c:53`](/source/xv6-riscv/user/sh.c.md#L53))，默认情况下是控制台的文件描述符。

[`read`](/source/xv6-riscv/user/user.h.md)和[`write`](/source/xv6-riscv/user/user.h.md)系统调用从由文件描述符命名的打开文件中读取字节和写入字节。
调用`read(fd, buf, n)`最多从文件描述符`fd`读取`n`个字节，将它们复制到`buf`中，并返回读取的字节数。
每个引用文件的文件描述符都有一个与之关联的偏移量。
[`read`](/source/xv6-riscv/user/user.h.md)从当前文件偏移量读取数据，然后将该偏移量增加读取的字节数：
随后的[`read`](/source/xv6-riscv/user/user.h.md)将返回第一个[`read`](/source/xv6-riscv/user/user.h.md)返回的字节之后的字节。
当没有更多字节可读时，[`read`](/source/xv6-riscv/user/user.h.md)返回零以指示文件结尾。

调用`write(fd, buf, n)`将`n`个字节从`buf`写入文件描述符`fd`并返回写入的字节数。
只有在发生错误时才会写入少于`n`个字节。
像[`read`](/source/xv6-riscv/user/user.h.md)一样，[`write`](/source/xv6-riscv/user/user.h.md)在当前文件偏移量处写入数据，然后将该偏移量增加写入的字节数：
每个[`write`](/source/xv6-riscv/user/user.h.md)都从前一个停止的地方继续。

以下程序片段（构成程序[`cat`](/source/xv6-riscv/user/cat.c.md)的精髓）将其标准输入的数据复制到其标准输出。如果发生错误，它会向标准错误写入一条消息。

```
c
char buf[512];
int n;
for(;;){
  n = read(0, buf, sizeof buf);
  if(n == 0)
    break;
  if(n < 0){
    fprintf(2, "read error\n");
    exit(1);
  }
  if(write(1, buf, n) != n){
    fprintf(2, "write error\n");
    exit(1);
  }
}

```

代码片段中需要注意的重要一点是，[`cat`](/source/xv6-riscv/user/cat.c.md)不知道它是在从文件、控制台还是管道读取。
同样，[`cat`](/source/xv6-riscv/user/cat.c.md)也不知道它是在向控制台、文件还是其他任何地方打印。
文件描述符的使用以及文件描述符0是输入、文件描述符1是输出的惯例，使得[`cat`](/source/xv6-riscv/user/cat.c.md)的实现很简单。

[`close`](/source/xv6-riscv/user/user.h.md)系统调用释放一个文件描述符，使其可以被未来的[`open`](/source/xv6-riscv/user/user.h.md)、[`pipe`](/source/xv6-riscv/user/user.h.md)或[`dup`](/source/xv6-riscv/user/user.h.md)系统调用（见下文）重用。
新分配的文件描述符始终是当前进程的最低编号的未使用描述符。

文件描述符和[`fork`](/source/xv6-riscv/user/user.h.md)的交互使得I/O重定向易于实现。
[`fork`](/source/xv6-riscv/user/user.h.md)复制父进程的文件描述符表及其内存，因此子进程以与父进程完全相同的打开文件开始。
系统调用[`exec`](/source/xv6-riscv/user/user.h.md)替换调用进程的内存，但保留其文件表。
这种行为允许shell通过forking，在子进程中重新打开选定的文件描述符，然后调用[`exec`](/source/xv6-riscv/user/user.h.md)来运行新程序，从而实现**I/O重定向**。
这是一个shell为命令`cat < input.txt`运行的代码的简化版本：

```
c
char *argv[2];
argv[0] = "cat";
argv[1] = 0;
if(fork() == 0) {
  close(0);
  open("input.txt", O_RDONLY);
  exec("cat", argv);
}

```

子进程关闭文件描述符0后，[`open`](/source/xv6-riscv/user/user.h.md)保证为新打开的`input.txt`使用该文件描述符：0将是最小的可用文件描述符。
然后[`cat`](/source/xv6-riscv/user/cat.c.md)执行，其文件描述符0（标准输入）引用`input.txt`。
父进程的文件描述符不受此序列的影响，因为它只修改子进程的描述符。

xv6 shell中I/O重定向的代码正是以这种方式工作的([`user/sh.c:83`](/source/xv6-riscv/user/sh.c.md#L83))。
回想一下，在代码的这一点上，shell已经fork了子shell，并且[`runcmd`](/source/xv6-riscv/user/sh.c.md)将调用[`exec`](/source/xv6-riscv/user/user.h.md)来加载新程序。

[`open`](/source/xv6-riscv/user/user.h.md)的第二个参数由一组标志组成，以位表示，控制[`open`](/source/xv6-riscv/user/user.h.md)的功能。可能的值在文件控制(fcntl)头文件(`kernel/fcntl.h:1-5`)中定义：
`O_RDONLY`、`O_WRONLY`、`O_RDWR`、`O_CREATE`和`O_TRUNC`，它们指示[`open`](/source/xv6-riscv/user/user.h.md)
以只读方式打开文件，
或以只写方式，
或以读写方式，
如果文件不存在则创建文件，
并将文件截断为零长度。

现在应该清楚为什么[`fork`](/source/xv6-riscv/user/user.h.md)和[`exec`](/source/xv6-riscv/user/user.h.md)是分开的调用很有帮助：在这两者之间，shell有机会重定向子进程的I/O，而不会干扰主shell的I/O设置。
人们可以想象一个假设的组合`forkexec`系统调用，但使用这种调用进行I/O重定向的选项似乎很笨拙。
shell可以在调用`forkexec`之前修改自己的I/O设置（然后撤消这些修改）；或者`forkexec`可以将I/O重定向的指令作为参数；或者（最不吸引人的）每个像[`cat`](/source/xv6-riscv/user/cat.c.md)这样的程序都可以被教导自己进行I/O重定向。

尽管[`fork`](/source/xv6-riscv/user/user.h.md)复制了文件描述符表，但每个底层的文件偏移量在父子进程之间是共享的。
考虑这个例子：

```
c
if(fork() == 0) {
  write(1, "hello ", 6);
  exit(0);
} else {
  wait(0);
  write(1, "world\n", 6);
}

```

在这个片段的末尾，附加到文件描述符1的文件将包含数据`hello world`。
父进程中的[`write`](/source/xv6-riscv/user/user.h.md)（由于[`wait`](/source/xv6-riscv/user/user.h.md)，仅在子进程完成后运行）从子进程的[`write`](/source/xv6-riscv/user/user.h.md)停止的地方继续。
这种行为有助于从shell命令序列中产生顺序输出，例如`(echo hello; echo world) >output.txt`。

[`dup`](/source/xv6-riscv/user/user.h.md)系统调用复制一个现有的文件描述符，返回一个新的文件描述符，它引用相同的底层I/O对象。
两个文件描述符共享一个偏移量，就像[`fork`](/source/xv6-riscv/user/user.h.md)复制的文件描述符一样。
这是另一种将`hello world`写入文件的方式：

```
c
fd = dup(1);
write(1, "hello ", 6);
write(fd, "world\n", 6);

```


如果两个文件描述符是通过一系列[`fork`](/source/xv6-riscv/user/user.h.md)和[`dup`](/source/xv6-riscv/user/user.h.md)调用从同一个原始文件描述符派生出来的，那么它们共享一个偏移量。
否则，文件描述符不共享偏移量，即使它们是由对同一文件的[`open`](/source/xv6-riscv/user/user.h.md)调用产生的。
[`dup`](/source/xv6-riscv/user/user.h.md)允许shell实现像这样的命令：
`ls existing-file non-existing-file > tmp1 2>&1`。
`2>&1`告诉shell给命令一个文件描述符2，它是描述符1的副本。
现有文件的名称和不存在文件的错误消息都将显示在文件`tmp1`中。
xv6 shell不支持错误文件描述符的I/O重定向，但现在您知道如何实现它了。

文件描述符是一个强大的抽象，因为它们隐藏了它们所连接的细节：
一个向文件描述符1写入的进程可能是在向文件、像控制台这样的设备或管道写入。