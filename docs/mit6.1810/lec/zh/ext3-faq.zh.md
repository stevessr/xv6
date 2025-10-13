Frequently Asked Questions for Tweedie's Linux Journaling paper
Q: How are logging and journaling different?
A: For our purposes they are synonyms, referring to the basic ideas behind both ext3 and xv6's logging.
Q: In what ways is ext3 better than the xv6 logging design?
A: Perhaps the biggest difference is that ext3 allows concurrent disk write and commit of old transactions while accepting updates into the current transaction. So new system calls can execute and return without waiting for older transactions to finish committing. In contrast, xv6 has just the one transaction, and new system calls can't execute (must block) while the transaction is being written to disk and committed. ext3 only commits every five seconds by default, so that each transaction typically contains the updates of many system calls. This allows most system calls to return immediately after just updating blocks in the cache. And it allows "write absorbtion" in cases where successive system calls modify the same file system blocks; such a block only has to be written to the log once per transaction, not once per system call. In contrast, most system calls in xv6 trigger a commit, and have to wait for the commit to finish.
Q: What is meta-data?
A: i-nodes, directory content blocks, indirect blocks, and free-block bitmaps. Everything other than file content blocks.
Q: How does commit frequency affect filesystem performance?
A: Less frequent commits are likely to lead to higher performance. Each commit has some overhead -- new system calls have to be briefly blocked, and the logging system has to write some extra blocks (the descriptor and commit blocks). The more system calls' updates you can fit into each transaction (the lower the commit frequency), the lower the impact of those overheads. Also big transactions offer more scope for write absorbtion (multiple system calls in the same transaction updating the same block, so that the block only has to be logged a single time despite many udpates).
Q: What does the paper mean by dependent data?
A: The paper's design does not include file content blocks in the log; only metadata blocks are logged (i.e. i-nodes, directory content, indirect blocks, and free block bitmaps). In order to avoid a crash leaving a newly written file referring to content blocks that contain some previously deleted file's content, the paper's design writes content blocks before it commits the corresponding meta-data updates to the log. This only applies to write() system calls. The file content blocks that are written before committing are the "dependent" blocks.
Q: Why was it taking so long for the previous file system to recover?
A: The previous file system is ext2. ext2 has a checker program, called fsck, that inspects all the meta-data on the disk (i-nodes, directory content, free bitmaps) to ensure it is consistent. If not, fsck attempts to guess a reasonable fix. The biggest problem with ext2's fsck is that it is slow for big file systems -- it can take dozens of minutes or even hours to run on the biggest file systems. And during that time the file-system cannot be used. People want crash recovery in seconds, not hours. Another problem with ext2 and fsck is that fsck sometimes can't guess a good way to fix problems, and then has to ask for human input.
Q: The paper talks about merging filesystem operations together (top of page 5). What does it mean by merging?
A: It means including the updated blocks from multiple system calls in one transaction. Despite the word "merge", the file system doesn't have to merge updates from different system calls. The file system code uses locks to ensure that only one system call at a time modifies any given piece of file-system data. And there's only one copy of any given data in memory (in the disk block cache) at a time, so that merges are not needed.
Q: What is the paper referring to with "the decision about when to commit the current compound transaction and start a new one is a policy decision which should be under user control"?
A: The final ext3 design ended up not quite this ambitious, and by default just commits every five seconds.
Q: Isn't it a problem that, because ext3 by default commits only every five seconds, a crash might result in the loss of up to five seconds of system calls? Even though those system calls returned with successful return values?
A: It's certainly something to think about. Applications that need to ensure that updates are safe on disk can call fsync(fd), which is specified to wait (not return) until all previous writes to file descriptor fd would survive a crash. fsync() also triggers a commit of the currently open transaction. Databases, for example, use fsync().
Q: What does the paper mean by a log-structured filesystem?
A: A log-structured file system has *only* a log -- instead of having a file system, with a log that describes recent updates, a log-structured file system has only the log, and reads must find what they need by looking in the log. https://dl.acm.org/doi/10.1145/121132.121137 https://en.wikipedia.org/wiki/Log-structured_file_system

---
title: ext3-faq.txt
---

Tweedie 的 Linux 日志论文的常见问题

