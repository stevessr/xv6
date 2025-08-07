
export function initTooltips() {
    let tooltip = document.getElementById('floating-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'floating-tooltip';
        document.body.appendChild(tooltip);
    }

    let currentTarget = null;
    let hideTimeout;

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

    document.body.addEventListener('mouseover', (e) => {
        const target = e.target.closest('.with-tooltip');
        if (target) {
            showTooltip(target);
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        const target = e.target.closest('.with-tooltip');
        if (target) {
            hideTooltip();
        }
    });

    tooltip.addEventListener('mouseover', () => {
        clearTimeout(hideTimeout);
    });

    tooltip.addEventListener('mouseout', () => {
        hideTooltip();
    });
}
