// Variant sidebar for MIT 6.1810: ordered by the course schedule (LEC 1..LEC 22) - CHINESE VERSION
export default [
  {
    text: "时间表",
    link: "/mit6.1810/schedule.zh",
  },
  {
    text: "课程 (按时间表)",
    items: [
      { text: "第1讲：概述", link: "/mit6.1810/lec/zh/l-overview.zh.md" },
      { text: "第2讲：C语言/用户空间", link: "/mit6.1810/lec/zh/l-c.zh.md" },
      { text: "第3讲：xv6与工具", link: "/mit6.1810/lec/zh/l-tools.zh.md" },
      { text: "第4讲：进程", link: "/mit6.1810/lec/zh/l-processes.zh.md" },
      { text: "第5讲：用户虚拟机", link: "/mit6.1810/homework/l-uservm.zh.md" },
      { text: "第6讲：文件系统 1", link: "/mit6.1810/lec/zh/l-fs.zh.md" },
      { text: "第7讲：文件系统 2", link: "/mit6.1810/lec/zh/l-fs2.zh.md" },
      { text: "第8讲：调度", link: "/mit6.1810/lec/zh/l-threads.zh.md" },
      { text: "第9讲：锁", link: "/mit6.1810/lec/zh/l-locks.zh.md" },
      { text: "第10讲：锁 2", link: "/mit6.1810/lec/zh/l-locks2.zh.md" },
      { text: "第11讲：竞争与原子操作", link: "/mit6.1810/lec/zh/l-race-atomic.zh.md" },
      {
        text: "第12讲：协调",
        link: "/mit6.1810/lec/zh/l-coordination.zh.md",
      },
      { text: "第13讲：中断", link: "/mit6.1810/lec/zh/l-interrupt.zh.md" },
      { text: "第14讲：驱动程序", link: "/mit6.1810/lec/zh/l-interrupt.zh.md" },
      { text: "第15讲：虚拟内存", link: "/mit6.1810/lec/zh/l-vm.zh.md" },
      { text: "第16讲：页面错误", link: "/mit6.1810/lec/zh/l-pgfaults.zh.md" },
      {
        text: "第17讲：网络/并发",
        link: "/mit6.1810/lec/zh/l-net.zh.md",
      },
      {
        text: "第18讲：RCU/并发再探",
        link: "/mit6.1810/lec/l-rcu.md",
      },
      { text: "第19讲：Redleaf", link: "/mit6.1810/lec/zh/l-redleaf.zh.md" },
      { text: "第20讲：Meltdown", link: "/mit6.1810/lec/zh/l-meltdown.zh.md" },
      { text: "第21讲：线程", link: "/mit6.1810/lec/zh/l-threads.zh.md" },
      { text: "第22讲：RCU (总结)", link: "/mit6.1810/lec/zh/l-rcu.zh.md" },
    ],
  },
  {
    text: "阅读材料",
    items: [{ text: "阅读材料", link: "/mit6.1810/readings/zh/" }],
  },
  {
    text: "作业",
    items: [{ text: "作业", link: "/mit6.1810/homework/zh/" }],
  },
  {
    text: "测验",
    items: [{ text: "测验", link: "/mit6.1810/quizzes/zh/" }],
  },
];
