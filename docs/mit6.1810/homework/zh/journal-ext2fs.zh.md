---
title: journal-ext2fs
---

# 日志记录

**阅读：** [Journaling the Linux ext2fs Filesystem](/assets/mit6.1810/journal-design.pdf).

该论文使用“journal”来指代与 xv6 称之为“log”相同的思想。论文中描述的文件系统现在被称为 ext3。

为了帮助你阅读这篇论文，试着为自己回答以下问题：
> 在第6页左栏的中间部分，日志记录论文说：“然而，在我们完成同步这些缓冲区之前，我们不能删除日志中数据的副本。”
> 举一个具体的例子，说明删除这条规则会导致灾难。

你不需要提交你的答案。
