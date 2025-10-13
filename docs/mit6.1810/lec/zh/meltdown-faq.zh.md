---
title: meltdown-faq.txt
---

Lipp 等人"Meltdown：从用户空间读取内核内存"的常见问题

Q: 较新的 CPU 是否容易受到 Meltdown 攻击？
A: 新的 Intel CPU 具有防止 Meltdown 的硬件"修复"，但许多代过去的 CPU 容易受到攻击并需要 KAISER。AMD CPU 据信不容易受到 Meltdown 攻击。还有许多其他像 Meltdown 的攻击，如下所述，这些攻击更难修复，涉及软件和硬件防御。这引发了关于硬件/软件合同中隔离的一般讨论。

Q: 还有其他微架构侧信道攻击吗？
A: 是的，很多。Meltdown/Spectre 是第一批，但之后研究人员发现了许多其他的；例如，参见 https://en.wikipedia.org/wiki/Spectre_(security_vulnerability)。课程 6 现在提供硬件安全课程（6.5950，https://shd.mit.edu/）。在 Linux 上，运行"grep . /sys/devices/system/cpu/vulnerabilities/*"以查看 CPU 的漏洞和缓解措施。

Q: 一般而言，我们如何防范侧信道攻击？是否可能消除侧信道的存在？
A: 侧信道攻击有很多形式（参见 https://en.wikipedia.org/wiki/Side-channel_attack）。历史上人们担心 EM 信号泄露（看看 http://cryptome.org/nsa-tempest.pdf）。加密代码担心计时侧信道，以避免泄露秘密密钥的位，并尝试以恒定时间方式编写加密代码。Spectre 和 Meltdown 攻击是基于通过微架构功能泄露秘密的新类侧信道攻击。在这些攻击之前，这类侧信道被假设不存在，但现在它们是可利用的，并且在寻找新漏洞和确定解决方案方面有巨大的活动（参见上面）。

Q: 在发现 Meltdown 之前，为什么通常将内核内存映射到用户页表中？
A: 这是几十年来的标准方式，直到发现这些攻击。基本上是通用的，用户内存从零开始，内核在高地址。映射用户和内核使系统调用更快，因为您可以传递指针而不是必须复制数据。

Q: KAISER 与 xv6 使用页表的关系如何？
A: 如果您愿意，xv6 实现了 KAISER；内核使用自己的页表运行，用户进程不映射内核内存。因此，用户程序甚至无法凑出一个引用内核内存的地址。攻击利用了 2018 年之前用户程序也映射了所有内核内存（但没有读/写访问权限，像 trampoline 页面），这允许用户程序凑出引用内核内存的地址。

Q: Meltdown 如何确保乱序执行发生以完成攻击？
A: 论文中攻击的 Intel CPU 可能会推测性地执行通过 mov 指令以保持其指令流水线完整并使其执行单元繁忙。然而，作者无法使攻击可靠工作，如列表 3 和 4 中的 xx 所示。一个原因可能是只有当第 4 行上的 mov 在 L1 缓存中命中时才能良好工作。

Q: 我们如何知道指令是瞬态的？
A: 我们不知道，因为我们不知道 CPU 如何实现（Intel CPU 不是开源的），因此我们无法预先知道指令是否会留下可测量的副作用。只有当有人找出利用该指令的方法时，我们才知道它是瞬态的。

Q: CPU 如何修复以停止 Meltdown 攻击？
A: 由于 Intel CPU 是闭源的，很难知道 Intel 做了什么。CPU 可以在 L1 中并行检查 TLB 中的权限，并在权限检查失败时使用 0 而不是实际值，以便后续推测指令将看到 0 直到 mov 退出（并引发异常）。

Q: Meltdown 和 Spectre 之间有什么关系？
A: 它们都是利用推测执行的微架构侧信道攻击，但在它们利用的内容上有所不同。Meltdown 利用数据访问绕过页表保护检查。Spectre 利用数据访问绕过数组边界检查。这篇论文一起回顾了它们：https://css.csail.mit.edu/6.858/2022/readings/spectre-meltdown.pdf

Q: 什么是 KASLR？
A: KASLR（内核地址空间布局随机化）将内核文本放在虚拟地址空间中的随机偏移处，以便使攻击者更难猜测内核函数的位置。但是，一旦攻击者知道偏移量，攻击者就可以计算出每个函数的地址。地址空间随机化使 Meltdown 的成功稍微具有挑战性，因为攻击者必须弄清楚偏移量，但这并不是一个巨大的障碍。您可以在这里了解 KASLR：https://lwn.net/Articles/569635/。KAISR 最初是为了防御 KASLR 免受侧信道攻击而开发的。KAISR 也恰好能防御 Meltdown。

Q: Meltdown 是否在野外被使用过？
A: 这是由遵循安全披露协议的研究人员发现的攻击。我不知道"野外"攻击，但当然，我们可能不知道，因为攻击者不会这么说。

Q: KAISER/KPTI的性能影响是什么？
A: KPTI/KAISER对io密集型工作负载的性能影响从可以忽略不计到10%，具体取决于确切的工作负载。参见https://en.wikipedia.org/wiki/Meltdown_(security_vulnerabil 以获取一些参考文献。这篇论文也探讨了这一点：https://pdos.csail.mit.edu/papers/behrensj-phd-thesis.pdf

Q: 现代操作系统是否有"敏感"数据的概念，这可能允许对页映射进行更细粒度的控制？
A: 朝着这个方向有努力；例如，参见 MAP_EXCLUSIVE（https://lwn.net/Articles/804658/）。

Q: 未来的缓解措施如 KAISER 如何解决像 Meltdown 这样的推测执行漏洞，在安全性和性能之间取得平衡？
A: 用户可以通过决定启用哪些缓解措施来选择这种权衡。您可以在 Linux 上使用"grep . /sys/devices/system/cpu/vulnerabilities/*"查看。

Q: 微架构侧信道是如何持久化和清除的？
A: 没有明确的 API。这是 CPU 实现微架构特征的副作用。例如，在论文中，L1 缓存是侧信道"持久化"的地方，作为推测执行的副作用。L1 缓存行可能由于缓存冲突替换感兴趣的行而被"清除"。您可以从列表 3 和 4 中的 XXs 看出，攻击确实不可靠。