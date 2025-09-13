# xv6 实验：实现 `pgprint` 系统调用以观察 [`sbrk`](/source/xv6-riscv/user/usertests.c.md#sbrk-user-usertests-c)

## 简介

本实验旨在通过添加一个新的系统调用 `pgprint` 来深入理解 xv6 的虚拟内存管理。`pgprint` 系统调用将打印出当前进程的页表信息。我们将创建一个测试程序 `sbrktest`，该程序调用 `sbrk(1)` 来增加一页内存，然后调用 `pgprint` 来观察页表的变化。

本指南将引导您完成以下步骤：

1.  创建一个测试程序 `user/sbrktest.c`。
2.  修改 `Makefile` 以包含新的测试程序。
3.  在用户空间和内核空间中添加新的系统调用 `pgprint`。
4.  实现 `pgprint` 的核心逻辑，即打印页表。
5.  编译并运行您的修改，以验证其正确性。

---

## 步骤 1: 创建测试程序 `sbrktest.c`

首先，我们需要创建一个用户程序，它将使用我们即将添加的新系统调用。

在 `user/` 目录下创建一个名为 `sbrktest.c` 的新文件，并将以下内容复制到其中：

```c
#include "kernel/param.h"
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

int
main(int argc, char *argv[])
{
  printf("sbrktest starting\n");
  
  // sbrk(1) should succeed.
  if(sbrk(1) == -1) {
    fprintf(2, "sbrk(1) failed\n");
    exit(1);
  }

  printf("sbrk(1) succeeded\n");
  
  // pgprint() should print the page table.
  pgprint();
  
  exit(0);
}
```

**代码解释:**

*   这个程序首先打印一条启动消息。
*   然后它调用 `sbrk(1)`，这个调用会请求内核将程序的内存增加1个字节。由于 xv6 按页（4096字节）分配内存，这实际上会分配一个完整的新页。
*   如果 `sbrk(1)` 成功，它会打印一条成功消息，然后调用我们即将创建的 `pgprint()` 系统调用来显示页表。
*   最后，程序正常退出。

---

## 步骤 2: 修改 Makefile

为了让 `make` 命令能够编译我们的新程序 `sbrktest.c`，我们需要将其添加到 `Makefile` 中的 `UPROGS` 列表中。

打开位于 `source/xv6-riscv/` 目录下的 `Makefile` 文件。找到 `UPROGS` 变量的定义（大约在第 137 行），并在列表的末尾添加 `$U/_sbrktest\`。

**找到以下代码块：**

```makefile
UPROGS=\
	$U/_pingpong\
	$U/_cat\
	$U/_clear\
	$U/_echo\
	$U/_forktest\
	$U/_grep\
	$U/_init\
	$U/_kill\
	$U/_ln\
	$U/_ls\
	$U/_mkdir\
	$U/_rm\
	$U/_sh\
	$U/_shutdown\
	$U/_reboot\
	$U/_sleep\
	$U/_stressfs\
	$U/_usertests\
	$U/_grind\
	$U/_wc\
	$U/_zombie\
	$U/_freememtest\
```

**修改为：**

```makefile
UPROGS=\
	$U/_pingpong\
	$U/_cat\
	$U/_clear\
	$U/_echo\
	$U/_forktest\
	$U/_grep\
	$U/_init\
	$U/_kill\
	$U/_ln\
	$U/_ls\
	$U/_mkdir\
	$U/_rm\
	$U/_sh\
	$U/_shutdown\
	$U/_reboot\
	$U/_sleep\
	$U/_stressfs\
	$U/_usertests\
	$U/_grind\
	$U/_wc\
	$U/_zombie\
	$U/_freememtest\
	$U/_sbrktest\
