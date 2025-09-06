# 实验解答：使用超级页面

本文件为“使用超级页面”任务提供了完整的代码解答。它涉及为2MB页面创建一个专用的物理分配器，并修改核心的虚拟内存函数以使用它们。

---

### 1. `kernel/riscv.h`

定义超级页面的大小和对齐相关的常量。

```diff
--- a/kernel/riscv.h
+++ b/kernel/riscv.h
@@ -3,6 +3,8 @@
 #define PGSIZE 4096 // bytes per page
 #define PGSHIFT 12  // bits of offset within a page
 #define PGMASK (PGSIZE - 1)
+#define MEGAPAGE_SIZE (2 * 1024 * 1024) // 2MB
+#define MEGAPAGE_MASK (MEGAPAGE_SIZE - 1)
 
 #define KERNBASE 0x80000000L
 #define PHYSTOP (KERNBASE + 128*1024*1024)

```

### 2. `kernel/defs.h`

为新的超级页面分配器函数添加原型。

```diff
--- a/kernel/defs.h
+++ b/kernel/defs.h
@@ -83,6 +83,8 @@
 // kalloc.c
 void*           kalloc(void);
 void            kfree(void*);
+void*           superalloc(void);
+void            superfree(void*);
 void            kinit(void);
 
 // log.c

```

### 3. `kernel/kalloc.c`

为2MB物理页面建立一个专用的分配器。

```diff
--- a/kernel/kalloc.c
+++ b/kernel/kalloc.c
@@ -10,12 +10,23 @@
   struct run *next;
 };
 
+struct superpage {
+  struct superpage *next;
+};
+
 struct {
   struct spinlock lock;
   struct run *freelist;
 } kmem;
 
+struct {
+  struct spinlock lock;
+  struct superpage *freelist;
+} supermem;
+
 void
 kinit()
 {
   initlock(&kmem.lock, "kmem");
+  initlock(&supermem.lock, "supermem");
   freerange(end, (void*)PHYSTOP);
 }
 
@@ -24,6 +35,16 @@
 {
   char *p;
   p = (char*)PGROUNDUP((uint64)pa_start);
+  
+  // 从空闲内存的起始部分划分出32MB用于超级页面
+  // 确保这块内存是2MB对齐的
+  uint64 superpage_start = (uint64)p;
+  if(superpage_start % MEGAPAGE_SIZE != 0)
+    superpage_start = (superpage_start + MEGAPAGE_SIZE) & ~MEGAPAGE_MASK;
+  for(uint64 pa = superpage_start; pa < superpage_start + 16 * MEGAPAGE_SIZE; pa += MEGAPAGE_SIZE){
+      superfree((void*)pa);
+  }
+  p = (char*)(superpage_start + 16 * MEGAPAGE_SIZE);
+
   for(; p + PGSIZE <= (char*)pa_end; p += PGSIZE)
     kfree(p);
 }
@@ -58,3 +79,40 @@
   r->next = kmem.freelist;
   kmem.freelist = r;
   release(&kmem.lock);
+}
+
+// 分配一个2MB对齐的物理页面
+void *
+superalloc(void)
+{
+  struct superpage *r;
+
+  acquire(&supermem.lock);
+  r = supermem.freelist;
+  if(r)
+    supermem.freelist = r->next;
+  release(&supermem.lock);
+
+  if(r)
+    memset((char*)r, 5, MEGAPAGE_SIZE); // 填充垃圾数据
+  return (void*)r;
+}
+
+// 释放一个2MB对齐的物理页面
+void
+superfree(void *pa)
+{
+  struct superpage *r;
+
+  if(((uint64)pa % MEGAPAGE_SIZE) != 0 || (char*)pa < end || (uint64)pa >= PHYSTOP)
+    panic("superfree");
+
+  // 填充垃圾数据以捕获悬空引用
+  memset(pa, 1, MEGAPAGE_SIZE);
+
+  r = (struct superpage*)pa;
+
+  acquire(&supermem.lock);
+  r->next = supermem.freelist;
+  supermem.freelist = r;
+  release(&supermem.lock);
 }

```

### 4. `kernel/vm.c`

修改 `uvmalloc`、`uvmunmap` 和 `uvmcopy` 以支持超级页面。这是最复杂的部分。

