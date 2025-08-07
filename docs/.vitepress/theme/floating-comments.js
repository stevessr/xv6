function createDebugOverlay() {
    let overlay = document.getElementById('debug-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'debug-overlay';
        document.body.appendChild(overlay);
    }
    return overlay;
}

function logToOverlay(message) {
    const overlay = createDebugOverlay();
    const line = document.createElement('p');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    overlay.appendChild(line);
    overlay.scrollTop = overlay.scrollHeight; // Auto-scroll to bottom
    console.log(message);
}

function updateFloatingComments() {
    logToOverlay('Updating...');
    const containers = document.querySelectorAll('div[class*="language-"]');
    logToOverlay(`Found ${containers.length} code containers.`);
    
    containers.forEach(container => {
        let floatingContainer = container.querySelector('.floating-comment-container');
        if (!floatingContainer) {
            floatingContainer = document.createElement('div');
            floatingContainer.className = 'floating-comment-container';
            container.appendChild(floatingContainer);
        }
        floatingContainer.innerHTML = '';

        const codeLines = container.querySelectorAll('.line');
        
        codeLines.forEach((line, index) => {
            const commentMarkers = line.querySelectorAll('.floating-comment-marker');
            if (commentMarkers.length > 0) {
                 logToOverlay(`Found ${commentMarkers.length} markers on line ${index + 1}`);
            }
            
            const commentsForThisLine = [];

            commentMarkers.forEach(marker => {
                const commentText = marker.dataset.comment;
                if (!commentText) return;

                const floatingComment = document.createElement('div');
                floatingComment.className = 'floating-comment';
                floatingComment.textContent = commentText;
                
                const lineTop = line.offsetTop;
                floatingComment.style.top = `${lineTop}px`;

                floatingContainer.appendChild(floatingComment);
                commentsForThisLine.push(floatingComment);
            });

            if (commentsForThisLine.length > 0) {
                line.addEventListener('mouseover', () => {
                    commentsForThisLine.forEach(comment => comment.classList.add('visible'));
                });
                line.addEventListener('mouseout', () => {
                    commentsForThisLine.forEach(comment => comment.classList.remove('visible'));
                });
            }
        });
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        logToOverlay('Script loaded. Window loaded.');
        updateFloatingComments();
        
        const observer = new MutationObserver((mutationsList) => {
            for(let mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Reduce frequency of updates by debouncing
                    clearTimeout(window._floatingCommentsTimeout);
                    window._floatingCommentsTimeout = setTimeout(updateFloatingComments, 100);
                    break;
                }
            }
        });

        observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    });
}
