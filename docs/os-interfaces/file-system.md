# 文件系统

xv6文件系统提供数据文件，其中包含未解释的字节数组，以及目录，其中包含对数据文件和其他目录的命名引用。
目录形成一个树，从一个称为**根**的特殊目录开始。
像`/a/b/c`这样的**路径**引用根目录`/`中名为`a`的目录中名为`b`的目录中名为`c`的文件或目录。
不以`/`开头的路径是相对于调用进程的**当前目录**来评估的，该目录可以用`chdir`系统调用来更改。
这两个代码片段打开相同的文件（假设所有涉及的目录都存在）：
```c
chdir("/a");
chdir("b");
open("c", O_RDONLY);
open("/a/b/c", O_RDONLY);
```
第一个片段将进程的当前目录更改为`/a/b`；
第二个片段既不引用也不更改进程的当前目录。

有创建新文件和目录的系统调用：
`mkdir`创建一个新目录，
带有`O_CREATE`标志的`open`创建一个新数据文件，
`mknod`创建一个新设备文件。
这个例子说明了所有三种情况：
```c
mkdir("/dir");
fd = open("/dir/file", O_CREATE|O_WRONLY);
close(fd);
mknod("/console", 1, 1);
```
`mknod`创建一个引用设备的特殊文件。
与设备文件关联的是主设备号和次设备号（`mknod`的两个参数），它们唯一地标识一个内核设备。
当一个进程稍后打开一个设备文件时，内核会将`read`和`write`系统调用转移到内核设备实现，而不是将它们传递给文件系统。

一个文件的名称与文件本身是不同的；
同一个底层文件，称为**inode**，可以有多个名称，称为**链接**。
每个链接由一个目录中的一个条目组成；
该条目包含一个文件名和对一个inode的引用。
一个inode持有关于文件的**元数据**，包括
其类型（文件、目录或设备）、
其长度、
文件内容在磁盘上的位置，
以及文件的链接数。

`fstat`系统调用从文件描述符引用的inode中检索信息。
它填充一个在`stat.h` ([`kernel/stat.h`](/source/xv6-riscv/kernel/stat.h.md))中定义的`struct stat`：
```c
#define T_DIR     1   // Directory
#define T_FILE    2   // File
#define T_DEVICE  3   // Device
struct stat {
  int dev;     // File system's disk device
  uint ino;    // Inode number
  short type;  // Type of file
  short nlink; // Number of links to file
  uint64 size; // Size of file in bytes
};
```

`link`系统调用创建另一个引用与现有文件相同inode的文件系统名称。
这个片段创建了一个名为`a`和`b`的新文件。
```c
open("a", O_CREATE|O_WRONLY);
link("a", "b");
```
从`a`读取或写入与从`b`读取或写入相同。
每个inode都由一个唯一的*inode号*标识。
在上面的代码序列之后，可以通过检查`fstat`的结果来确定`a`和`b`引用相同的基础内容：
两者都将返回相同的inode号（`ino`），并且`nlink`计数将设置为2。

`unlink`系统调用从文件系统中删除一个名称。
只有当文件的链接计数为零且没有文件描述符引用它时，文件的inode和保存其内容的磁盘空间才会被释放。
因此，将
```c
unlink("a");
```
添加到最后一个代码序列会使inode和文件内容可以作为`b`访问。
此外，
```c
fd = open("/tmp/xyz", O_CREATE|O_RDWR);
unlink("/tmp/xyz");
```
是创建没有名称的临时inode的惯用方法，当进程关闭`fd`或退出时，该inode将被清理。

Unix提供了可从shell调用的用户级程序作为文件实用程序，例如`mkdir`、`ln`和`rm`。
这种设计允许任何人通过添加新的用户级程序来扩展命令行界面。事后看来，这个计划似乎是显而易见的，但在Unix时代设计的其他系统通常将这些命令内置到shell中（并将shell内置到内核中）。

一个例外是`cd`，它内置在shell中([`user/sh.c:66`](/source/xv6-riscv/user/sh.c.md#L66))。
`cd`必须更改shell本身的当前工作目录。如果`cd`作为常规命令运行，那么shell将派生一个子进程，子进程将运行`cd`，并且`cd`将更改*子进程*的工作目录。父进程（即shell）的工作目录不会改变。