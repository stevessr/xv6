---
title: 第19讲：Redleaf
---

6.1810 2024 第19讲：内核与高级语言

**阅读材料：** "RedLeaf: Isolation and Communication in a Safe Operating System" (2020)

**大纲：**
- 用C语言编写的商业内核
  - 开发者拥有完全控制权，但很难做对
- 有吸引力的替代方案：Rust（控制力强，无GC）
- 本文：使用高级语言设计无硬件隔离的操作系统
  - 所有代码都在监控模式下运行，但具有语言隔离

**C语言的挑战**
- 内存管理留给程序员
- 对内核开发者的严重问题：
  - 并发数据结构具有挑战性（RCU，下周）
  - 内存安全漏洞
    - 释放后使用（出了名的难以调试）
    - 缓冲区溢出（安全漏洞）
- 高级语言的安全影响和好处：
  - https://security.googleblog.com/2024/03/secure-by-design-googles-perspective-on.html
  - https://security.googleblog.com/2019/05/queue-hardening-enhancements.html
  - https://security.googleblog.com/2024/10/safer-with-google-advancing-memory.html

**高级语言 (HLL)**
- HLL：自动内存管理
- 避免C语言的大量bug
  - HLL强制类型检查，检查边界
- 许多HLL有垃圾收集器 (GC)
  - GC自动进行内存释放
  - 对并发编程友好
- 但GC有成本
  - 运行时的CPU周期
  - 延迟执行
  - 额外的内存
  - https://www.usenix.org/conference/osdi18/presentation/cutler

**Rust：没有GC的HLL**
- 开发者必须遵守所有权规则
  - 每个活动对象只有一个唯一指针
  - https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
- 允许对对象的生命周期进行静态分析：无GC
- 小的运行时
  - 用于内存安全的边界检查

**Rust 和 Linux**
- 用Rust替换C
- 挑战：
  - C/Rust 交互
    - 指向C数据结构的指针
  - 不安全的Rust (unsafe Rust)
- https://www.usenix.org/publications/loginonline/empirical-study-rust-linux-success-dissatisfaction-and-compromise

**提醒：硬件隔离**
- 进程：由页表强制执行的隔离
- xv6/单体内核：内核和用户进程的地址空间
- l4/微内核：将内核拆分为进程

**RedLeaf：使用HLL进行隔离**
- **域 (domain)** 是隔离单元
- 隔离由HLL强制执行
  - 轻量级（无系统调用）
  - 一个域调用另一个域中的函数
- 依赖语言来强制域之间的隔离
  - 不能跳转到任意位置
  - 不能任意转换类型
- **为什么有用？**
  - **性能**
    - 快速的跨域调用（例如，与L4相比）
    - 直接访问硬件/驱动程序
  - **更多的隔离**
    - 例如，将内核分解为许多域
- RedLeaf应用程序必须用Rust编写
  - 不能运行任意二进制文件
- 悠久的历史：Lisp OSes, .., Singularity,...

**挑战：域清理**
- 域崩溃（panic，运行时违规）
- 如何释放其资源？
  - 另一个域可能有一个指向崩溃域的指针
  - 调用到崩溃域的另一个域的线程如何返回？
  - 如何释放与域关联的“内核”资源
- unix进程的好属性
  - 数据对进程是私有的
    - 没有外部指针指向进程
  - 可被杀死 (killable)
  - `exit` 释放所有资源

**初步设计：按值传递数据**
- 没有外部指针指向崩溃的域
- 但传递大对象成本高昂
- **目标：零拷贝通信**

**RedLeaf 的思想：**
- **堆隔离**
  - 没有外部指针指向私有堆
- **带有可交换类型的共享堆**
  - 允许零拷贝
- **所有权跟踪**
  - 用于释放共享堆中的对象
- **接口验证**
  - 强制类型是可交换的
- **跨域调用代理**
  - 更新所有权
  - 处理崩溃
- `git clone https://github.com/mars-research/redleaf.git`

**RedLeaf 域间通信 (图 2)**
- 共享堆包含 `RRef<T>`
  - 域所有者, 引用计数, T 信息
- 域的堆：两级内存分配
  - 用于 `Box<T>` 分配的可信 crate
- **可交换类型**
  - `RRef<T>` 可以指向其他 `RRef<T>`
  - IDL 编译器检查接口定义
- **用于隔离的可信代理**
  - 更新 `RRef<T>` 所有权（仅根 `RRef<T>`）
  - 当被调用者崩溃时返回错误

**域清理**
- 私有堆是私有的
  - 没有其他域有指向私有堆中对象的指针
- **共享堆释放**
  - 找到域的 `RRef<T>` 根
    - 为 T 找到 `drop()`
    - 调用 `drop()`，这可能会释放子对象
- 崩溃的被调用者可能会涂写可变引用
  - 代理返回 `RpcResult<T>`
- **为了透明恢复：引用必须是不可变的**

**RedLeaf 实现 (图 1)**
- 一切都在监控模式下运行
- 许多域
  - 用户进程在它们自己的域中
  - rv6 分为几个域
    - Rust 中的 xv6
    - 核心：“syscall”分发器
  - 驱动程序在它们自己的域中
- 微内核

**创建和下载域**
- **挑战：** 跨域的类型必须相同
- **解决方案：**
  - 可信编译对域“二进制文件”进行签名
    - IDL 文件和编译器标志
    - 没有不安全的 Rust
    - 生成的域入口点
  - 微内核检查签名
    - （并因此检查所有类型）

**性能**
- **微基准测试 (表 1)**
  - 为什么 L4 更慢？
  - 为什么 RedLeaf 只有 124 个周期？
- **语言税 (图 5)**
  - 高阶函数
  - `Option<T>`
- **设备驱动程序 (图 8)**
  - 为什么 redleaf-driver < DPDK？
  - 为什么 redleaf-domain < redleaf-driver？

**HLL vs. 硬件隔离**
- RedLeaf TCB：Rust 编译器, Rust 核心库, 微内核, IDL 编译器
- xv6 TCB：RISC-V CPU, xv6-kernel (但对编译器的依赖较少)
- 浏览器中的语言级隔离（例如，WASM）
- 页表除了隔离之外还有其他用途
