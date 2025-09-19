---
title: "LEC 7: File System 2"
---
This is the full lecture page: the lecture slides are embedded below with a summary of key points and references.

<iframe src="/assets/mit6.1810/l-fs2.pdf" width="100%" height="800px"></iframe>

## Lecture highlights (summary)

- The core problem of crash recovery: a crash can leave the file system in an inconsistent state (for example, directory entries pointing to uninitialized inodes).
- Common solution: write-ahead logging (journaling) so a transaction either fully completes or not at all.
- xv6 implementation notes: maintain log entries in memory, write and mark the log completed at commit, then install the blocks from the log to their target locations, and finally clear the log head.
- Design tradeoffs: correctness vs performance (logging causes blocks to be written twice), and tradeoffs with concurrency/log size (large transactions need splitting).

## References

- Slides (embedded above)
- Detailed crash recovery notes: [/mit6.1810/homework/l-crash.md](/mit6.1810/homework/l-crash.md)
- xv6 source implementations for logging and the buffer cache: see `fs.c`, `log.c`, `bio.c` in the xv6 source repository

If you'd like, I can extract the original 2024 lecture notes and expand this into a more detailed Markdown lecture (including code snippets and examples) by incorporating `homework/l-crash.md`.
