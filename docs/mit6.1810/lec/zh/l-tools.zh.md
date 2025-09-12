# 6.1810 使用的工具与RISC-V入门

## 6.1810 使用的工具

本课程需要 RISC-V 版本的 QEMU 7.2+、GDB 8.3+、GCC 和 Binutils。

如果您在设置过程中遇到问题，请到 office hours 或在 Piazza 上发帖。我们很乐意提供帮助！

### Debian 或 Ubuntu
```bash
sudo apt-get install git build-essential gdb-multiarch qemu-system-misc gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu
```

您可能需要运行 Ubuntu 24 (或更高版本) 才能通过 apt-get 安装足够新的 qemu。

### Arch Linux
```bash
sudo pacman -S riscv64-linux-gnu-binutils riscv64-linux-gnu-gcc riscv64-linux-gnu-gdb qemu-emulators-full
```

### 在 Windows 上安装

我们鼓励运行 Windows 的学生在本地机器上安装 Linux 或使用 WSL 2 (Windows Subsystem for Linux 2)。

我们也鼓励学生安装 [Windows Terminal](https://apps.microsoft.com/store/detail/windows-terminal/9N0DX20HK701) 工具来代替 Powershell/Command Prompt。

要使用 WSL 2，首先请确保您已安装 [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10)。然后从 Microsoft Store 添加 [Ubuntu 24.04](https://apps.microsoft.com/detail/9nz3klhxdjp5)。之后您应该能够启动 Ubuntu 并与机器交互。

*重要提示：请确保您运行的是 WSL 版本 2。WSL 1 不适用于 6.1810 实验。要检查，请在 Windows 终端中运行 `wsl -l -v` 以确认已安装 WSL 2 和正确的 Ubuntu 版本。*

要安装本课程所需的所有软件，请运行：
```bash
$ sudo apt-get update && sudo apt-get upgrade
$ sudo apt-get install git build-essential gdb-multiarch qemu-system-misc gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu
```

在 Windows 中，您可以在 `\\wsl$\\` 目录下访问所有 WSL 文件。例如，Ubuntu 20.04 安装的主目录应该在 `\\wsl$\\Ubuntu-20.04\\home\\<username>\\`。

### 在 macOS 上安装

首先，安装开发者工具：
```bash
$ xcode-select --install
```

接下来，安装 [Homebrew](https://brew.sh/)，一个 macOS 的包管理器：
```bash
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

接下来，安装 [RISC-V 编译器工具链](https://github.com/riscv/homebrew-riscv)：
```bash
$ brew tap riscv/riscv
$ brew install riscv-tools
```

brew 公式可能不会链接到 `/usr/local`。您需要更新 shell 的 rc 文件 (例如 `~/.bashrc`) 以将适当的目录添加到 `$PATH`。
```bash
PATH=$PATH:/usr/local/opt/riscv-gnu-toolchain/bin
```

最后，安装 QEMU：
```bash
brew install qemu
```

## RISC-V 调用约定、栈帧和 GDB

C代码被编译成机器指令。理解这层转换对于编写无法用C表达的代码（例如，在系统调用实验中）至关重要。

### RISC-V 抽象机器

- **基础:** 程序计数器 (PC), 32个通用寄存器 (x0-x31)。
- **寄存器约定:**
  - `ra` (x1): 返回地址 (由调用者保存)。
  - `sp` (x2): 栈指针 (由被调用者保存)。
  - `a0-a7` (x10-x17): 函数参数和返回值。
  - `s0-s11` (x8-x9, x18-x27): 被调用者保存的寄存器。如果一个函数要使用它们，必须在函数开头将它们保存在栈上，并在返回前恢复。
  - `t0-t6` (x5-x7, x28-x31): 调用者保存的临时寄存器。函数可以自由使用它们，无需保存。

### 函数调用

- **`call` 指令:** `call` 实际上是一个伪指令，它做两件事：
  1.  将返回地址（即 `call` 指令的下一条指令的地址）存入 `ra` 寄存器。
  2.  无条件跳转到目标函数的标签处。
- **`ret` 指令:** `ret` 也是一个伪指令，它跳转到 `ra` 寄存器中保存的地址。

**问题:** 如果函数 `f` 调用了函数 `g`，`g` 又调用了 `h`，会发生什么？
- `g` 调用 `h` 时，会覆盖 `ra` 寄存器，导致 `g` 无法正确返回到 `f`。
- **解决方案:** 在函数（非叶子函数）的开头（称为**函数序言, prologue**），必须在栈上为自己创建一个**栈帧 (stack frame)**，并将 `ra` 和其他需要保留的 `s` 寄存器保存在栈帧中。在函数返回前（称为**函数尾声, epilogue**），再从栈帧中恢复这些寄存器。

### 栈帧 (Stack Frame)

栈是向下增长的。一个典型的栈帧结构如下：

```
(高地址)
+-----------------+
|  返回地址 (ra)  |
+-----------------+
| 上一个栈帧的 fp |
+-----------------+
|  保存的 s 寄存器 |
+-----------------+
|   局部变量      |
+-----------------+
(低地址) <- sp
```

- `sp` (栈指针) 指向当前栈帧的顶部。
- `fp` (帧指针, `s0`) 指向当前栈帧的底部。通过 `fp` 可以方便地访问局部变量和参数。

### GDB 调试技巧

- **`layout split`:** 同时显示代码、汇编和寄存器，非常方便。
- **`stepi` / `si`:** 执行单条汇编指令。
- **`nexti` / `ni`:** 执行单条汇编指令，但会跳过函数调用。
- **`info registers`:** 显示所有寄存器的值。
- **`p $reg`:** 打印特定寄存器 `reg` 的值。
- **`x/Nfu addr`:** 检查内存。例如 `x/10i $pc` 表示显示从PC开始的10条指令；`x/4g $sp` 表示以8字节（giant word）为单位显示从sp开始的4个值。
- **`backtrace` / `bt`:** 显示函数调用栈。
- **`info frame`:** 显示当前栈帧的详细信息。
- **`frame N`:** 切换到编号为N的栈帧。