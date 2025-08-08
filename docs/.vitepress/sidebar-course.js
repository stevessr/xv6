export default [
  {
    text: "操作系统接口",
    collapsed: false,
    items: [
      { text: "介绍", link: "/xv6/os-interfaces/" },
      {
        text: "进程和内存",
        link: "/xv6/os-interfaces/processes-and-memory",
      },
      {
        text: "I/O 和文件描述符",
        link: "/xv6/os-interfaces/io-and-file-descriptors",
      },
      { text: "管道", link: "/xv6/os-interfaces/pipes" },
      { text: "文件系统", link: "/xv6/os-interfaces/xv6/file-system" },
      { text: "现实世界", link: "/xv6/os-interfaces/real-world" },
      { text: "练习", link: "/xv6/os-interfaces/exercises" },
    ],
  },
  {
    text: "页表",
    collapsed: true,
    items: [
      { text: "介绍", link: "/xv6/page-tables/" },
      { text: "分页硬件", link: "/xv6/page-tables/paging-hardware" },
      {
        text: "内核地址空间",
        link: "/xv6/page-tables/kernel-address-space",
      },
      {
        text: "创建地址空间",
        link: "/xv6/page-tables/code-create-address-space",
      },
      {
        text: "物理内存分配",
        link: "/xv6/page-tables/physical-memory-allocation",
      },
      {
        text: "物理内存分配器",
        link: "/xv6/page-tables/code-physical-memory-allocator",
      },
      {
        text: "进程地址空间",
        link: "/xv6/page-tables/process-address-space",
      },
      { text: "Sbrk 实验", link: "/sbrk_pgprint_guide" },
      { text: "Exec", link: "/xv6/page-tables/code-exec" },
      { text: "现实世界", link: "/xv6/page-tables/real-world" },
      { text: "练习", link: "/xv6/page-tables/exercises" },
    ],
  },
  {
    text: "陷阱和系统调用",
    collapsed: true,
    items: [
      { text: "介绍", link: "/xv6/traps-and-syscalls/" },
      {
        text: "RISC-V 陷阱机制",
        link: "/xv6/traps-and-syscalls/risc-v-trap-machinery",
      },
      {
        text: "来自用户空间的陷阱",
        link: "/xv6/traps-and-syscalls/traps-from-user-space",
      },
      {
        text: "调用系统调用",
        link: "/xv6/traps-and-syscalls/code-calling-system-calls",
      },
      {
        text: "来自内核空间的陷阱",
        link: "/xv6/traps-and-syscalls/traps-from-kernel-space",
      },
      {
        text: "缺页异常",
        link: "/xv6/traps-and-syscalls/page-fault-exceptions",
      },
      {
        text: "系统调用参数",
        link: "/xv6/traps-and-syscalls/code-system-call-arguments",
      },
      { text: "现实世界", link: "/xv6/traps-and-syscalls/real-world" },
      { text: "练习", link: "/xv6/traps-and-syscalls/exercises" },
    ],
  },
  {
    text: "中断和驱动程序",
    collapsed: true,
    items: [
      { text: "介绍", link: "/xv6/interrupts-and-drivers/" },
      {
        text: "驱动程序中的并发",
        link: "/xv6/interrupts-and-drivers/concurrency-in-drivers",
      },
      {
        text: "控制台输入代码",
        link: "/xv6/interrupts-and-drivers/code-console-input",
      },
      {
        text: "控制台输出代码",
        link: "/xv6/interrupts-and-drivers/code-console-output",
      },
      {
        text: "计时器中断",
        link: "/xv6/interrupts-and-drivers/timer-interrupts",
      },
      { text: "现实世界", link: "/xv6/interrupts-and-drivers/real-world" },
      { text: "练习", link: "/xv6/interrupts-and-drivers/exercises" },
    ],
  },
  {
    text: "锁",
    collapsed: true,
    items: [
      { text: "介绍", link: "/xv6/locking/" },
      { text: "竞争条件", link: "/xv6/locking/race-conditions" },
      { text: "锁代码", link: "/xv6/locking/code-xv6/locking" },
      { text: "使用锁", link: "/xv6/locking/using-locks" },
      { text: "可重入锁", link: "/xv6/locking/reentrant-locks" },
      {
        text: "锁和中断处理程序",
        link: "/xv6/locking/locks-and-interrupt-handlers",
      },
      {
        text: "死锁和锁排序",
        link: "/xv6/locking/deadlock-and-lock-ordering",
      },
      { text: "睡眠锁", link: "/xv6/locking/sleep-locks" },
      {
        text: "指令和内存排序",
        link: "/xv6/locking/instruction-and-memory-ordering",
      },
      { text: "现实世界", link: "/xv6/locking/real-world" },
      { text: "练习", link: "/xv6/locking/exercises" },
    ],
  },
  {
    text: "调度",
    collapsed: true,
    items: [
      { text: "介绍", link: "/xv6/scheduling/" },
      { text: "多路复用", link: "/xv6/scheduling/multiplexing" },
      { text: "上下文切换", link: "/xv6/scheduling/context-switching" },
      { text: "调度", link: "/xv6/scheduling/xv6/scheduling" },
      { text: "Sleep 和 Wakeup", link: "/xv6/scheduling/sleep-and-wakeup" },
      {
        text: "Sleep 和 Wakeup 代码",
        link: "/xv6/scheduling/code-sleep-and-wakeup",
      },
      { text: "管道", link: "/xv6/scheduling/pipes" },
      { text: "Wait, Exit, Kill", link: "/xv6/scheduling/wait-exit-kill" },
      { text: "Mycpu 和 Myproc", link: "/xv6/scheduling/mycpu-and-myproc" },
      { text: "进程锁定", link: "/xv6/scheduling/process-xv6/locking" },
      { text: "练习", link: "/xv6/scheduling/exercises" },
    ],
  },
  {
    text: "文件系统",
    collapsed: true,
    items: [
      { text: "介绍", link: "/xv6/file-system/" },
      { text: "概述", link: "/xv6/file-system/overview" },
      { text: "缓冲区缓存层", link: "/xv6/file-system/buffer-cache-layer" },
      {
        text: "缓冲区缓存代码",
        link: "/xv6/file-system/code-buffer-cache",
      },
      { text: "日志层", link: "/xv6/file-system/log-layer" },
      { text: "日志设计", link: "/xv6/file-system/log-design" },
      { text: "日志代码", link: "/xv6/file-system/code-logging" },
      {
        text: "块分配器代码",
        link: "/xv6/file-system/code-block-allocator",
      },
      { text: "Inode 层", link: "/xv6/file-system/inode-layer" },
      { text: "Inode 代码", link: "/xv6/file-system/code-inode" },
      {
        text: "Inode 内容代码",
        link: "/xv6/file-system/code-inode-content",
      },
      { text: "目录层代码", link: "/xv6/file-system/code-directory-layer" },
      { text: "路径名代码", link: "/xv6/file-system/code-pathnames" },
      {
        text: "文件描述符层",
        link: "/xv6/file-system/file-descriptor-layer",
      },
      { text: "系统调用代码", link: "/xv6/file-system/code-system-calls" },
      { text: "现实世界", link: "/xv6/file-system/real-world" },
      { text: "练习", link: "/xv6/file-system/exercises" },
    ],
  },
  {
    text: "并发再探",
    collapsed: true,
    items: [
      { text: "介绍", link: "/xv6/concurrency-revisited/" },
      { text: "锁模式", link: "/xv6/concurrency-revisited/lock-patterns" },
      {
        text: "类似锁的模式",
        link: "/xv6/concurrency-revisited/lock-like-patterns",
      },
      {
        text: "完全不用锁",
        link: "/xv6/concurrency-revisited/no-locks-at-all",
      },
      { text: "并行", link: "/xv6/concurrency-revisited/parallelism" },
      { text: "练习", link: "/xv6/concurrency-revisited/exercises" },
    ],
  },
  {
    text: "总结",
    collapsed: true,
    items: [{ text: "介绍", link: "/xv6/summary/" }],
  },
];