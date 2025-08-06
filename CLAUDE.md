# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### xv6

- `make qemu`: Build and run xv6 in QEMU.
- `make clean`: Clean the build artifacts.

### Documentation

- `pnpm docs:build`: Build the documentation.
- `pnpm docs:dev`: Start the documentation development server.
- `pnpm docs:preview`: Preview the built documentation.

## Code Architecture

This repository contains the xv6-riscv operating system and its documentation.

- `xv6-riscv`: The source code for the xv6 operating system.
- `docs`: The documentation for the xv6-riscv operating system, built with VitePress.
- `scripts`: Scripts for preparing the source code documentation.

The xv6 operating system is a small, Unix-like teaching operating system for RISC-V. The source code is located in the `xv6-riscv` directory.

The documentation is built using VitePress. The source files are located in the `docs` directory. The `prepare-source-docs.js` script generates markdown files from the source code, which are then used by VitePress to build the documentation.
