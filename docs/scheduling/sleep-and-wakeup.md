# 休眠与唤醒
\label{sec:sleep}

调度和锁有助于隐藏一个线程对另一个线程的操作，但我们还需要有助于线程有意交互的抽象。例如，xv6中管道的读取者可能需要等待一个写入进程产生数据；父进程对[`wait`](/source/xv6-riscv/user/user.h.md)的调用可能需要等待一个子进程退出；以及一个读取磁盘的进程需要等待磁盘硬件完成读取。xv6内核在这些情况（以及许多其他情况）下使用一种称为休眠和唤醒的机制。休眠允许一个内核线程等待一个特定事件；另一个线程可以调用唤醒来指示等待指定事件的线程应该恢复。休眠和唤醒通常被称为序列协调（sequence coordination）或条件同步（conditional synchronization）机制。

休眠和唤醒提供了一个相对底层的同步接口。为了激发它们在xv6中的工作方式，我们将用它们来构建一个更高级别的同步机制，称为信号量（semaphore），用于协调生产者和消费者（xv6不使用信号量）。信号量维护一个计数并提供两个操作。“V”操作（对于生产者）增加计数。“P”操作（对于消费者）等到计数非零，然后递减它并返回。如果只有一个生产者线程和一个消费者线程，并且它们在不同的CPU上执行，并且编译器没有进行过于激进的优化，那么这个实现将是正确的：


```
c
  struct semaphore {
    struct spinlock lock;
    int count;
  };

  void
  V(struct semaphore *s)
  {
     acquire(&s->lock);
     s->count += 1;
     release(&s->lock);
  }

  void
  P(struct semaphore *s)
  {
     while(s->count == 0)
       ;
     acquire(&s->lock);
     s->count -= 1;
     release(&s->lock);
  }

```


上面的实现是昂贵的。如果生产者很少活动，消费者将花费大部分时间在`while`循环中旋转，希望计数非零。消费者的CPU可以通过重复轮询（polling）`s->count`来找到比忙等待（busy waiting）更有效率的工作。避免忙等待需要一种让消费者让出CPU并仅在`V`增加计数后才恢复的方法。

这是一个朝着这个方向迈出的一步，虽然正如我们将看到的，这还不够。让我们想象一对调用，[`sleep`](/source/xv6-riscv/user/user.h.md)和[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)，它们的工作方式如下。`sleep(chan)`等待由`chan`的值指定的事件，称为等待通道（wait channel）。[`sleep`](/source/xv6-riscv/user/user.h.md)将调用进程置于休眠状态，释放CPU用于其他工作。`wakeup(chan)`唤醒所有正在调用具有相同`chan`的[`sleep`](/source/xv6-riscv/user/user.h.md)的进程（如果有的话），导致它们的[`sleep`](/source/xv6-riscv/user/user.h.md)调用返回。如果没有进程在`chan`上等待，[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)什么也不做。我们可以改变信号量实现以使用[`sleep`](/source/xv6-riscv/user/user.h.md)和[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)：


```
c
  void
  V(struct semaphore *s)
  {
     acquire(&s->lock);
     s->count += 1;
     wakeup(s);
     release(&s->lock);
  }
  
  void
  P(struct semaphore *s)
  {
    while(s->count == 0)
      sleep(s);
    acquire(&s->lock);
    s->count -= 1;
    release(&s->lock);
  }

```


`P`现在放弃CPU而不是自旋，这很好。然而，事实证明，使用这种接口设计[`sleep`](/source/xv6-riscv/user/user.h.md)和[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)而不遭受所谓的丢失唤醒（lost wake-up）问题并不简单。假设`P`发现`s->count == 0`。当`P`在测试和[`sleep`](/source/xv6-riscv/user/user.h.md)之间时，`V`在另一个CPU上运行：它将`s->count`更改为非零并调用[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)，它发现没有进程在休眠，因此什么也不做。现在`P`继续执行：它调用[`sleep`](/source/xv6-riscv/user/user.h.md)并进入休眠状态。这导致一个问题：`P`正在休眠等待一个已经发生过的`V`调用。除非我们幸运地生产者再次调用`V`，否则即使计数非零，消费者也将永远等待。

这个问题的根源在于，`P`仅在`s->count == 0`时休眠的不变性被`V`在恰好错误的时刻运行所破坏。一个不正确的保护不变性的方法是在`P`中移动锁的获取，以便其对计数的检查和对[`sleep`](/source/xv6-riscv/user/user.h.md)的调用是原子的：


```
c
  void
  V(struct semaphore *s)
  {
    acquire(&s->lock);
    s->count += 1;
    wakeup(s);
    release(&s->lock);
  }
  
  void
  P(struct semaphore *s)
  {
    acquire(&s->lock);
    while(s->count == 0)
      sleep(s);
    s->count -= 1;
    release(&s->lock);
  }

```


人们可能希望这个版本的`P`会避免丢失唤醒，因为锁阻止了`V`在测试和[`sleep`](/source/xv6-riscv/user/user.h.md)之间执行。它确实做到了这一点，但它也导致了死锁：`P`在休眠时持有锁，所以`V`将永远阻塞等待锁。

我们将通过改变[`sleep`](/source/xv6-riscv/user/user.h.md)的接口来修复前面的方案：调用者必须将条件锁（condition lock）传递给[`sleep`](/source/xv6-riscv/user/user.h.md)，以便它可以在调用进程被标记为休眠并等待在休眠通道上之后释放锁。该锁将强制一个并发的`V`等到`P`完成将自己置于休眠状态，以便[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)将找到休眠的消费者并唤醒它。一旦消费者再次被唤醒，[`sleep`](/source/xv6-riscv/user/user.h.md)会在返回之前重新获取锁。我们新的正确的休眠/唤醒方案可按如下方式使用：


```
c
  void
  V(struct semaphore *s)
  {
    acquire(&s->lock);
    s->count += 1;
    wakeup(s);
    release(&s->lock);
  }

  void
  P(struct semaphore *s)
  {
    acquire(&s->lock);
    while(s->count == 0)
       sleep(s, &s->lock);
    s->count -= 1;
    release(&s->lock);
  }

```


`P`持有`s->lock`的事实阻止了`V`在`P`检查`s->count`和其调用[`sleep`](/source/xv6-riscv/user/user.h.md)之间尝试唤醒它。然而，[`sleep`](/source/xv6-riscv/user/user.h.md)必须释放`s->lock`并将消费进程置于休眠状态，从[`wakeup`](/source/xv6-riscv/kernel/defs.h.md)的角度来看，这必须是原子的，以避免丢失唤醒。