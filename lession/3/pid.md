# Lab: Speeding up `getpid()` with a Shared Page

This document summarizes the code changes required to implement the `getpid()` optimization using a shared memory page between the kernel and userspace.

## 1. `kernel/proc.h`

A pointer `usyscall` is added to `struct proc` to hold the kernel virtual address of the shared page.

```diff
--- a/kernel/proc.h
+++ b/kernel/proc.h
@@ -94,6 +94,7 @@
   uint64 sz;                   // Size of process memory (bytes)
   pagetable_t pagetable;       // User page table
   struct trapframe *trapframe; // data page for trampoline.S
+  struct usyscall *usyscall;   // shared page for fast system calls
   struct context context;      // swtch() here to run process
   struct file *ofile[NOFILE];  // Open files
   struct inode *cwd;           // Current directory

```

## 2. `kernel/proc.c`

### `allocproc()`

In `allocproc`, we allocate a page for `usyscall`, initialize it with the process's PID. This happens right after the process is assigned a PID.

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -142,6 +142,16 @@
     return 0;
   }
 
+  // Allocate a page for USYSCALL.
+  if((p->usyscall = (struct usyscall *)kalloc()) == 0) {
+    freeproc(p);
+    release(&p->lock);
+    return 0;
+  }
+  memset(p->usyscall, 0, PGSIZE);
+  p->usyscall->pid = p->pid;
+
   // An empty user page table.
   p->pagetable = proc_pagetable(p);
   if(p->pagetable == 0){

```

### `proc_pagetable()`

The newly allocated page is mapped into the user's address space at the `USYSCALL` virtual address with read-only permissions for user code (`PTE_R | PTE_U`).

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -216,6 +216,16 @@
     return 0;
   }
 
+  // map the usyscall page
+  if(mappages(pagetable, USYSCALL, PGSIZE,
+              (uint64)(p->usyscall), PTE_R | PTE_U) < 0){
+    uvmunmap(pagetable, TRAMPOLINE, 1, 0);
+    uvmunmap(pagetable, TRAPFRAME, 1, 0);
+    uvmfree(pagetable, 0);
+    return 0;
+  }
+
   return pagetable;
 }
```

### `freeproc()`

When a process is freed, the physical memory allocated for the `usyscall` page must also be freed, mirroring the cleanup logic for `trapframe`.

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -171,6 +171,9 @@
   if(p->trapframe)
     kfree((void*)p->trapframe);
   p->trapframe = 0;
+  if(p->usyscall)
+    kfree((void*)p->usyscall);
+  p->usyscall = 0;
   if(p->pagetable)
     proc_freepagetable(p->pagetable, p->sz);
   p->pagetable = 0;

```

### `proc_freepagetable()`

Finally, the mapping for the `USYSCALL` page is removed from the process's page table during cleanup.

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -227,6 +227,7 @@
 {
   uvmunmap(pagetable, TRAMPOLINE, 1, 0);
   uvmunmap(pagetable, TRAPFRAME, 1, 0);
````markdown
# 实验：通过共享页面加速 `getpid()`

本文档汇总了实现通过内核与用户空间之间的共享内存页来优化 `getpid()` 所需的代码改动。

## 1. `kernel/proc.h`

在 `struct proc` 中增加了一个指针 `usyscall`，用于保存共享页面在内核虚拟地址空间的指针。

```diff
--- a/kernel/proc.h
+++ b/kernel/proc.h
@@ -94,6 +94,7 @@
   uint64 sz;                   // Size of process memory (bytes)
   pagetable_t pagetable;       // User page table
   struct trapframe *trapframe; // data page for trampoline.S
+  struct usyscall *usyscall;   // shared page for fast system calls
   struct context context;      // swtch() here to run process
   struct file *ofile[NOFILE];  // Open files
   struct inode *cwd;           // Current directory

```

## 2. `kernel/proc.c`

### `allocproc()`

在 `allocproc` 中为 `usyscall` 分配一页内存，并在进程获得 PID 后将该页初始化为该进程的 PID。

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -142,6 +142,16 @@
     return 0;
   }
 
+  // Allocate a page for USYSCALL.
+  if((p->usyscall = (struct usyscall *)kalloc()) == 0) {
+    freeproc(p);
+    release(&p->lock);
+    return 0;
+  }
+  memset(p->usyscall, 0, PGSIZE);
+  p->usyscall->pid = p->pid;
+
   // An empty user page table.
   p->pagetable = proc_pagetable(p);
   if(p->pagetable == 0){

```

### `proc_pagetable()`

将新分配的页映射到用户地址空间的 `USYSCALL` 虚拟地址处，并对用户代码设置只读权限（`PTE_R | PTE_U`）。

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -216,6 +216,16 @@
     return 0;
   }
 
+  // map the usyscall page
+  if(mappages(pagetable, USYSCALL, PGSIZE,
+              (uint64)(p->usyscall), PTE_R | PTE_U) < 0){
+    uvmunmap(pagetable, TRAMPOLINE, 1, 0);
+    uvmunmap(pagetable, TRAPFRAME, 1, 0);
+    uvmfree(pagetable, 0);
+    return 0;
+  }
+
   return pagetable;
 }
```

### `freeproc()`

当进程被释放时，必须像清理 `trapframe` 一样释放为 `usyscall` 分配的物理内存。

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -171,6 +171,9 @@
   if(p->trapframe)
     kfree((void*)p->trapframe);
   p->trapframe = 0;
+  if(p->usyscall)
+    kfree((void*)p->usyscall);
+  p->usyscall = 0;
   if(p->pagetable)
     proc_freepagetable(p->pagetable, p->sz);
   p->pagetable = 0;

```

### `proc_freepagetable()`

最后，在清理过程中需要从进程的页表中移除 `USYSCALL` 页面映射。

```diff
--- a/kernel/proc.c
+++ b/kernel/proc.c
@@ -227,6 +227,7 @@
 {
   uvmunmap(pagetable, TRAMPOLINE, 1, 0);
   uvmunmap(pagetable, TRAPFRAME, 1, 0);
+  uvmunmap(pagetable, USYSCALL, 1, 0);
   uvmfree(pagetable, sz);
 }
```
````
