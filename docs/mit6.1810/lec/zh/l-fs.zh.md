---
title: 第6讲：文件系统
---

6.1810 2024 第13讲：文件系统

**为什么文件系统很有用？**
- 重启后的持久性
- 命名和组织
- 在程序和用户之间共享

**为什么有趣？**
- 崩溃恢复
- 性能/并发
- 共享
- 安全
- 抽象很有用：管道、设备、/proc、/afs、Plan 9
  - 所以面向文件系统的应用可以处理多种对象
- 两个实验的主题

**API 示例 -- UNIX/Posix/Linux/xv6/&c:**
```c
fd = open("x/y", -);
write(fd, "abc", 3);
link("x/y", "x/z");
unlink("x/y");
write(fd, "def", 3);
close(fd);
// 文件 y/z 包含 abcdef
```
你可能通过 Python 的 `io` 或 `os` 模块使用过这个 API，它们封装了这个 API。

**UNIX FS API 中可见的高级选择**
- 对象：文件 (相对于虚拟磁盘、数据库)
- 内容：字节数组 (相对于 80 字节记录、BTree)
- 命名：人类可读 (相对于对象 ID)
- 组织：名称层次结构
- 同步：无 (相对于锁定、版本) 
  - `link()`/`unlink()` 可以在 `open()` 并发执行时更改名称层次结构
- 还有其他文件系统 API，有时差异很大！

**API 的一些含义：**
- `fd` 指向某个东西
  - 即使文件名改变，它也保持不变
  - 或者即使文件在打开时被删除！
- 一个文件可以有多个链接
  - 即出现在多个目录中
  - 这些出现中没有一个是特殊的
  - 所以文件信息必须存储在目录之外的地方
- 因此：
  - FS 将文件信息记录在磁盘上的一个 "inode" 中
  - FS 用 i-number (FD 的内部版本) 引用 inode
  - inode 必须有链接计数 (告诉我们何时释放)
  - inode 必须有打开的 FD 计数
  - inode 的释放被推迟到最后一个链接和 FD 都消失之后

让我们来谈谈 xv6

**FS 软件层**
- 系统调用
- 名称操作 | FD 操作
- Inodes
- Inode 缓存
- 日志
- 缓冲区缓存
- virtio_disk 驱动

**存储在持久介质上的数据**
- 数据在没有电源的情况下保留在磁盘上
- 常见的存储介质：
  - 硬盘驱动器 (大但慢，便宜)
  - 固态硬盘 (小但快，更贵)
- 历史上，磁盘通常以 512 字节为单位进行读/写，称为扇区

**硬盘驱动器 (HDD)**
- 同心磁道
- 每个磁道是一系列扇区
- 磁头必须寻道，磁盘必须旋转
  - 随机访问很慢 (每次访问 5 或 10 毫秒)
  - 顺序访问快得多 (100 MB/秒)
- 每个扇区都有 ECC
- 只能读/写整个扇区
- 因此：小于扇区的写入很昂贵 (读-修改-写)

**固态硬盘 (SSD)**
- 非易失性 "闪存" 内存
- 随机访问：100 微秒
- 顺序访问：500 MB/秒
- 内部复杂 -- 除了性能有时可见外，都是隐藏的
  - 闪存在重新写入之前必须被擦除
  - 闪存块的写入次数有限制
  - SSD 通过一层间接寻址来应对 -- 重映射块

**对于 HDD 和 SSD：**
- 顺序访问比随机访问快得多
- 大的读/写比小的快
- 这两者都影响了 FS 的设计和性能

**磁盘块**
- 大多数操作系统使用多个扇区的块，例如 4 KB 块 = 8 个扇区
- 以减少簿记和寻道开销
- xv6 使用 2 扇区的块

**磁盘布局**
- xv6 将磁盘视为一个扇区数组 (忽略磁盘的物理属性)
  - 0: 未使用
  - 1: 超级块 (大小, ninodes)
  - 2: 事务日志
  - 32: inode 数组，打包成块
  - 45: 块使用位图 (0=空闲, 1=已用)
  - 46: 文件/目录内容块
  - 磁盘末尾

- xv6 的 `mkfs` 程序为一个空文件系统生成此布局
  - 该布局在文件系统的生命周期内是静态的
  - 参见 `mkfs` 的输出

**"元数据"**
- 磁盘上除文件内容外的所有东西
- 超级块、i-nodes、位图、目录内容

**磁盘上的 inode**
- `type` (free, file, directory, device)
- `nlink`
- `size`
- `addrs[12+1]`

**直接和间接块**

**示例：**
- 如何找到文件的第 8000 个字节？
- 逻辑块 7 = 8000 / BSIZE (=1024) 
- `addrs` 中的第 7 个条目

- 每个 i-node 都有一个 i-number
  - 很容易将 i-number 转换为 inode
  - inode 长 64 字节
  - 磁盘上的字节地址：32*BSIZE + 64*inum

**目录内容**
- 目录很像一个文件
  - 但用户不能直接写入
- 内容是 `dirent` 的数组
- `dirent`:
  - `inum`
  - 14 字节的文件名
- 如果 `inum` 为零，则 `dirent` 是空闲的

你应该将 FS 视为一个磁盘上的数据结构
- [树：目录、inodes、块]
- 有两个分配池：inodes 和块

让我们看看 xv6 的实际操作
- 关注磁盘写入
- 通过更新方式说明磁盘上的数据结构

**问：xv6 如何创建一个文件？**

`rm fs.img & make qemu`

