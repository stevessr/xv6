import { defineConfig } from "vitepress";
import { MermaidMarkdown, MermaidPlugin } from "vitepress-plugin-mermaid";
import footnote from "markdown-it-footnote";
import llmstxt from "vitepress-plugin-llms";
import sourceSidebarItems from "./sidebar-source.js";
import courseSidebarItems from "./sidebar-course.js";
import mit61810SidebarItems from "./sidebar-mit6.1810-by-schedule.js";
import labsSidebarItems from "./sidebar-labs.js";
import labsZhSidebarItems from "./sidebar-labs-zh.js";

export default defineConfig({
  title: "XV6 中文文档",
  description: "XV6 操作系统课程",
  base: "/",
  ignoreDeadLinks: false,
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "主页", link: "/" },
      {
        text: "课程内容",
        items: courseSidebarItems,
      },
      {
        text: "xv6-riscv 源码",
        items: sourceSidebarItems,
      },
      {
        text: "MIT 6.1810",
        items: mit61810SidebarItems,
      },
      {
        text: "Labs",
        items: labsSidebarItems,
      },
      {
        text: "Labs (中文版)",
        items: labsZhSidebarItems,
      },
    ],
    sidebar: {
      "/mit6.1810/lec/": [
        {
          text: "MIT 6.1810 lec",
          items: mit61810SidebarItems,
        },
      ],
      "/source/": [
        {
          text: "XV6 源码",
          items: sourceSidebarItems,
        },
      ],
      "/xv6/": [
        {
          text: "课程内容",
          collapsed: false,
          items: courseSidebarItems,
        },
      ],
      "/mit6.1810/labs/": [
        {
          text: "Labs",
          items: labsSidebarItems,
        },
      ],
      "/mit6.1810/labs/zh/": [
        {
          text: "Labs (中文版)",
          items: labsZhSidebarItems,
        },
      ],
    },
  },
  markdown: {
    theme: {
      light: "vitesse-light",
      dark: "vitesse-dark",
    },
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
