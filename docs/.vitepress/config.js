import { defineConfig } from 'vitepress'
import sourceSidebarItems from './sidebar-source.js'

export default defineConfig({
  title: 'XV6 中文文档',
  description: 'XV6 操作系统课程',
  base: '/',
  themeConfig: {
    nav: [
      { text: '主页', link: '/' },
      { text: '课程内容', link: '/chapter0_os_organization' },
      { text: 'xv6-riscv 源码', link: '/source/xv6-riscv/' }
    ],
    sidebar: [
      {
        text: 'XV6 源码',
        items: sourceSidebarItems
      },
      {
        text: '课程内容',
        items: [
          { text: '第 0 章: 操作系统组织', link: '/chapter0_os_organization' },
          { text: '第 1 章: 操作系统接口', link: '/chapter1_os_interfaces' },
          { text: '第 1 章: 实验指导', link: '/chapter1_lab_guide' },
          { text: '第 2 章: 页表', link: '/chapter2_page_tables' },
          { text: '第 3 章: 中断和系统调用', link: '/chapter3_traps_and_syscalls' },
          { text: '第 4 章: 调度', link: '/chapter4_scheduling' },
          { text: '第 5 章: 锁', link: '/chapter5_locking' },
          { text: '第 6 章: 文件系统', link: '/chapter6_file_system' },
          { text: '第 7 章: 中断和驱动', link: '/chapter7_interrupts_and_drivers' },
          { text: '第 8 章: 并发回顾', link: '/chapter8_concurrency_revisited' },
          { text: '第 9 章: 总结', link: '/chapter9_summary' }
        ]
      }
    ]
  },
  markdown: {
    languageAlias: {
      s: 'asm',
      assembly: 'asm',
      gas: 'asm',
      ld: 'makefile'
    }
  }
})