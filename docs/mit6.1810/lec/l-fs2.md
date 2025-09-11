---
title: "LEC 7: File System 2"
---
下面为完整讲义页面：已嵌入本讲的幻灯片，并附带要点摘要与参考资料。

<iframe src="/assets/mit6.1810/l-fs2.pdf" width="100%" height="800px"></iframe>

## 讲义要点（摘要）

- Crash recovery 的核心问题：崩溃可能使文件系统处于不一致状态（例如目录项指向未初始化的 inode）。
- 常见解决方案：写前日志（write-ahead log / journaling），确保事务要么全部生效要么全部不生效。
- xv6 的实现要点：在内存中维护日志条目，commit 时先写日志并标记完成，然后再将日志中的块安装到它们的目标位置，最后清空日志头。
- 设计权衡：正确性 vs 性能（日志会导致块被写两次），与并发/日志大小的折衷（大型事务需拆分）。

## 参考资料

- 幻灯片（嵌入于上方）
- Crash recovery 详细笔记：[/mit6.1810/homework/l-crash.md](/mit6.1810/homework/l-crash.md)
- xv6 源码中有关日志和缓冲区缓存的实现：查看 `fs.c`, `log.c`, `bio.c`（xv6 源码仓库）

如果你希望我把 `2024` 年的原始讲稿文本提取并把讲义扩展为更详细的 Markdown（包含代码片段和示例），我可以继续把 `homework/l-crash.md` 的内容整合进来并生成更长的讲义页面。