Q: 日志和日记有什么不同？
A: 对于我们的目的，它们是同义词，指 ext3 和 xv6 日志背后的基本思想。

Q: ext3 在哪些方面比 xv6 日志设计更好？
A: 也许是最大的区别是 ext3 允许在将更新接受到当前事务中的同时，并发地写入磁盘和提交旧事务。所以新系统调用可以在不等待旧事务完成提交的情况下执行并返回。相比之下，xv6 只有一个事务，新系统调用无法执行（必须阻塞），而事务正在写入磁盘并提交。ext3 默认每 5 秒提交一次，所以每个事务通常包含许多系统调用的更新。这允许大多数系统调用在更新缓存中的块后立即返回。并且它允许"写入吸收"，在连续的系统调用修改相同文件系统块的情况下；这样的块只需要在每个事务中写入日志一次，而不是每次系统调用一次。相比之下，xv6 中的大多数系统调用都会触发提交，并且必须等待提交完成。

Q: 什么是元数据？
A: i 节点、目录内容块、间接块和空闲块位图。除文件内容块以外的所有内容。

Q: 提交频率如何影响文件系统性能？
A: 提交频率越低可能导致性能越高。每次提交都有一些开销——新系统调用必须短暂阻塞，日志系统必须写入一些额外的块（描述符和提交块）。你可以将更多系统调用的更新放入每个事务中（提交频率越低），这些开销的影响就越小。此外，大事务为写入吸收提供了更多空间（同一事务中的多个系统调用更新同一块，因此尽管有很多更新，该块只需记录一次）。

Q: 论文中"依赖数据"是什么意思？
A: 论文的设计不包括文件内容块在日志中；只记录元数据块（即 i 节点、目录内容、间接块和空闲块位图）。为了避免崩溃导致新写的文件引用包含一些先前删除文件内容的内容块，论文的设计在将相应的元数据更新提交到日志之前写入内容块。这只适用于 write() 系统调用。提交前写入的文件内容块是"依赖"块。

Q: 为什么以前的文件系统恢复需要这么长时间？
A: 以前的文件系统是 ext2。ext2 有一个检查程序，称为 fsck，它检查磁盘上的所有元数据（i 节点、目录内容、空闲位图）以确保其一致。如果不是，fsck 尝试猜测一个合理的修复。ext2 的 fsck 最大的问题是对于大文件系统很慢——在最大的文件系统上运行可能需要几十分钟甚至几小时。在此期间文件系统无法使用。人们希望崩溃恢复以秒为单位，而不是小时。ext2 和 fsck 的另一个问题是 fsck 有时无法猜测修复问题的好方法，然后必须要求人工输入。

Q: 论文谈到合并文件系统操作在一起（第 5 页顶部）。它所说的合并是什么意思？
A: 它意味着将多个系统调用的更新块包含在一个事务中。尽管有"合并"这个词，文件系统不必合并来自不同系统调用的更新。文件系统代码使用锁来确保一次只有一个系统调用修改任何给定的文件系统数据。并且任何给定的数据在内存中（在磁盘块缓存中）只有一个副本，所以不需要合并。

Q: 论文提到"何时提交当前复合事务并开始新事务的决定是一个策略决定，应在用户控制下"是什么意思？
A: 最终的 ext3 设计并没有这么雄心勃勃，默认每 5 秒提交一次。

Q: 这不是问题吗，由于 ext3 默认每 5 秒提交一次，崩溃可能导致最多 5 秒的系统调用的丢失？尽管那些系统调用返回了成功的返回值？
A: 这当然值得考虑。需要确保更新在磁盘上安全的应用程序可以调用 fsync(fd)，它被指定等待（不返回）直到文件描述符 fd 的所有先前写入在崩溃后仍然有效。fsync() 也触发当前打开事务的提交。例如，数据库使用 fsync()。

Q: 论文中的日志结构文件系统是什么意思？
A: 日志结构文件系统只有日志——与其说有一个带有描述最近更新的日志的文件系统，不如说日志结构文件系统只有日志，读取必须通过查看日志来找到它们需要的内容。https://dl.acm.org/doi/10.1145/121132.121137 https://en.wikipedia.org/wiki/Log-structured_file_system