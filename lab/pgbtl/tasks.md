Lab pgtbl / superpage changes — PR-ready changelog (中/英 双语)

概述 / Overview
----------------
本文件记录为完成 pgtbl 与 superpage 实验所做的代码变更与验证步骤，已整理为适用于提交（PR）的变更日志格式。以下条目同时包含中文与英文说明，便于审核者快速定位改动、理解目的与验证方法。

This document records the code changes and verification steps made to complete the pgtbl and superpage lab. It is organized as a PR-ready changelog with bilingual (CN/EN) entries so reviewers can quickly find changes, intent, and verification steps.

变更项 / Change items
---------------------

1) USYSCALL per-process mapping （每进程 USYSCALL 映射）
- 文件 / Files: `kernel/proc.c`, `kernel/memlayout.h`
- 目的 / Purpose: 为每个进程分配并映射一个只读的用户态 USYSCALL 页面，用于在用户态快速读取进程信息（例如 PID），避免频繁陷入内核导致性能开销。
- 主要修改 / Key changes: 在 `proc_pagetable()` 中改为把进程私有的 `p->usyscall` 页面映射到进程页表；在 `memlayout.h` 中修复了汇编器解析问题（用 `#ifndef __ASSEMBLER__` 包装 C 结构）。
- 验证 / How to verify: 运行 grader 的 pgtbl 测试，检查 `ugetpid` 用例通过；也可在用户态读取 USYSCALL 页面验证返回 PID。

2) vmprint 实现（打印页表）
- 文件 / Files: `kernel/vm.c`
- 目的 / Purpose: 实现 `vmprint()`（及递归帮助函数），以按课程 grader 所期望的格式打印内核/用户页表，方便自动化测试与人工审查。
- 主要修改 / Key changes: 新增 `vmprint()` 与 `vmprint_rec()` 并将输出格式调整为与 grader 的正则匹配。
- 验证 / How to verify: 运行 `pgtbltest` 中的 `print_kpgtbl`，输出应匹配 grader 预期正则。

3) 超页（2MB）分配器与 VM 支持（superpage support）
- 文件 / Files: `kernel/kalloc.c`, `kernel/vm.c`, `kernel/proc.c`
- 目的 / Purpose: 为了实验与性能目标，增加对 2MB 超页的支持，包括物理内存的 superpage 池、在页表层级创建 2MB 叶映射、以及在 fork 时为子进程整页复制超页（非写时复制）。
- 主要修改 / Key changes:
	- 新增 superpage 池、`superalloc()`、`superfree()`；在 `freerange()` 初始化时收集 2MB 对齐的块进入池。
	- 新增 `mappages_super()`（用于在 level-1 创建 2MB 叶 PTE），新增 `walk_level()` 以返回 PTE 及其层级。
	- 修改 `uvmalloc()`：在满足对齐与大小的情况下优先尝试分配超页（va != 0 时），并在无法分配时回退到 4KB 页。
	- 修改 `uvmcopy()`：fork 时检测到 level-1 超页映射会为子进程分配新的 2MB 并整页拷贝，随后在子页表上创建 2MB 映射。
	- 修改 `uvmunmap()`：正确处理并释放超页映射（调用 `superfree()`）。
- 验证 / How to verify: 运行 grader 中的 `superpg_test`，确认通过；同时运行完整 grader（`./grade-lab-pgtbl -v`）确保其它测试不回归。

4) Grader 兼容性修复（Python3 兼容）
- 文件 / Files: `gradelib.py`（及部分 grading helper 脚本）
- 目的 / Purpose: 修复 grader 脚本里对 Python2-only 废弃 API 的调用，使其能在 Python3 环境下运行（例如使用 `shlex.quote` 替代 `pipes.quote`）。
- 验证 / How to verify: 直接运行 `./grade-lab-pgtbl -v`，确认不再出现 ModuleNotFoundError 或兼容性错误并能顺利完成测试运行。

清理与降级调试输出 / Cleanup performed
----------------------------------
- 开发期间的临时调试 printf（用以追踪 mappages_super/uvmcopy/uvmalloc 的行为）已被移除或替换为简短注释。内核中仍保留必要的 panic/断言以确保不变量，但不再输出开发时的详细调试日志。
- Debug printf 已从以下文件中清理：`kernel/vm.c`, `kernel/kalloc.c`。

Release notes / 注意事项
-----------------------
- 保持对 printf 格式的谨慎：内核 printf 支持的格式有限，提交时已修正可能造成编译警告/错误的格式说明符。
- 在需要复现问题时，可临时恢复调试输出或改为基于宏的可配置调试（建议将调试打印用宏封装，便于开启/关闭）。

Build & Test / 构建与测试
--------------------------
- 构建 / Build:
	- cd xv6-riscv && make
- 运行 grader / Run grader:
	- ./grade-lab-pgtbl -v

If regressions occur / 回归处理
------------------------------
- 若移除调试打印导致某项测试失败，建议先在本地启用临时调试输出（或在单测中插入额外日志），定位问题后再合并到 PR 中。

Contact / 联系方式
-------------------
如需我把 debug 打印改为宏控制（便于未来开启/关闭），或希望我把变更拆分为多个小 commit（按功能拆 commit），我可以继续完成这些工作并附上对应的 commit 草稿。

-- End of changelog