`mkfs` 的输出：
`nmeta 46 (boot, super, log blocks 30, inode blocks 13, bitmap blocks 1) blocks 1954 total 2000`
`balloc: first 770 blocks have been allocated`

`$ echo hi > x`
```c
// create
bwrite: block 33 by ialloc   // 在 inode 块 33 中分配 inode
bwrite: block 33 by iupdate  // 更新 inode (例如，设置 nlink)
bwrite: block 46 by writei   // 写入目录条目，通过 dirlink() 添加 "x"
bwrite: block 32 by iupdate  // 更新目录 inode，因为 inode 可能已更改
bwrite: block 33 by iupdate  // itrunc 新的 inode (即使没有任何改变)
// write
bwrite: block 45 by balloc   // 在位图块 45 中分配一个块
bwrite: block 770 by bzero   // 将分配的块 (块 770) 清零
bwrite: block 770 by writei  // 写入它 (hi)
bwrite: block 33 by iupdate  // 更新 inode
// write
bwrite: block 770 by writei  // 写入它 (\n)
bwrite: block 33 by iupdate  // 更新 inode
```

**调用图：**
```
sys_open        sysfile.c
  create        sysfile.c
    ialloc      fs.c
    iupdate     fs.c
    dirlink     fs.c
      writei    fs.c
      iupdate fs.c
  itrunc        sysfile.c
    iupdate     fs.c
```

**问：块 33 中有什么？**
- 查看 `sysfile.c` 中的 `create()`

**问：为什么对块 33 有*两次*写入？**

**问：块 32 中有什么？**

**问：xv6 如何向文件写入数据？** (见上面的写入部分)

**调用图：**
```
sys_write       sysfile.c
  filewrite     file.c
    writei      fs.c
      bmap
        balloc
          bzero
      iupdate
```

**问：块 45 中有什么？**
- 查看 `writei` 对 `bmap` 的调用
- 查看 `bmap` 对 `balloc` 的调用

**问：块 770 中有什么？**

**问：为什么要有 `iupdate`？**
- 文件长度和 `addrs[]`

**问：xv6 如何删除一个文件？**

`$ rm x`
```c
bwrite: block 46 by writei    // 来自 sys_unlink; 目录内容
bwrite: block 32 by iupdate   // 来自目录内容的 writei
bwrite: block 33 by iupdate   // 来自 sys_unlink; 文件的链接计数
bwrite: block 45 by bfree     // 来自 itrunc, 来自 iput
bwrite: block 33 by iupdate   // 来自 itrunc; 长度清零
bwrite: block 33 by iupdate   // 来自 iput; 标记为空闲
```

**调用图：**
```
sys_unlink
  writei
  iupdate
  iunlockput
    iput
      itrunc
        bfree
        iupdate
      iupdate
```

**问：块 46 中有什么？**
- `sysfile.c` 中的 `sys_unlink`

**问：块 33 中有什么？**

**问：块 45 中有什么？**
- 查看 `iput`

**问：为什么有四次 `iupdate`？**

**文件系统中的并发**
- xv6 的目标适中
  - 并行读/写不同文件
  - 并行路径名查找
- 但是，即使是这些也带来了有趣的正确性挑战

**例如，如果并发调用 `ialloc` 会怎样？**
- 它们会得到相同的 inode 吗？
- 注意 `ialloc` 中的 `bread` / `write` / `brelse`
- `bread` 锁定块，可能会等待，并从磁盘读取
- `brelse` 解锁块

**让我们看看 `bio.c` 中的块缓存**
- 块缓存只保存少量最近使用的块
- `bio.c` 开头的 `bcache`

**FS 调用 `bread`，`bread` 调用 `bget`**
- `bget` 查看块是否已缓存
- 如果存在，锁定 (可能等待) 并返回块
  - 可能会在 `sleeplock` 中等待，直到当前使用进程释放
  - 如果已锁定，`sleep lock` 会让调用者休眠
- 如果不存在，重用一个现有的缓冲区
- `b->refcnt++` 防止在我们等待时缓冲区被回收
- 不变性：内存中一个磁盘块只有一个副本

**这里有两级锁定**
- `bcache.lock` 保护缓存内容的描述
- `b->lock` 只保护一个缓冲区

**问：块缓存替换策略是什么？**
- `prev ... head ... next`
- `bget` 重用 `bcache.head.prev` -- “尾部”
- `brelse` 将块移动到 `bcache.head.next`

**问：这是最好的替换策略吗？**

**问：为什么 I/O 有双重拷贝是有意义的？**
- 磁盘到缓冲区缓存
- 缓冲区缓存到用户空间
- 我们能修复它以获得更好的性能吗？

**问：我们应该为磁盘缓冲区分配多少 RAM？**

**路径名查找**
- 一次遍历一个路径名元素
- 可能涉及许多块：
  - 顶级目录的 inode
  - 顶级目录的数据
  - 下一级的 inode
  - ... 等等 ...
- 它们中的每一个都可能导致缓存未命中
  - 磁盘访问是昂贵的
- => 允许并行路径名查找
  - 如果一个进程在磁盘上阻塞，另一个进程可以继续查找
  - 挑战：`unlink` 可能与查找并发发生

**让我们看看 `namex()` (kernel/fs.c)**
- `ilock()`: 锁定当前目录
- 找到下一个目录 inode
- 然后解锁当前目录
- 另一个进程可能会 `unlink` 下一个 inode
  - 但 inode 不会被删除，因为 inode 的 `refcnt > 0`
- 风险：`next` 指向与 `current` 相同的 inode (查找 ".")
  - 在获取 `next` 上的锁之前解锁 `current`
  - 关键思想：获取引用与锁定是分开的
```