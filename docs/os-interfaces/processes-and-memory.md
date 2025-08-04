# 进程和内存

一个xv6进程由用户空间内存（指令、数据和栈）和内核私有的每个进程的状态组成。
Xv6 **分时** 处理进程：它透明地在等待执行的进程集合中切换可用的CPU。
当一个进程不执行时，xv6会保存该进程的CPU寄存器，并在下次运行该进程时恢复它们。
内核为每个进程关联一个进程标识符，或 `PID`。

## xv6 系统调用 {#fig-api}

| 系统调用 | 描述 |
| --- | --- |
| `int fork()` | 创建一个进程，返回子进程的PID。 |
| `int exit(int status)` | 终止当前进程；状态报告给wait()。无返回。 |
| `int wait(int *status)` | 等待一个子进程退出；退出状态在*status中；返回子进程PID。 |
| `int kill(int pid)` | 终止进程PID。成功返回0，错误返回-1。 |
| `int getpid()` | 返回当前进程的PID。 |
| `int sleep(int n)` | 暂停n个时钟周期。 |
| `int exec(char *file, char *argv[])` | 加载一个文件并带参数执行它；仅在出错时返回。 |
| `char *sbrk(int n)` | 将进程的内存增长n个零字节。返回新内存的起始地址。 |
| `int open(char *file, int flags)` | 打开一个文件；flags指示读/写；返回一个fd（文件描述符）。 |
| `int write(int fd, char *buf, int n)` | 从buf向文件描述符fd写入n个字节；返回n。 |
| `int read(int fd, char *buf, int n)` | 读入n个字节到buf；返回读取的字节数；文件末尾返回0。 |
| `int close(int fd)` | 释放打开的文件fd。 |
| `int dup(int fd)` | 返回一个新的文件描述符，引用与fd相同的文件。|
| `int pipe(int p[])` | 创建一个管道，将读/写文件描述符放入p[0]和p[1]。 |
| `int chdir(char *dir)` | 更改当前目录。 |
| `int mkdir(char *dir)` | 创建一个新目录。 |
| `int mknod(char *file, int, int)` | 创建一个设备文件。 |
| `int fstat(int fd, struct stat *st)` | 将有关打开文件的信息放入*st。 |
| `int link(char *file1, char *file2)` | 为文件file1创建另一个名称(file2)。 |
| `int unlink(char *file)` | 删除一个文件。 |

*Xv6系统调用。如无特别说明，这些调用成功时返回0，出错时返回-1。*

一个进程可以使用 [`fork`](/source/xv6-riscv/user/user.h) 系统调用创建一个新进程。
[`fork`](/source/xv6-riscv/user/user.h) 为新进程提供调用进程内存的精确副本：它将调用进程的指令、数据和栈复制到新进程的内存中。
[`fork`](/source/xv6-riscv/user/user.h) 在原始进程和新进程中都会返回。
在原始进程中，[`fork`](/source/xv6-riscv/user/user.h) 返回新进程的PID。
在新进程中，[`fork`](/source/xv6-riscv/user/user.h) 返回零。
原始进程和新进程通常被称为**父进程**和**子进程**。

例如，考虑以下用C编程语言编写的程序片段：


```
c
int pid = fork();
if(pid > 0){
  printf("parent: child=%d\n", pid);
  pid = wait((int *) 0);
  printf("child %d is done\n", pid);
} else if(pid == 0){
  printf("child: exiting\n");
  exit(0);
} else {
  printf("fork error\n");
}

```


[`exit`](/source/xv6-riscv/kernel/defs.h) 系统调用使调用进程停止执行并释放资源，如内存和打开的文件。
Exit接受一个整数状态参数，通常0表示成功，1表示失败。
[`wait`](/source/xv6-riscv/user/user.h) 系统调用返回当前进程的一个已退出（或被杀死）的子进程的PID，并将子进程的退出状态复制到传递给wait的地址；如果调用者的子进程都没有退出，[`wait`](/source/xv6-riscv/user/user.h) 会等待其中一个退出。
如果调用者没有子进程，[`wait`](/source/xv6-riscv/user/user.h) 立即返回-1。
如果父进程不关心子进程的退出状态，它可以向 [`wait`](/source/xv6-riscv/user/user.h) 传递一个0地址。

在示例中，输出行

```

parent: child=1234
child: exiting

```

