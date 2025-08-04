import { defineConfig } from "vitepress";
import { MermaidMarkdown, MermaidPlugin } from "vitepress-plugin-mermaid";
import footnote from "markdown-it-footnote";
import llmstxt from "vitepress-plugin-llms";
import sourceSidebarItems from "./sidebar-source.js";
import courseSidebarItems from "./sidebar-course.js";

export default defineConfig({
  title: "XV6 中文文档",
  description: "XV6 操作系统课程",
  base: "/",
  ignoreDeadLinks: true,
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "主页", link: "/" },
      { text: "课程内容", link: "/course-introduction" },
      { text: "xv6-riscv 源码", link: "/source/xv6-riscv/" },
    ],
    sidebar: {
      "/source/": [
        {
          text: "XV6 源码",
          items: sourceSidebarItems,
        },
      ],
      "/": [
        {
          text: "课程内容",
          collapsed: false,
          items: courseSidebarItems,
        },
      ],
    },
  },
  markdown: {
    config(md) {
      md.use(MermaidMarkdown);
      md.use(footnote);
    },
    languageAlias: {
      s: "asm",
      assembly: "asm",
      gas: "asm",
      ld: "makefile",
    },
  },
  vite: {
    plugins: [MermaidPlugin(), llmstxt()],
    optimizeDeps: {
      include: ["mermaid"],
    },
    ssr: {
      noExternal: ["mermaid"],
    },
    ip: "0.0.0.0",
    host: true,
    port: 5173,
  },
});
