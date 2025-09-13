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
            <div class="context-menu-item" data-action="chat">
                <span class="context-menu-icon">🤖</span>
                <span class="context-menu-text">AI对话分析</span>
            </div>
            <div class="context-menu-item" data-action="knowledge">
                <span class="context-menu-icon">📚</span>
                <span class="context-menu-text">添加到知识库</span>
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

    // 创建窗口管理器
    if (!window.floatingWindowManager) {
        window.floatingWindowManager = {
            windows: new Map(),
            nextId: 1,
            zIndexCounter: 3000,
            
            createWindow(type, title, content, options = {}) {
                const windowId = this.nextId++;
                const window = document.createElement('div');
                window.className = `floating-window floating-window-${type}`;
                window.id = `floating-window-${windowId}`;
                window.style.zIndex = ++this.zIndexCounter;
                
                const { width = '400px', height = '600px' } = options;
                
                window.innerHTML = `
                    <div class="floating-window-header">
                        <h3 class="floating-window-title">${title}</h3>
                        <div class="floating-window-controls">
                            <button class="floating-window-minimize" aria-label="最小化">−</button>
                            <button class="floating-window-close" aria-label="关闭">&times;</button>
                        </div>
                    </div>
                    <div class="floating-window-body">
                        ${content}
                    </div>
                `;
                
                // 设置窗口大小和位置
                window.style.width = width;
                window.style.height = height;
                
                const position = this.getNextWindowPosition();
                window.style.left = position.x + 'px';
                window.style.top = position.y + 'px';
                
                document.body.appendChild(window);
                this.windows.set(windowId, { element: window, type, minimized: false });
                
                // 添加拖拽功能
                this.makeDraggable(window);
                
                // 添加事件监听
                this.setupWindowEvents(window, windowId);
                
                return windowId;
            },
            
            getNextWindowPosition() {
                const windowCount = this.windows.size;
                const offsetX = (windowCount % 5) * 50;
                const offsetY = (windowCount % 5) * 50;
                
                return {
                    x: 100 + offsetX,
                    y: 100 + offsetY
                };
            },
            
            makeDraggable(windowElement) {
                const header = windowElement.querySelector('.floating-window-header');
                let isDragging = false;
                let currentX;
                let currentY;
                let initialX;
                let initialY;
                let xOffset = 0;
                let yOffset = 0;
                
                header.addEventListener('mousedown', (e) => {
                    if (e.target.classList.contains('floating-window-close') || 
                        e.target.classList.contains('floating-window-minimize')) return;
                    
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                    
                    if (e.target === header || e.target.classList.contains('floating-window-title')) {
                        isDragging = true;
                        windowElement.style.zIndex = ++this.zIndexCounter;
                    }
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (isDragging) {
                        e.preventDefault();
                        currentX = e.clientX - initialX;
                        currentY = e.clientY - initialY;
                        
                        xOffset = currentX;
                        yOffset = currentY;
                        
                        windowElement.style.left = currentX + 'px';
                        windowElement.style.top = currentY + 'px';
                    }
                });
                
                document.addEventListener('mouseup', () => {
                    isDragging = false;
                });
            },
            
            setupWindowEvents(windowElement, windowId) {
                const closeBtn = windowElement.querySelector('.floating-window-close');
                const minimizeBtn = windowElement.querySelector('.floating-window-minimize');
                
                closeBtn.addEventListener('click', () => {
                    this.closeWindow(windowId);
                });
                
                minimizeBtn.addEventListener('click', () => {
                    this.toggleMinimize(windowId);
                });
                
                // 点击窗口时提升层级
                windowElement.addEventListener('mousedown', () => {
                    windowElement.style.zIndex = ++this.zIndexCounter;
                });
            },
            
            closeWindow(windowId) {
                const windowData = this.windows.get(windowId);
                if (windowData) {
                    windowData.element.remove();
                    this.windows.delete(windowId);
                }
            },
            
            toggleMinimize(windowId) {
                const windowData = this.windows.get(windowId);
                if (windowData) {
                    const body = windowData.element.querySelector('.floating-window-body');
                    if (windowData.minimized) {
                        body.style.display = 'block';
                        windowData.minimized = false;
                    } else {
                        body.style.display = 'none';
                        windowData.minimized = true;
                    }
                }
            }
        };
    }

    // 创建AI配置面板
    if (!document.getElementById('ai-config-panel')) {
        const aiConfigPanel = document.createElement('div');
        aiConfigPanel.id = 'ai-config-panel';
        aiConfigPanel.innerHTML = `
            <div class="ai-config-content">
                <h3>AI配置</h3>
                <div class="ai-config-section">
                    <label for="gemini-api-key">Gemini API Key:</label>
                    <input type="password" id="gemini-api-key" placeholder="输入您的Gemini API Key">
                </div>
                <div class="ai-config-section">
                    <label for="gemini-model">模型选择:</label>
                    <select id="gemini-model">
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (实验)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                    </select>
                </div>
                <div class="ai-config-section">
                    <label>
                        <input type="checkbox" id="enable-search"> 启用网络搜索
                    </label>
                </div>
                <div class="ai-config-section">
                    <label>
                        <input type="checkbox" id="enable-web-context"> 启用网页上下文
                    </label>
                </div>
                <div class="ai-config-section">
                    <label>
                        <input type="checkbox" id="enable-code-execution"> 启用代码执行
                    </label>
                </div>
                <div class="ai-config-actions">
                    <button id="save-ai-config">保存配置</button>
                    <button id="test-ai-connection">测试连接</button>
                </div>
            </div>
        `;
        document.body.appendChild(aiConfigPanel);
    }

    // 创建知识库管理面板
    if (!document.getElementById('knowledge-panel')) {
        const knowledgePanel = document.createElement('div');
        knowledgePanel.id = 'knowledge-panel';
        knowledgePanel.innerHTML = `
            <div class="knowledge-content">
                <h3>知识库管理</h3>
                <div class="knowledge-stats">
                    <div class="stat-item">
                        <span class="stat-label">文档数量:</span>
                        <span id="knowledge-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">总大小:</span>
                        <span id="knowledge-size">0 KB</span>
                    </div>
                </div>
                <div class="knowledge-actions">
                    <button id="refresh-knowledge">刷新统计</button>
                    <button id="clear-knowledge" class="danger">清空知识库</button>
                    <button id="export-knowledge">导出知识库</button>
                </div>
                <div class="knowledge-list">
                    <h4>最近添加的文档:</h4>
                    <ul id="recent-knowledge"></ul>
                </div>
            </div>
        `;
        document.body.appendChild(knowledgePanel);
    }

    // 创建设置按钮
    if (!document.getElementById('floating-settings-btn')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'floating-settings-btn';
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.title = 'AI设置';
        document.body.appendChild(settingsBtn);
        
        settingsBtn.addEventListener('click', () => {
            const configPanel = document.getElementById('ai-config-panel');
            configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';
        });
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

    // 显示预览弹窗 (现在作为浮动窗口)
    const showPreviewWindow = (url) => {
        const content = `
            <div class="preview-loading">加载中...</div>
            <iframe class="preview-iframe" style="display: none;"></iframe>
            <div class="preview-footer">
                <button class="preview-visit-btn">访问原页面</button>
            </div>
        `;
        
        const windowId = window.floatingWindowManager.createWindow(
            'preview', 
            `预览: ${new URL(url).pathname}`, 
            content,
            { width: '400px', height: '700px' }
        );
        
        const windowElement = window.floatingWindowManager.windows.get(windowId).element;
        windowElement.classList.add('floating-window-preview');
        
        const iframe = windowElement.querySelector('.preview-iframe');
        const loading = windowElement.querySelector('.preview-loading');
        const visitBtn = windowElement.querySelector('.preview-visit-btn');
        
        visitBtn.onclick = () => {
            window.open(url, '_blank');
        };
        
        iframe.onload = () => {
            loading.style.display = 'none';
            iframe.style.display = 'block';
        };
        
        iframe.onerror = () => {
            loading.textContent = '加载失败 - 可能是由于跨域限制';
            iframe.style.display = 'none';
        };
        
        iframe.src = url;
    };

    // 显示AI对话窗口
    const showAIChatWindow = (url, context) => {
        const content = `
            <div class="ai-chat-container">
                <div class="ai-chat-context">
                    <strong>讨论文档:</strong> ${new URL(url).pathname}
                </div>
                <div class="ai-chat-messages" id="ai-chat-messages"></div>
                <div class="ai-chat-input-container">
                    <textarea id="ai-chat-input" placeholder="输入您的问题..." rows="3"></textarea>
                    <button id="ai-chat-send">发送</button>
                </div>
            </div>
        `;
        
        const windowId = window.floatingWindowManager.createWindow(
            'chat', 
            '🤖 AI对话', 
            content,
            { width: '450px', height: '600px' }
        );
        
        const windowElement = window.floatingWindowManager.windows.get(windowId).element;
        setupAIChatWindow(windowElement, url, context);
    };

    // 显示知识库管理窗口
    const showKnowledgeWindow = (url) => {
        const content = `
            <div class="knowledge-content">
                <div class="knowledge-stats">
                    <div class="stat-item">
                        <span class="stat-label">文档数量:</span>
                        <span id="knowledge-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">总大小:</span>
                        <span id="knowledge-size">0 KB</span>
                    </div>
                </div>
                <div class="knowledge-actions">
                    <button id="add-to-knowledge">添加当前页面到知识库</button>
                    <button id="refresh-knowledge">刷新统计</button>
                    <button id="clear-knowledge" class="danger">清空知识库</button>
                    <button id="export-knowledge">导出知识库</button>
                </div>
                <div class="knowledge-list">
                    <h4>最近添加的文档:</h4>
                    <ul id="recent-knowledge"></ul>
                </div>
            </div>
        `;
        
        const windowId = window.floatingWindowManager.createWindow(
            'knowledge', 
            '📚 知识库管理', 
            content,
            { width: '400px', height: '500px' }
        );
        
        const windowElement = window.floatingWindowManager.windows.get(windowId).element;
        setupKnowledgeWindow(windowElement, url);
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
                    showPreviewWindow(url);
                    break;
                case 'chat':
                    showAIChatWindow(url, currentContextTarget.textContent);
                    break;
                case 'knowledge':
                    showKnowledgeWindow(url);
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

    // AI和知识库功能
    function setupAIChatWindow(windowElement, url, context) {
        const messagesContainer = windowElement.querySelector('#ai-chat-messages');
        const chatInput = windowElement.querySelector('#ai-chat-input');
        const sendButton = windowElement.querySelector('#ai-chat-send');

        // 添加初始消息
        addMessage(messagesContainer, 'system', `正在分析文档: ${url}`);

        const sendMessage = async () => {
            const message = chatInput.value.trim();
            if (!message) return;

            chatInput.value = '';
            addMessage(messagesContainer, 'user', message);
            addMessage(messagesContainer, 'assistant', '思考中...', true);

            try {
                const response = await callGeminiAPI(message, url, context);
                updateLastMessage(messagesContainer, response);
            } catch (error) {
                updateLastMessage(messagesContainer, `错误: ${error.message}`);
            }
        };

        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    function setupKnowledgeWindow(windowElement, url) {
        const addButton = windowElement.querySelector('#add-to-knowledge');
        const refreshButton = windowElement.querySelector('#refresh-knowledge');
        const clearButton = windowElement.querySelector('#clear-knowledge');

        if (addButton) {
            addButton.addEventListener('click', async () => {
                await addToKnowledgeBase(url);
                updateKnowledgeStats(windowElement);
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                updateKnowledgeStats(windowElement);
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', async () => {
                if (confirm('确定要清空知识库吗？此操作不可撤销。')) {
                    await clearKnowledgeBase();
                    updateKnowledgeStats(windowElement);
                }
            });
        }

        updateKnowledgeStats(windowElement);
    }

    function addMessage(container, role, content, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role}`;
        if (isLoading) messageDiv.classList.add('loading');
        
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    function updateLastMessage(container, content) {
        const lastMessage = container.querySelector('.message:last-child .message-content');
        if (lastMessage) {
            lastMessage.textContent = content;
            lastMessage.parentElement.classList.remove('loading');
        }
    }

    async function callGeminiAPI(message, url, context) {
        const apiKey = localStorage.getItem('gemini-api-key');
        if (!apiKey) {
            throw new Error('请先在设置中配置Gemini API Key');
        }

        const model = localStorage.getItem('gemini-model') || 'gemini-1.5-flash';
        const enableSearch = localStorage.getItem('enable-search') === 'true';
        const enableWebContext = localStorage.getItem('enable-web-context') === 'true';
        const enableCodeExecution = localStorage.getItem('enable-code-execution') === 'true';

        const requestBody = {
            contents: [{
                parts: [{
                    text: `基于以下文档内容回答问题：
                    
文档URL: ${url}
文档上下文: ${context}

用户问题: ${message}

请提供详细和准确的回答。`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        // 添加工具配置
        if (enableSearch || enableWebContext || enableCodeExecution) {
            requestBody.tools = [];
            
            if (enableSearch) {
                requestBody.tools.push({
                    googleSearchRetrieval: {}
                });
            }
            
            if (enableCodeExecution) {
                requestBody.tools.push({
                    codeExecution: {}
                });
            }
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('API返回格式错误');
        }
    }

    // 初始化pglite数据库
    async function initKnowledgeBase() {
        try {
            // 动态导入pglite
            const { PGlite } = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite@latest/dist/index.js');
            
            if (!window.db) {
                window.db = new PGlite();
                
                // 创建知识库表
                await window.db.exec(`
                    CREATE EXTENSION IF NOT EXISTS vector;
                    
                    CREATE TABLE IF NOT EXISTS knowledge_base (
                        id SERIAL PRIMARY KEY,
                        url TEXT UNIQUE NOT NULL,
                        title TEXT,
                        content TEXT,
                        embedding vector(768),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX IF NOT EXISTS knowledge_embedding_idx 
                    ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
                `);
            }
        } catch (error) {
            console.error('初始化知识库失败:', error);
        }
    }

    async function addToKnowledgeBase(url) {
        await initKnowledgeBase();
        
        try {
            // 获取页面内容
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const title = doc.title || url;
            const content = doc.body.textContent || '';
            
            // 生成嵌入向量
            const embedding = await generateEmbedding(content);
            
            // 存储到数据库
            await window.db.exec(`
                INSERT INTO knowledge_base (url, title, content, embedding)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (url) DO UPDATE SET
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    created_at = CURRENT_TIMESTAMP
            `, [url, title, content, `[${embedding.join(',')}]`]);
            
            console.log('已添加到知识库:', title);
        } catch (error) {
            console.error('添加到知识库失败:', error);
            throw error;
        }
    }

    async function generateEmbedding(text) {
        const apiKey = localStorage.getItem('gemini-api-key');
        if (!apiKey) {
            throw new Error('需要Gemini API Key来生成嵌入');
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: {
                    parts: [{
                        text: text.substring(0, 10000) // 限制长度
                    }]
                }
            })
        });

        if (!response.ok) {
            throw new Error(`嵌入生成失败: ${response.status}`);
        }

        const data = await response.json();
        return data.embedding.values;
    }

    async function clearKnowledgeBase() {
        await initKnowledgeBase();
        await window.db.exec('DELETE FROM knowledge_base');
    }

    async function updateKnowledgeStats(windowElement) {
        await initKnowledgeBase();
        
        try {
            const result = await window.db.query('SELECT COUNT(*) as count, SUM(LENGTH(content)) as total_size FROM knowledge_base');
            const stats = result.rows[0];
            
            const countElement = windowElement.querySelector('#knowledge-count');
            const sizeElement = windowElement.querySelector('#knowledge-size');
            
            if (countElement) countElement.textContent = stats.count || '0';
            if (sizeElement) {
                const sizeKB = Math.round((stats.total_size || 0) / 1024);
                sizeElement.textContent = `${sizeKB} KB`;
            }
            
            // 更新最近文档列表
            const recentResult = await window.db.query('SELECT title, url, created_at FROM knowledge_base ORDER BY created_at DESC LIMIT 5');
            const recentList = windowElement.querySelector('#recent-knowledge');
            
            if (recentList) {
                recentList.innerHTML = recentResult.rows.map(row => 
                    `<li><a href="${row.url}" target="_blank">${row.title}</a> <small>(${new Date(row.created_at).toLocaleDateString()})</small></li>`
                ).join('');
            }
        } catch (error) {
            console.error('更新知识库统计失败:', error);
        }
    }

    async function testAIConnection() {
        try {
            const response = await callGeminiAPI('测试连接', '', '测试上下文');
            alert('连接成功！AI回复: ' + response.substring(0, 100) + '...');
        } catch (error) {
            alert('连接失败: ' + error.message);
        }
    }

    // 保存AI配置
    document.addEventListener('click', (e) => {
        if (e.target.id === 'save-ai-config') {
            const apiKey = document.getElementById('gemini-api-key').value;
            const model = document.getElementById('gemini-model').value;
            const enableSearch = document.getElementById('enable-search').checked;
            const enableWebContext = document.getElementById('enable-web-context').checked;
            const enableCodeExecution = document.getElementById('enable-code-execution').checked;
            
            localStorage.setItem('gemini-api-key', apiKey);
            localStorage.setItem('gemini-model', model);
            localStorage.setItem('enable-search', enableSearch);
            localStorage.setItem('enable-web-context', enableWebContext);
            localStorage.setItem('enable-code-execution', enableCodeExecution);
            
            alert('配置已保存');
        }
        
        if (e.target.id === 'test-ai-connection') {
            testAIConnection();
        }
    });

    // 加载保存的配置
    document.addEventListener('DOMContentLoaded', () => {
        const apiKeyInput = document.getElementById('gemini-api-key');
        const modelSelect = document.getElementById('gemini-model');
        const searchCheckbox = document.getElementById('enable-search');
        const webContextCheckbox = document.getElementById('enable-web-context');
        const codeExecutionCheckbox = document.getElementById('enable-code-execution');
        
        if (apiKeyInput) apiKeyInput.value = localStorage.getItem('gemini-api-key') || '';
        if (modelSelect) modelSelect.value = localStorage.getItem('gemini-model') || 'gemini-1.5-flash';
        if (searchCheckbox) searchCheckbox.checked = localStorage.getItem('enable-search') === 'true';
        if (webContextCheckbox) webContextCheckbox.checked = localStorage.getItem('enable-web-context') === 'true';
        if (codeExecutionCheckbox) codeExecutionCheckbox.checked = localStorage.getItem('enable-code-execution') === 'true';
    });
}