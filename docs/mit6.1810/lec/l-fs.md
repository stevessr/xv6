---
title: l-fs.txt
---

# 6.1810 2024 Lecture 13: File System

## Why are File Systems Useful?
- durability across restarts
- naming and organization
- sharing among programs and users

## Why is File System Design Interesting?
- crash recovery
- performance/concurrency
- sharing
- security
- abstraction is useful: pipes, devices, `/proc`, `/afs`, Plan 9
  - FS-oriented apps work with many kinds of objects
- topic of in two labs

## API Example -- UNIX/Posix/Linux/xv6/&c;
```c
fd = open("x/y", -);
write(fd, "abc", 3);
link("x/y", "x/z");
unlink("x/y");
write(fd, "def", 3);
close(fd); 
// file y/z contains abcdef
```
- You may have used this API through Python `io` or `os` module, which wrap this API.

### High-Level Choices visible in the UNIX FS API
- **objects**: files (vs virtual disk, DB)
- **content**: byte array (vs 80-byte records, BTree)
- **naming**: human-readable (vs object IDs)
- **organization**: name hierarchy
- **synchronization**: none (vs locking, versions)
  - `link()`/`unlink()` can change name hierarchy concurrently with an `open()`
- there are other file system APIs, sometimes quite different!

### Implications of the API
- FD refers to something that is preserved even if file name changes or if file is deleted while open!
- A file can have multiple links (i.e., occur in multiple directories)
  - no one of those occurrences is special
  - so file must have info stored somewhere other than directory
- thus: FS records file info in an "**inode**" on disk
  - FS refers to inode with **i-number** (internal version of FD)
  - inode must have **link count** (tells us when to free)
  - inode must have **count of open FDs**
  - inode deallocation deferred until last link AND FD are gone

## xv6 FS Software Layers
System Calls $\rightarrow$ Name Ops $\mid$ FD Ops $\rightarrow$ Inodes $\rightarrow$ Inode Cache $\rightarrow$ Log $\rightarrow$ Buffer Cache $\rightarrow$ `virtio_disk` driver

## Data Stored on a Persistent Medium
- data stays on disk without power
- common storage medium:
    - **Hard Disk Drives (HDD)** (big but slow, inexpensive)
        - historically, disks were read/write usually in 512-byte units, called **sectors**
        - concentric tracks, head must seek, disk must rotate
        - random access is slow (5 or 10ms per access)
        - sequential access is much faster (100 MB/second)
        - ECC on each sector
        - can only read/write whole sectors $\rightarrow$ sub-sector writes are expensive (read-modify-write)
    - **Solid State Drives (SSD)** (smaller, but fast, and more expensive)
        - non-volatile "flash" memory
        - random access: 100 microseconds
        - sequential: 500 MB/second
        - internally complex -- hidden except sometimes performance
        - flash must be erased before it's re-written
        - limit to the number of times a flash block can be written
        - SSD copes with a level of indirection -- remapped blocks
- For both HDD and SSD:
    - sequential access is much faster than random
    - big reads/writes are faster than small ones
- both of these influence FS design and performance

### Disk Blocks
- most o/s use blocks of multiple sectors, e.g. 4 KB blocks = 8 sectors
  - to reduce book-keeping and seek overheads
- **xv6 uses 2-sector blocks**

## On-Disk Layout (xv6)
- xv6 treats disk as an array of sectors (ignoring physical properties of disk)
- **0**: unused
- **1**: super block (size, ninodes)
- **2**: log for transactions (up to block 31)
- **32**: array of inodes, packed into blocks
- **45**: block in-use bitmap (`0`=free, `1`=used)
- **46**: file/dir content blocks
- end of disk
- xv6's `mkfs` program generates this layout for an empty file system
  - the layout is static for the file system's lifetime

- **"Meta-data"**: everything on disk other than file content (super block, i-nodes, bitmap, directory content)

### On-Disk Inode
- `type` (free, file, directory, device)
- `nlink`
- `size`
- `addrs[12+1]` (direct and indirect blocks)
- **Example**: how to find file's byte 8000?
  - logical block 7 = 8000 / BSIZE (=1024)
  - 7th entry in `addrs`
- each i-node has an **i-number**
- easy to turn i-number into inode
- inode is 64 bytes long
- byte address on disk: `32*BSIZE + 64*inum`

### Directory Contents
- directory much like a file
- but user can't directly write
- content is array of **dirents**
- `dirent`: `inum`, 14-byte file name
- `dirent` is free if `inum` is zero
- You should view FS as an on-disk data structure [tree: dirs, inodes, blocks] with two allocation pools: inodes and blocks

## Let's Look at xv6 in Action (Focus on Disk Writes)
- illustrate on-disk data structures via how updated

### Q: How does xv6 create a file?
`rm fs.img & make qemu`
(output from `mkfs`: `nmeta 46` (boot, super, log blocks 30, inode blocks 13, bitmap blocks 1) `blocks 1954` total `2000`)