```

---

## 步骤 3: 添加系统调用

现在我们开始将 `pgprint` 系统调用集成到 xv6 内核中。这需要修改几个文件。

### 3.1 `user/usys.pl`

这个 Perl 脚本负责生成用户级系统调用存根。我们需要在这里添加 `pgprint`。

打开 `user/usys.pl` 并找到 `entry("freemem");` 这一行。在它下面添加新的一行 `entry("pgprint");`。

```perl
...
entry("uptime");
entry("shutdown");
entry("reboot");
entry("freemem");
entry("pgprint");
```

### 3.2 `user/user.h`

这是用户程序包含的头文件，其中声明了所有可用的系统调用。我们需要在这里添加 `pgprint` 的函数原型。

打开 [`user/user.h`](/source/xv6-riscv/user/user.h.md) 并在 `freemem` 的声明之后添加 `pgprint` 的声明。

```c
...
int uptime(void); // 获取系统自启动以来的ticks
int shutdown(void); // 关闭系统
int reboot(void); // 重启系统
int freemem(void); // 获取空闲内存
int pgprint(void); // 打印页表
...
```

### 3.3 `kernel/syscall.h`

这个文件定义了每个系统调用对应的唯一编号。我们需要为 `pgprint` 分配一个新的编号。

打开 [`kernel/syscall.h`](/source/xv6-riscv/kernel/syscall.h.md) 并在文件末尾添加 `SYS_pgprint` 的定义。我们将使用下一个可用的编号，即 25。

```c
...
#define SYS_reboot 23
#define SYS_freemem 24
#define SYS_pgprint 25
```

### 3.4 `kernel/syscall.c`

这个文件将系统调用编号映射到实际的内核处理函数。我们需要在这里将 `SYS_pgprint` 链接到 `sys_pgprint` 函数。

打开 [`kernel/syscall.c`](/source/xv6-riscv/kernel/syscall.c.md) 并进行两处修改：

1.  在外部函数声明列表中，添加 `sys_pgprint` 的声明。
2.  在 `syscalls` 数组中，添加 `SYS_pgprint` 的条目。

**添加外部声明：**

```c
...
extern uint64 sys_reboot(void);
extern uint64 sys_freemem(void);
extern uint64 sys_pgprint(void);
```

**添加到 `syscalls` 数组：**

```c
...
[SYS_reboot]   sys_reboot,
[SYS_freemem]  sys_freemem,
[SYS_pgprint]  sys_pgprint,
};
```

---

## 步骤 4: 实现内核功能

现在我们来实现 `pgprint` 系统调用的内核端逻辑。

### 4.1 `kernel/defs.h`

我们需要在 `vm.c` 中创建一个名为 `vmprint` 的函数来打印页表。在 `defs.h` 中添加它的函数原型，以便其他内核文件可以调用它。

打开 [`kernel/defs.h`](/source/xv6-riscv/kernel/defs.h.md)，在 `// vm.c` 部分的末尾添加 `vmprint` 的原型。

```c
// vm.c - 虚拟内存
...
int             copyin(pagetable_t, char *, uint64, uint64); // 从用户空间复制数据到内核
int             copyinstr(pagetable_t, char *, uint64, uint64); // 从用户空间复制字符串到内核
void            vmprint(pagetable_t); // 打印页表
```

### 4.2 `kernel/vm.c`

这是实现页表打印逻辑的核心部分。我们将添加一个 `vmprint` 函数和一个递归的辅助函数 `vmprint_level`。

将以下代码添加到 [`kernel/vm.c`](/source/xv6-riscv/kernel/vm.c.md) 的末尾：

```c
// 递归打印页表
void vmprint_level(pagetable_t pagetable, int level) {
    // 打印当前页表的层级和地址
    for (int i = 0; i < level; i++) {
        printf(".. ");
    }
    printf("PTE %p\n", pagetable);

    // 遍历页表中的所有PTE
    for (int i = 0; i < 512; i++) {
        pte_t pte = pagetable[i];
        if (pte & PTE_V) {
            // PTE有效，打印其信息
            for (int j = 0; j < level + 1; j++) {
                printf(".. ");
            }
            printf("%d: pte %p pa %p", i, pte, PTE2PA(pte));
            if (pte & PTE_R) printf(" R");
            if (pte & PTE_W) printf(" W");
            if (pte & PTE_X) printf(" X");
            if (pte & PTE_U) printf(" U");
            printf("\n");
            
            // 如果PTE指向下一级页表，则递归打印
            if ((pte & (PTE_R | PTE_W | PTE_X)) == 0) {
                uint64 child = PTE2PA(pte);
                vmprint_level((pagetable_t)child, level + 1);
            }
        }
    }
}

// 打印页表的主函数
void vmprint(pagetable_t pagetable) {
    printf("page table %p\n", pagetable);
    vmprint_level(pagetable, 0);
}
```

### 4.3 `kernel/sysproc.c`

最后，我们在 `sysproc.c` 中创建 `sys_pgprint` 函数。这个函数是系统调用的直接入口点，它会调用我们在 `vm.c` 中创建的 `vmprint` 函数。

将以下代码添加到 [`kernel/sysproc.c`](/source/xv6-riscv/kernel/sysproc.c.md) 的末尾：

```c
// sys_pgprint 系统调用：打印当前进程的页表。
uint64
sys_pgprint(void)
{
  struct proc *p = myproc();
  vmprint(p->pagetable);
  return 0;
}
```

---

## 步骤 5: 编译和测试

所有代码修改都已完成！现在是时候编译内核并运行我们的测试程序了。

在您的终端中，导航到 `xv6-riscv` 目录并执行以下命令：

```sh
make clean
make qemu
```

`make qemu` 命令会编译内核和用户程序，然后在 QEMU 模拟器中启动 xv6。在 xv6 的 shell 提示符下，运行我们的测试程序：

```sh
$ sbrktest
```

**预期输出:**

您应该首先看到来自 `sbrktest` 程序的输出：

```
sbrktest starting
sbrk(1) succeeded
```

紧接着，您将看到由 `pgprint` 系统调用打印出的大量页表信息。输出的格式将类似于：

```
page table 0x...
.. PTE 0x...
.. .. 0: pte 0x... pa 0x... R X U
.. .. 1: pte 0x... pa 0x... R W U
... (更多页表条目)
```

通过检查 `pgprint` 的输出，您可以观察到 `sbrk(1)` 调用后，进程的地址空间中确实增加了一个新的用户页（标记为 `U`）。

至此，您已成功地向 xv6 添加了一个新的系统调用，并用它来观察虚拟内存的变化！