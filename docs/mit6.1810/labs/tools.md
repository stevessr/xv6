---
title: tools
---

# Tools Used in 6.1810

For this class you'll need the RISC-V versions of
QEMU 7.2+, GDB 8.3+, GCC, and Binutils.

If you are having trouble getting things set up, please come to office
hours or post on Piazza. We're happy to help!

### Debian or Ubuntu
```
sudo apt-get install git build-essential gdb-multiarch qemu-system-misc gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu
```

You'll likely need to be running Ubuntu 24 (or later) in order for
apt-get to install a recent enough qemu.

### Arch Linux
```
sudo pacman -S riscv64-linux-gnu-binutils riscv64-linux-gnu-gcc riscv64-linux-gnu-gdb qemu-emulators-full
```

### Installing on Windows

Students running Windows are encouraged to either install Linux
on their local machine or use WSL 2 (Windows Subsystem for Linux 2).

We also encourage students to install the [Windows Terminal](https://apps.microsoft.com/store/detail/windows-terminal/9N0DX20HK701) tool in lieu of using Powershell/Command Prompt.

To use WSL 2, first make sure you have the [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10) installed. Then add [Ubuntu 24.04 from the Microsoft Store](https://apps.microsoft.com/detail/9nz3klhxdjp5). Afterwards you should be able to launch Ubuntu and interact with the machine.

> IMPORTANT: Make sure that you are running version 2 of WSL.
> WSL 1 does not work with the 6.1810 labs.
> To check,
> run ` wsl -l -v ` in a Windows terminal to confirm that WSL
> 2 and the correct Ubuntu version are installed.

To install all the software you need for this class, run:

```
$ sudo apt-get update && sudo apt-get upgrade
$ sudo apt-get install git build-essential gdb-multiarch qemu-system-misc gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu
```

From Windows, you can access all of your WSL files under the *"\\wsl$\\"*
directory. For instance, the home directory for an Ubuntu 20.04 installation should
be at *"\\wsl$\\Ubuntu-20.04\\home\\&lt;username&gt;\\"*.

### Running a Linux VM
If you're running an operating system on which it's not convenient to
install the RISC-V tools, you may find it useful to run a Linux
virtual machine (VM) and install the tools in the VM.
Installing a Linux virtual machine is a two step process.  First, get
a virtualization platform; we suggest:

*   [**VirtualBox**](https://www.virtualbox.org/)
    (free for Mac, Linux, Windows) — [Download
    page](https://www.virtualbox.org/wiki/Downloads)

Once the virtualization platform is installed, fetch a boot
disk image for the Linux distribution of your choice.

*   [Ubuntu
    Desktop](http://www.ubuntu.com/download/desktop) is one option.

This will download a file named something like
`ubuntu-20.04.3-desktop-amd64.iso`.  Start up your
virtualization platform and create a new (64-bit) virtual machine.
Use the Ubuntu image as a boot disk; the
procedure differs among VMs but shouldn't be too difficult.

### Installing on macOS

First, install developer tools:

```
$ xcode-select --install
```

Next, install [Homebrew](https://brew.sh/), a package manager for macOS:

```
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Next, install the [RISC-V compiler toolchain](https://github.com/riscv/homebrew-riscv):

```
$ brew tap riscv/riscv
$ brew install riscv-tools
```

The brew formula may not link into `/usr/local`. You will need to
update your shell's rc file (e.g. [~/.bashrc](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html))
to add the appropriate directory to [$PATH](http://www.linfo.org/path_env_var.html).

```
PATH=$PATH:/usr/local/opt/riscv-gnu-toolchain/bin
```

Finally, install QEMU:

```
brew install qemu
```

### Athena
We *strongly* discourage the use of Athena since there have been many problems with running the labs on Athena in the past.

If you must use Athena, it is possible to work on the labs using the MIT Athena machines running Linux via athena.dialup.mit.edu. All of the tools necessary for the labs are located in the 6.828 locker.

ssh into one of the Athena dialup machines and add the tools:

```
$ ssh {your kerberos}@athena.dialup.mit.edu
$ add -f 6.828
```

If you use Athena, you must use an x86 machine; that is, `uname -a`
should mention `i686 GNU/Linux` or
`x86_64 GNU/Linux`.

## Testing your Installation
To test your installation, you should be able to compile and run xv6. You can try this by following the instructions in the [first lab](/mit6.1810/labs/util.md).

You can also double check your installation is correct by running the following:

```
$ qemu-system-riscv64 --version
QEMU emulator version 7.2.0
```

And at least one RISC-V version of GCC:

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
