# 管道

**管道**是一个小的内核缓冲区，作为一对文件描述符暴露给进程，一个用于读取，一个用于写入。
向管道的一端写入数据，使得这些数据可以从管道的另一端读取。
管道为进程间通信提供了一种方式。

以下示例代码运行程序[`wc`](/source/xv6-riscv/user/wc.c)，其标准输入连接到管道的读取端。

```
c
int p[2];
char *argv[2];
argv[0] = "wc";
argv[1] = 0;
pipe(p);
if(fork() == 0) {
  close(0);
  dup(p[0]);
  close(p[0]);
  close(p[1]);
  exec("/bin/wc", argv);
} else {
  close(p[0]);
  write(p[1], "hello world\n", 12);
  close(p[1]);
}

```

程序调用[`pipe`](/source/xv6-riscv/user/user.h)，它创建一个新管道，并将读写文件描述符记录在数组`p`中。
[`fork`](/source/xv6-riscv/user/user.h)之后，父子进程都有引用该管道的文件描述符。
子进程调用[`close`](/source/xv6-riscv/user/user.h)和[`dup`](/source/xv6-riscv/user/user.h)使文件描述符零引用管道的读取端，
关闭`p`中的文件描述符，并调用[`exec`](/source/xv6-riscv/user/user.h)来运行[`wc`](/source/xv6-riscv/user/wc.c)。
当[`wc`](/source/xv6-riscv/user/wc.c)从其标准输入读取时，它从管道中读取。
父进程关闭管道的读取端，向管道写入，然后关闭写入端。

如果没有数据可用，对管道的[`read`](/source/xv6-riscv/user/user.h)会等待数据被写入或所有引用写入端的文件描述符被关闭；在后一种情况下，[`read`](/source/xv6-riscv/user/user.h)将返回0，就像到达数据文件的末尾一样。
[`read`](/source/xv6-riscv/user/user.h)会阻塞直到不可能有新数据到达，这是为什么在上面的[`wc`](/source/xv6-riscv/user/wc.c)执行之前，子进程关闭管道的写入端很重要的原因之一：如果[`wc`](/source/xv6-riscv/user/wc.c)的一个文件描述符引用了管道的写入端，[`wc`](/source/xv6-riscv/user/wc.c)将永远看不到文件结束符。

xv6 shell以类似于上述代码的方式实现诸如`grep fork sh.c | wc -l`之类的管道([`user/sh.c:108`](/source/xv6-riscv/user/sh.c.md#L108))。
子进程创建一个管道以连接管道的左端和右端。然后它为管道的左端调用[`fork`](/source/xv6-riscv/user/user.h)和[`runcmd`](/source/xv6-riscv/user/sh.c)，为管道的右端调用[`fork`](/source/xv6-riscv/user/user.h)和[`runcmd`](/source/xv6-riscv/user/sh.c)，并等待两者完成。
管道的右端可能是一个本身包含管道的命令（例如，`a | b | c`），它本身会派生两个新的子进程（一个用于`b`，一个用于`c`）。
因此，shell可能会创建一个进程树。该树的叶子是命令，内部节点是等待左右子节点完成的进程。

管道似乎并不比临时文件更强大：
管道

```

echo hello world | wc

```

可以不用管道实现为

```

echo hello world >/tmp/xyz; wc </tmp/xyz

```

在这种情况下，管道至少比临时文件有三个优势。
首先，管道会自动清理自己；
使用文件重定向，shell必须小心在完成后删除`/tmp/xyz`。
其次，管道可以传递任意长的数据流，而文件重定向需要在磁盘上有足够的可用空间来存储所有数据。
第三，管道允许管道阶段的并行执行，而文件方法要求第一个程序在第二个程序开始之前完成。