`$ echo hi > x`
- `bwrite`: block **33** by `ialloc` // allocate inode in inode block 33
- `bwrite`: block **33** by `iupdate` // update inode (e.g., set `nlink`)
- `bwrite`: block **46** by `writei` // write directory entry, adding "x" by `dirlink()`
- `bwrite`: block **32** by `iupdate` // update directory inode (block 32), because inode may have changed
- `bwrite`: block **33** by `iupdate` // `itrunc` new inode (even though nothing changed)
- // **write data**
- `bwrite`: block **45** by `balloc` // allocate a block in bitmap block 45
- `bwrite`: block **770** by `bzero` // zero the allocated block (block 770)
- `bwrite`: block **770** by `writei` // write to it (`hi`)
- `bwrite`: block **33** by `iupdate` // update inode (for size/addrs)
- // **write data**
- `bwrite`: block **770** by `writei` // write to it (`\n`)
- `bwrite`: block **33** by `iupdate` // update inode (for size/addrs)

**Call Graph (Simplified):** `sys_open` $\rightarrow$ `create` $\rightarrow$ `ialloc`, `iupdate`, `dirlink`, `writei`, `iupdate`, `itrunc`, `iupdate`

- **Q: what's in block 33?** The new file's inode. (Look at `create()` in `sysfile.c`)
- **Q: why *two* writes to block 33?** First is initial allocation/link, second is update after data write.
- **Q: what is in block 32?** The directory's inode (the parent directory).

### Q: How does xv6 write data to a file? (See write part above)
**Call Graph (Simplified):** `sys_write` $\rightarrow$ `filewrite` $\rightarrow$ `writei` $\rightarrow$ `bmap`, `balloc`, `bzero`, `iupdate`

- **Q: what's in block 45?** The bitmap block (look at `writei` call to `bmap`, look at `bmap` call to `balloc`).
- **Q: what's in block 770?** The data block being written.
- **Q: why the `iupdate`?** File length and `addrs[]` changed.

### Q: How does xv6 delete a file?
`$ rm x`
- `bwrite`: block **46** by `writei` // from `sys_unlink`; zero out directory content
- `bwrite`: block **32** by `iupdate` // from `writei` of directory content; dir inode updated
- `bwrite`: block **33** by `iupdate` // from `sys_unlink`; decrement link count of file
- `bwrite`: block **45** by `bfree` // from `itrunc`, from `iput`; free the data block in the bitmap
- `bwrite`: block **33** by `iupdate` // from `itrunc`; zeroed length/addrs
- `bwrite`: block **33** by `iupdate` // from `iput`; marked free (type=0)

**Call Graph (Simplified):** `sys_unlink` $\rightarrow$ `writei` $\rightarrow$ `iupdate` $\rightarrow$ `iunlockput` $\rightarrow$ `iput` $\rightarrow$ `itrunc` $\rightarrow$ `bfree`, `iupdate`, `iupdate`

- **Q: what's in block 46?** Directory content (zeroed entry for "x"). (`sys_unlink` in `sysfile.c`)
- **Q: what's in block 33?** The file's inode (link count decreased, then zeroed).
- **Q: what's in block 45?** The bitmap block (a bit is cleared by `bfree`). (Look at `iput`)
- **Q: why four `iupdates`?** Link count, zero length, zero `addrs[]`, mark type free.

## Concurrency in File System
- **xv6 has modest goals**:
    - parallel read/write of different files
    - parallel pathname lookup
- Even those pose interesting correctness challenges
  - **E.g.** what if there are concurrent calls to `ialloc`? Will they get the same inode?
  - **Note**: `bread` / `write` / `brelse` in `ialloc`
    - `bread` locks the block, perhaps waiting, and reads from disk
    - `brelse` unlocks the block

### The Block Cache in `bio.c`
- block cache holds just a few recently-used blocks
- `bcache` at start of `bio.c`
- FS calls `bread`, which calls `bget`
- `bget`:
    1. looks to see if block already cached
    2. if present, lock (may wait) and return the block
       - may wait in `sleeplock` until current using processes releases sleep lock
       - puts caller to sleep, if already locked
    3. if not present, re-use an existing buffer
- `b->refcnt++` prevents buf from being recycled while we're waiting
- **invariant**: one copy of a disk block in memory
- **Two levels of locking here**:
    - `bcache.lock` protects the description of what's in the cache
    - `b->lock` protects just the one buffer

- **Q: what is the block cache replacement policy?**
    - `prev ... head ... next` (double-linked list)
    - `bget` re-uses `bcache.head.prev` -- the "**tail**" (LRU approximation)
    - `brelse` moves block to `bcache.head.next` (MRU)
- **Q: is that the best replacement policy?**
- **Q: why does it make sense to have a double copy of I/O?**
    - disk to buffer cache
    - buffer cache to user space
    - Can we fix it to get better performance?
- **Q: how much RAM should we dedicate to disk buffers?**

## Pathname Lookup
- Traverse a pathname element at the time
- Potentially many blocks involved:
    - inode of top directory
    - data of top directory
    - inode of next-level down
    - .. and so on ..
- Each one of them might result in a cache miss $\rightarrow$ disk access are expensive
- **Goal**: Allow parallel pathname lookup
- If one process blocks on disk, another process may proceed with lookup
- **Challenging**: `unlink` may happen concurrent with lookup

### `namex()` (kernel/fs.c)
1. `ilock()`: locks current directory
2. find next directory inode
3. then `iunlock()` current directory
- **Risk mitigation**: another process may unlink the next inode, but inode won't be deleted, because inode's `refcnt > 0`
- **Avoid deadlock**: `unlock` current before getting lock on next
- **Key idea**: getting a reference (`refcnt`) separately from locking (`ilock`)