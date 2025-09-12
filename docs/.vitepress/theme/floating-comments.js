
export function initTooltips() {
    let tooltip = document.getElementById('floating-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'floating-tooltip';
        document.body.appendChild(tooltip);
    }

    // 创建同行注释tooltip
    let inlineTooltip = document.getElementById('inline-comment-tooltip');
    if (!inlineTooltip) {
        inlineTooltip = document.createElement('div');
        inlineTooltip.id = 'inline-comment-tooltip';
        document.body.appendChild(inlineTooltip);
    }

    // 创建右键菜单
    let contextMenu = document.getElementById('context-menu');
    if (!contextMenu) {
        contextMenu = document.createElement('div');
        contextMenu.id = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="preview">
                <span class="context-menu-icon">👁️</span>
                <span class="context-menu-text">在弹窗中预览</span>
            </div>
            <div class="context-menu-item" data-action="open">
                <span class="context-menu-icon">🔗</span>
                <span class="context-menu-text">在当前页面打开</span>
            </div>
            <div class="context-menu-item" data-action="new-tab">
                <span class="context-menu-icon">🆕</span>
                <span class="context-menu-text">在新标签页打开</span>
            </div>
        `;
        document.body.appendChild(contextMenu);
    }

    // 创建预览弹窗
    let previewModal = document.getElementById('preview-modal');
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'preview-modal';
        previewModal.innerHTML = `
            <div class="preview-modal-backdrop"></div>
            <div class="preview-modal-content">
                <div class="preview-modal-header">
                    <h3 class="preview-modal-title">链接预览</h3>
                    <button class="preview-modal-close" aria-label="关闭">&times;</button>
                </div>
                <div class="preview-modal-body">
                    <div class="preview-loading">加载中...</div>
                    <iframe class="preview-iframe" style="display: none;"></iframe>
                </div>
                <div class="preview-modal-footer">
                    <button class="preview-modal-btn preview-modal-visit">访问原页面</button>
                </div>
            </div>
        `;
        document.body.appendChild(previewModal);
    }

    let currentTarget = null;
    let currentInlineTarget = null;
    let currentContextTarget = null;
    let hideTimeout;
    let hideInlineTimeout;

    const showTooltip = (target) => {
        clearTimeout(hideTimeout);
        if (currentTarget === target) return;
        
        currentTarget = target;
        const comment = target.dataset.comment;
        
        if (comment) {
            tooltip.innerHTML = comment;
            tooltip.classList.add('active');

            const rect = target.getBoundingClientRect();
            
            // Position tooltip
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        }
    };

    const hideTooltip = () => {
        hideTimeout = setTimeout(() => {
            tooltip.classList.remove('active');
            currentTarget = null;
        }, 100);
    };

    const showInlineTooltip = (target) => {
        clearTimeout(hideInlineTimeout);
        if (currentInlineTarget === target) return;
        
        currentInlineTarget = target;
        const inlineComment = target.dataset.inlineComment;
        
        if (inlineComment) {
            inlineTooltip.innerHTML = inlineComment;
            inlineTooltip.classList.add('active');

            const rect = target.getBoundingClientRect();
            
            // Position inline tooltip to the right of the line
            inlineTooltip.style.left = `${rect.right + 10}px`;
            inlineTooltip.style.top = `${rect.top + window.scrollY}px`;
        }
    };

    const hideInlineTooltip = () => {
        hideInlineTimeout = setTimeout(() => {
            inlineTooltip.classList.remove('active');
            currentInlineTarget = null;
        }, 100);
    };

    // 显示右键菜单
    const showContextMenu = (e, target) => {
        e.preventDefault();
        currentContextTarget = target;
        
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.add('active');
        
        // 确保菜单不会超出视窗
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${e.pageX - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${e.pageY - rect.height}px`;
        }
    };

    // 隐藏右键菜单
    const hideContextMenu = () => {
        contextMenu.classList.remove('active');
        currentContextTarget = null;
    };

    // 显示预览弹窗
    const showPreviewModal = (url) => {
        const iframe = previewModal.querySelector('.preview-iframe');
        const loading = previewModal.querySelector('.preview-loading');
        const title = previewModal.querySelector('.preview-modal-title');
        const visitBtn = previewModal.querySelector('.preview-modal-visit');
        
        title.textContent = `预览: ${url}`;
        visitBtn.onclick = () => {
            window.open(url, '_blank');
        };
        
        loading.style.display = 'block';
        iframe.style.display = 'none';
        
        iframe.onload = () => {
            loading.style.display = 'none';
            iframe.style.display = 'block';
        };
        
        iframe.onerror = () => {
            loading.textContent = '加载失败 - 可能是由于跨域限制';
            iframe.style.display = 'none';
        };
        
        iframe.src = url;
        previewModal.classList.add('active');
    };

    // 隐藏预览弹窗
    const hidePreviewModal = () => {
        previewModal.classList.remove('active');
        const iframe = previewModal.querySelector('.preview-iframe');
        iframe.src = '';
    };

    // Handle regular tooltip display
    document.body.addEventListener('mouseover', (e) => {
        const target = e.target.closest('.with-tooltip');
        if (target && !target.classList.contains('with-inline-comment')) {
            showTooltip(target);
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const target = e.target.closest('.with-tooltip');
        if (target && !target.classList.contains('with-inline-comment')) {
            hideTooltip();
        }
    });

    // Handle inline comment tooltip display
    document.body.addEventListener('mouseover', (e) => {
        const target = e.target.closest('.with-inline-comment');
        if (target) {
            showInlineTooltip(target);
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const target = e.target.closest('.with-inline-comment');
        if (target) {
            hideInlineTooltip();
        }
    });

    // Handle function call links
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('.function-call');
        if (target && target.href) {
            e.preventDefault();
            window.location.href = target.href;
        }
    });

    // Handle right-click context menu for all links
    document.body.addEventListener('contextmenu', (e) => {
        const target = e.target.closest('a[href]');
        if (target && target.href) {
            // 只对内部链接显示自定义右键菜单
            const url = new URL(target.href, window.location.origin);
            if (url.origin === window.location.origin) {
                showContextMenu(e, target);
            }
        }
    });

    // Handle context menu item clicks
    contextMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (item && currentContextTarget) {
            const action = item.dataset.action;
            const url = currentContextTarget.href;
            
            switch (action) {
                case 'preview':
                    showPreviewModal(url);
                    break;
                case 'open':
                    window.location.href = url;
                    break;
                case 'new-tab':
                    window.open(url, '_blank');
                    break;
            }
            
            hideContextMenu();
        }
    });

    // Handle preview modal close
    previewModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('preview-modal-backdrop') || 
            e.target.classList.contains('preview-modal-close')) {
            hidePreviewModal();
        }
    });

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
            hidePreviewModal();
        }
    });

    tooltip.addEventListener('mouseover', () => {
        clearTimeout(hideTimeout);
    });

    tooltip.addEventListener('mouseout', () => {
        hideTooltip();
    });

    inlineTooltip.addEventListener('mouseover', () => {
        clearTimeout(hideInlineTimeout);
    });

    inlineTooltip.addEventListener('mouseout', () => {
        hideInlineTooltip();
    });
}