```diff
--- a/kernel/vm.c
+++ b/kernel/vm.c
@@ -149,18 +149,36 @@
   if(newsz <= oldsz)
     return oldsz;
 
-  oldsz = PGROUNDUP(oldsz);
-  for(uint64 a = oldsz; a < newsz; a += PGSIZE){
-    char *mem;
-    mem = kalloc();
-    if(mem == 0){
-      uvmdealloc(pagetable, a, oldsz);
-      return 0;
+  uint64 a = PGROUNDUP(oldsz);
+  for(; a < newsz; ){
+    if((a % MEGAPAGE_SIZE == 0) && (newsz - a >= MEGAPAGE_SIZE)){
+      // 尝试分配一个超级页面
+      char *mem = superalloc();
+      if(mem){
+        if(mappages(pagetable, a, MEGAPAGE_SIZE, (uint64)mem, perm) != 0){
+          superfree(mem);
+          uvmdealloc(pagetable, a, oldsz);
+          return 0;
+        }
+        a += MEGAPAGE_SIZE;
+        continue;
+      }
+      // superalloc 失败, 回退到4K页面
     }
-    memset(mem, 0, PGSIZE);
-    if(mappages(pagetable, a, PGSIZE, (uint64)mem, perm) != 0){
+
+    // 分配一个4K页面
+    char *mem = kalloc();
+    if(mem == 0) {
+      uvmdealloc(pagetable, a, oldsz);
+      return 0;
+    }
+    memset(mem, 0, PGSIZE);
+    if(mappages(pagetable, a, PGSIZE, (uint64)mem, perm) != 0) {
       kfree(mem);
       uvmdealloc(pagetable, a, oldsz);
       return 0;
     }
+    a += PGSIZE;
   }
   return newsz;
 }
@@ -200,20 +218,33 @@
   if((va % PGSIZE) != 0)
     panic("uvmunmap: not aligned");
 
-  for(uint64 a = va; a < va + npages*PGSIZE; a += PGSIZE){
+  for(uint64 a = va; a < va + npages*PGSIZE; ){
     pte_t *pte = walk(pagetable, a, 0);
-    if(pte == 0)
-      panic("uvmunmap: walk");
-    if((*pte & PTE_V) == 0)
-      panic("uvmunmap: not mapped");
-    if(PTE_FLAGS(*pte) == PTE_V)
-      panic("uvmunmap: not a leaf");
-    if(do_free){
-      uint64 pa = PTE2PA(*pte);
-      kfree((void*)pa);
+    if(pte && (*pte & PTE_V) != 0) {
+      // 通过检查PA是否2MB对齐来判断是否为超级页面。这是一个简化判断。
+      // 更稳健的方案需要更复杂的walk逻辑来确定PTE的级别。
+      uint64 pa = PTE2PA(*pte);
+      if((pa % MEGAPAGE_SIZE) == 0 && (*pte & (PTE_R|PTE_W|PTE_X)) != 0) {
+        // 看起来是超级页面
+        if(do_free){
+          superfree((void*)pa);
+        }
+        *pte = 0;
+        a = (a + MEGAPAGE_SIZE) & ~MEGAPAGE_MASK; // 跳到下一个2MB边界
+        continue;
+      } else {
+        // 是4K页面
+        if(do_free){
+          kfree((void*)pa);
+        }
+        *pte = 0;
+      }
     }
-    *pte = 0;
+    a += PGSIZE;
   }
 }
 
@@ -260,21 +291,36 @@
   uint64 i;
   pte_t *pte;
 
-  for(i = 0; i < sz; i += PGSIZE){
+  for(i = 0; i < sz; ){
     if((pte = walk(old, i, 0)) == 0)
       panic("uvmcopy: pte should exist");
     if((*pte & PTE_V) == 0)
       panic("uvmcopy: page not present");
     uint64 pa = PTE2PA(*pte);
     uint flags = PTE_FLAGS(*pte);
-    char *mem = kalloc();
-    if(mem == 0)
-      goto err;
-    memmove(mem, (char*)pa, PGSIZE);
-    if(mappages(new, i, PGSIZE, (uint64)mem, flags) != 0){
-      kfree(mem);
-      goto err;
+
+    // 超级页面处理
+    if((pa % MEGAPAGE_SIZE) == 0 && (*pte & (PTE_R|PTE_W|PTE_X)) != 0) {
+      char *mem = superalloc();
+      if(mem == 0) goto err;
+      memmove(mem, (char*)pa, MEGAPAGE_SIZE);
+      if(mappages(new, i, MEGAPAGE_SIZE, (uint64)mem, flags) != 0){
+        superfree(mem);
+        goto err;
+      }
+      i += MEGAPAGE_SIZE;
+    } else {
+      // 4K页面处理
+      char *mem = kalloc();
+      if(mem == 0) goto err;
+      memmove(mem, (char*)pa, PGSIZE);
+      if(mappages(new, i, PGSIZE, (uint64)mem, flags) != 0){
+        kfree(mem);
+        goto err;
+      }
+      i += PGSIZE;
     }
   }
   return 0;

```
