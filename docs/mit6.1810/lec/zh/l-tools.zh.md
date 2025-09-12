# 6.1810 使用的工具

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

在 Windows 中，您可以在 `\wsl$` 目录下访问所有 WSL 文件。例如，Ubuntu 20.04 安装的主目录应该在 `\wsl$\
Ubuntu-20.04\
home\
<username>\
`。

### 运行 Linux 虚拟机

如果您运行的操作系统不方便安装 RISC-V 工具，您可能会发现运行 Linux 虚拟机 (VM) 并在 VM 中安装工具很有用。安装 Linux 虚拟机是一个两步过程。首先，获取一个虚拟化平台；我们建议：

*   [**VirtualBox**](https://www.virtualbox.org/) (免费，适用于 Mac、Linux、Windows) — [下载页面](https://www.virtualbox.org/wiki/Downloads)

安装虚拟化平台后，获取您选择的 Linux 发行版的启动磁盘镜像。

*   [Ubuntu Desktop](http://www.ubuntu.com/download/desktop) 是一个选项。

这将下载一个名为 `ubuntu-20.04.3-desktop-amd64.iso` 之类的文件。启动您的虚拟化平台并创建一个新的 (64位) 虚拟机。使用 Ubuntu 镜像作为启动盘；不同虚拟机的过程有所不同，但应该不会太难。

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

### Athena

我们*强烈*不建议使用 Athena，因为过去在 Athena 上运行实验时出现过很多问题。

如果您必须使用 Athena，可以使用运行 Linux 的 MIT Athena 机器通过 athena.dialup.mit.edu 来进行实验。实验所需的所有工具都位于 6.828 locker 中。

ssh 到其中一台 Athena dialup 机器并添加工具：
```bash
$ ssh {your kerberos}@athena.dialup.mit.edu
$ add -f 6.828
```

如果您使用 Athena，则必须使用 x86 机器；也就是说，`uname -a` 应该提到 `i686 GNU/Linux` 或 `x86_64 GNU/Linux`。

## 测试您的安装

要测试您的安装，您应该能够编译并运行 xv6。您可以按照[第一个实验](labs/util.html)中的说明进行尝试。

您还可以通过运行以下命令来仔细检查您的安装是否正确：
```bash
$ qemu-system-riscv64 --version
QEMU emulator version 7.2.0
```

以及至少一个 RISC-V 版本的 GCC：
```bash
$ riscv64-linux-gnu-gcc --version
riscv64-linux-gnu-gcc (Debian 10.3.0-8) 10.3.0
...
```
```bash
$ riscv64-unknown-elf-gcc --version
riscv64-unknown-elf-gcc (GCC) 10.1.0
...
```
```bash
$ riscv64-unknown-linux-gnu-gcc --version
riscv64-unknown-linux-gnu-gcc (GCC) 10.1.0
...
```