可能会以任何顺序出现（甚至混合在一起），这取决于父进程或子进程哪个先到达其 [`printf`](/source/xv6-riscv/user/printf.c) 调用。
子进程退出后，父进程的 [`wait`](/source/xv6-riscv/user/user.h) 返回，导致父进程打印

```

parent: child 1234 is done

```

尽管子进程最初具有与父进程相同的内存内容，但父进程和子进程使用独立的内存和独立的寄存器执行：
在一个进程中更改一个变量不会影响另一个进程。例如，当 [`wait`](/source/xv6-riscv/user/user.h) 的返回值存储到父进程的 `pid` 中时，它不会改变子进程中的变量 `pid`。子进程中的 `pid` 值仍将为零。

[`exec`](/source/xv6-riscv/user/user.h) 系统调用用从文件系统中加载的新内存映像替换调用进程的内存。
该文件必须具有特定的格式，该格式指定文件的哪一部分包含指令，哪一部分是数据，从哪个指令开始执行等。Xv6使用ELF格式，第3章将对此进行更详细的讨论。
通常，该文件是编译程序源代码的结果。
当 [`exec`](/source/xv6-riscv/user/user.h) 成功时，它不会返回到调用程序；相反，从文件加载的指令在ELF头中声明的入口点开始执行。
[`exec`](/source/xv6-riscv/user/user.h) 接受两个参数：包含可执行文件的文件名和一个字符串参数数组。
例如：

```
c
char *argv[3];
argv[0] = "echo";
argv[1] = "hello";
argv[2] = 0;
exec("/bin/echo", argv);
printf("exec error\n");

```

该片段将调用程序替换为以参数列表 `echo hello` 运行的程序 `/bin/echo` 的实例。
大多数程序忽略参数数组的第一个元素，该元素通常是程序的名称。

xv6 shell使用上述调用代表用户运行程序。shell的主要结构很简单；请参见 [`main`](/source/xv6-riscv/user/zombie.c) ([user/sh.c:/main/](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/sh.c))。
主循环使用 [`getcmd`](/source/xv6-riscv/user/sh.c) 从用户读取一行输入。
然后它调用 [`fork`](/source/xv6-riscv/user/user.h)，创建一个shell进程的副本。父进程调用 [`wait`](/source/xv6-riscv/user/user.h)，而子进程运行命令。例如，如果用户向shell键入 `echo hello`，[`runcmd`](/source/xv6-riscv/user/sh.c) 将被调用，参数为 `echo hello`。
[`runcmd`](/source/xv6-riscv/user/sh.c) ([user/sh.c:/runcmd/](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/sh.c)) 运行实际的命令。对于 `echo hello`，它会调用 [`exec`](/source/xv6-riscv/user/user.h) ([user/sh.c:/exec.ecmd/](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/sh.c))。
如果 [`exec`](/source/xv6-riscv/user/user.h) 成功，则子进程将执行来自 `echo` 的指令，而不是 [`runcmd`](/source/xv6-riscv/user/sh.c)。
在某个时候 `echo` 会调用 [`exit`](/source/xv6-riscv/kernel/defs.h)，这将导致父进程从 [`main`](/source/xv6-riscv/user/zombie.c) ([user/sh.c:/main/](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/sh.c))中的 [`wait`](/source/xv6-riscv/user/user.h) 返回。

您可能想知道为什么 [`fork`](/source/xv6-riscv/user/user.h) 和 [`exec`](/source/xv6-riscv/user/user.h) 没有合并成一个调用；我们稍后会看到，shell在其I/O重定向的实现中利用了这种分离。
为了避免创建重复进程然后立即替换它（使用 [`exec`](/source/xv6-riscv/user/user.h)）的浪费，操作系统内核通过使用虚拟内存技术（如写时复制（见第4.4节））来优化 [`fork`](/source/xv6-riscv/user/user.h) 在这种用例下的实现。

Xv6隐式地分配大多数用户空间内存：[`fork`](/source/xv6-riscv/user/user.h) 分配子进程复制父进程内存所需的内存，而 [`exec`](/source/xv6-riscv/user/user.h) 分配足以容纳可执行文件的内存。
在运行时需要更多内存的进程（例如，对于 [`malloc`](/source/xv6-riscv/user/umalloc.c)）可以调用 `sbrk(n)` 来将其数据内存增长n个零字节；`sbrk` 返回新内存的位置。