---
title: 工具
---

# 6.1810 中使用的工具

对于本课程，您需要 RISC-V 版本的
QEMU 7.2+, GDB 8.3+, GCC 和 Binutils。

如果您在设置时遇到麻烦，请来答疑
或在 Piazza 上发帖。我们很高兴提供帮助！

### Debian 或 Ubuntu
```
sudo apt-get install git build-essential gdb-multiarch qemu-system-misc gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu
```

您可能需要运行 Ubuntu 24（或更高版本），以便
apt-get 安装足够新的 qemu。

### Arch Linux
```
sudo pacman -S riscv64-linux-gnu-binutils riscv64-linux-gnu-gcc riscv64-linux-gnu-gdb qemu-emulators-full
```

### 在 Windows 上安装

运行 Windows 的学生被建议在本地机器上安装 Linux
或使用 WSL 2（Windows Subsystem for Linux 2）。

我们也鼓励学生安装 [Windows Terminal](https://apps.microsoft.com/store/detail/windows-terminal/9N0DX20HK701) 工具，而不是使用 Powershell/Command Prompt。

要使用 WSL 2，首先确保您已安装 [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10)。然后从 Microsoft Store 添加 [Ubuntu 24.04](https://apps.microsoft.com/detail/9nz3klhxdjp5)。之后您应该能够启动 Ubuntu 并与机器交互。

> 重要：确保您运行的是 WSL 2 版本。
> WSL 1 无法与 6.1810 实验一起使用。
> 要检查，
> 在 Windows 终端中运行 `wsl -l -v` 以确认 WSL
> 2 和正确的 Ubuntu 版本已安装。

要安装本课程所需的所有软件，请运行：

```
$ sudo apt-get update && sudo apt-get upgrade
$ sudo apt-get install git build-essential gdb-multiarch qemu-system-misc gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu
```

从 Windows，您可以访问所有 WSL 文件在 *\"\\\\wsl$\\\\\"*
目录下。例如，Ubuntu 20.04 安装的主目录应该
在 *\"\\\\wsl$\\\\Ubuntu-20.04\\\\home\\\\&lt;username&gt;\\\\\"*。

### 运行 Linux 虚拟机
如果您在不方便安装
RISC-V 工具的操作系统上，您可能会发现运行 Linux
虚拟机 (VM) 并在 VM 中安装工具很有用。
安装 Linux 虚拟机是一个两步过程。首先，获取
虚拟化平台；我们建议：

*   [**VirtualBox**](https://www.virtualbox.org/)
    （Mac、Linux、Windows 免费）—— [下载
    页面](https://www.virtualbox.org/wiki/Downloads)

一旦虚拟化平台安装完成，请获取您选择的 Linux 发行版的引导
磁盘镜像。

*   [Ubuntu
    Desktop](http://www.ubuntu.com/download/desktop) 是一个选项。

这将下载一个名为类似
`ubuntu-20.04.3-desktop-amd64.iso` 的文件。启动您的
虚拟化平台并创建一个新的 (64 位) 虚拟机。
使用 Ubuntu 镜像作为引导磁盘；这
程序因 VM 而异，但不会太难。

### 在 macOS 上安装

首先，安装开发者工具：

```
$ xcode-select --install
```

接下来，安装 [Homebrew](https://brew.sh/)，macOS 的包管理器：

```
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

接下来，安装 [RISC-V 编译器工具链](https://github.com/riscv/homebrew-riscv)：

```
$ brew tap riscv/riscv
$ brew install riscv-tools
```

brew 公式可能不会链接到 `/usr/local`。您需要
更新您的 shell 的 rc 文件（例如 [~/.bashrc](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)）
将适当的目录添加到 [$PATH](http://www.linfo.org/path_env_var.html)。

```
PATH=$PATH:/usr/local/opt/riscv-gnu-toolchain/bin
```

最后，安装 QEMU：

```
brew install qemu
```

### Athena
我们强烈不建议使用 Athena，因为过去在 Athena 上运行实验有很多问题。

如果必须使用 Athena，可以通过 athena.dialup.mit.edu 在运行 Linux 的 MIT Athena 机器上工作实验室。实验室所需的所有工具都位于 6.828 锁存器中。

ssh 到其中一个 Athena 拨号机器并添加工具：

```
$ ssh {your kerberos}@athena.dialup.mit.edu
$ add -f 6.828
```

如果您使用 Athena，必须使用 x86 机器；也就是说，`uname -a`
应该提到 `i686 GNU/Linux` 或
`x86_64 GNU/Linux`。

## 测试您的安装
要测试您的安装，您应该能够编译和运行 xv6。您可以通过按照 [第一个实验](/mit6.1810/labs/util.md) 中的说明进行尝试。

您还可以通过运行以下命令来双重检查您的安装是否正确：

```
$ qemu-system-riscv64 --version
QEMU emulator version 7.2.0
```

以及至少一个 RISC-V 版本的 GCC：

```
$ riscv64-linux-gnu-gcc --version
riscv64-linux-gnu-gcc (Debian 10.3.0-8) 10.3.0
...
```

```
$ riscv64-unknown-elf-gcc --version
riscv64-unknown-elf-gcc (GCC) 10.1.0
...
```

```
$ riscv64-unknown-linux-gnu-gcc --version
riscv64-unknown-linux-gnu-gcc (GCC) 10.1.0
...
```