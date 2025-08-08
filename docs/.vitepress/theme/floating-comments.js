
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

    let currentTarget = null;
    let currentInlineTarget = null;
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
