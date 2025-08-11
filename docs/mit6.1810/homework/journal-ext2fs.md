---
title: journal-ext2fs
---

# Journaling

Read: [Journaling the Linux ext2fs Filesystem](/mit6.1810/readings/journal-design.pdf.md).

The paper uses "journal" to refer to the same idea that
xv6 calls a "log". The file system described in the paper is now called ext3.

To help you read the paper, try to answer the following question for yourself:
> Mid-way down the left column on page 6, the Journaling paper
> says "However, until we have finished syncing those buffers, we cannot
> delete the copy of the data in the journal."
> Give a concrete example in which removing this rule would
> lead to disaster.

You don't have submit your answer.
