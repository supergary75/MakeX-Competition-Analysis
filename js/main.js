// 主应用程序逻辑
class MakeXAnalysisApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupGlobalPasteListener();
        this.updateDashboard();
        this.showInitialTips();
    }

    // 显示初始提示
    showInitialTips() {
        // 检查是否已显示过提示
        if (localStorage.getItem('shownPasteTips')) return;

        setTimeout(() => {
            const hint = document.getElementById('pasteHint');
            if (hint) {
                hint.style.display = 'block';
                hint.innerHTML += '<br><small>💡 快捷键：Ctrl+Shift+V 可以从剪贴板快速导入数据</small>';
            }

            // 30秒后隐藏提示
            setTimeout(() => {
                if (hint) hint.style.display = 'none';
            }, 10000);

            localStorage.setItem('shownPasteTips', 'true');
        }, 500);

        // 为帮助模态框添加事件监听
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) {
                    helpModal.style.display = 'none';
                }
            });

            // 按 Escape 键关闭
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && helpModal.style.display === 'flex') {
                    helpModal.style.display = 'none';
                }
            });
        }
    }

    // 全局监听粘贴事件
    setupGlobalPasteListener() {
        // 监听全局粘贴事件
        document.addEventListener('paste', (e) => {
            this.handleGlobalPaste(e);
        });

        // 监听快捷键 Ctrl+Shift+V / Cmd+Shift+V 快速导入
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.quickImportClipboard();
            }
        });
    }

    // 快速从剪贴板导入
    async quickImportClipboard() {
        try {
            // 方法1：使用新的 Clipboard API（推荐，但需要HTTPS和用户授权）
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && this.isDataFormat(text)) {
                        this.showPasteNotification(text);
                    } else {
                        this.showAlert('剪贴板中没有可识别的数据格式', 'warning');
                    }
                } catch (clipboardError) {
                    console.warn('Clipboard API 被拒绝或不可用:', clipboardError);
                    this.promptClipboardAccess();
                }
            } else {
                // 方法2：如果不支持 Clipboard API，提供手动方式
                this.promptClipboardAccess();
            }
        } catch (error) {
            console.error('Error handling clipboard:', error);
            this.promptClipboardAccess();
        }
    }

    // 提示用户手动粘贴
    promptClipboardAccess() {
        // 由于浏览器安全限制，直接读取剪贴板不被允许
        // 提供替代方案
        const modal = document.createElement('div');
        modal.id = 'clipboardPromptModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);';
        contentDiv.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #1f2937;">🔐 浏览器安全限制</h3>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 0.95em;">出于安全考虑，您的浏览器不允许网页直接读取剪贴板。</p>
            </div>

            <p style="color: #6b7280; margin-bottom: 15px;">请选择以下方式之一：</p>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                <button id="clipboardManualBtn" style="padding: 12px 15px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; text-align: left;">
                    <strong>✓ 手动粘贴（推荐）</strong>
                    <br><small style="font-weight: 400;">切换到"粘贴数据"标签页，Ctrl+V 粘贴数据</small>
                </button>
                <button id="clipboardCreateTextareaBtn" style="padding: 12px 15px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; text-align: left;">
                    <strong>✓ 创建临时输入框</strong>
                    <br><small style="font-weight: 400;">创建一个输入框来粘贴数据</small>
                </button>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="clipboardCloseBtn" style="padding: 10px 20px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">关闭</button>
            </div>
        `;

        modal.appendChild(contentDiv);
        document.body.appendChild(modal);

        // 添加事件监听器
        document.getElementById('clipboardCloseBtn').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('clipboardManualBtn').addEventListener('click', () => {
            modal.remove();
            this.switchTab('upload');
            this.switchUploadTab('paste');
            document.getElementById('pasteDataArea')?.focus();
        });

        document.getElementById('clipboardCreateTextareaBtn').addEventListener('click', () => {
            modal.remove();
            this.createTemporaryInputDialog();
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 创建临时输入框用于粘贴
    createTemporaryInputDialog() {
        const modal = document.createElement('div');
        modal.id = 'temporaryInputModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);';
        contentDiv.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #1f2937;">📋 在此粘贴你的数据</h3>
            
            <p style="color: #6b7280; margin-bottom: 15px;">按 <strong>Ctrl+V</strong> (或 <strong>Cmd+V</strong>) 粘贴你的数据，然后点击导入</p>

            <textarea id="temporaryInputArea" placeholder="点击这里，然后按 Ctrl+V 粘贴数据..." style="width: 100%; height: 250px; padding: 12px; border: 2px solid #3b82f6; border-radius: 8px; font-size: 1em; font-family: monospace; margin-bottom: 15px; resize: vertical;"></textarea>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="tempInputCancelBtn" style="padding: 10px 20px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">取消</button>
                <button id="tempInputImportBtn" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">导入数据</button>
            </div>
        `;

        modal.appendChild(contentDiv);
        document.body.appendChild(modal);

        const textareaEl = document.getElementById('temporaryInputArea');
        
        // 自动获得焦点
        textareaEl.focus();

        // 监听粘贴事件
        textareaEl.addEventListener('paste', () => {
            setTimeout(() => {
                const data = textareaEl.value.trim();
                if (data && this.isDataFormat(data)) {
                    document.getElementById('tempInputImportBtn').textContent = '✓ 数据已检测，点击导入';
                    document.getElementById('tempInputImportBtn').style.background = '#10b981';
                }
            }, 10);
        });

        document.getElementById('tempInputCancelBtn').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('tempInputImportBtn').addEventListener('click', () => {
            const data = textareaEl.value.trim();
            if (data) {
                this.importPastedData(data);
                modal.remove();
            } else {
                this.showAlert('请先粘贴数据', 'warning');
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 显示提示信息
    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        alert.textContent = message;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }

    // 处理全局粘贴事件
    async handleGlobalPaste(e) {
        try {
            // 获取剪贴板内容
            const text = e.clipboardData?.getData('text') || '';
            
            if (!text || text.length === 0) return;

            // 检查是否在输入框中粘贴
            const activeElement = document.activeElement;
            const isInInputField = activeElement.tagName === 'TEXTAREA' || 
                                  activeElement.tagName === 'INPUT' ||
                                  activeElement.contentEditable === 'true';

            // 如果在输入框中，让系统默认处理
            if (isInInputField) return;

            // 在其他地方粘贴，检查是否是数据格式
            if (this.isDataFormat(text)) {
                e.preventDefault();
                this.showPasteNotification(text);
            }
        } catch (error) {
            console.error('Error handling paste:', error);
            // 全局粘贴的错误可以忽略，不影响用户体验
        }
    }

    // 检查是否是可识别的数据格式
    isDataFormat(text) {
        const trimmed = text.trim();
        
        // 检查 JSON
        if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.endsWith('}') || trimmed.endsWith(']')) {
            return true;
        }
        
        // 检查 TSV（制表符）
        if (trimmed.includes('\t') && trimmed.includes('\n')) {
            return true;
        }
        
        // 检查 CSV
        if (trimmed.includes(',') && trimmed.includes('\n')) {
            return true;
        }
        
        // 检查多行文本
        if (trimmed.split('\n').length >= 2) {
            return true;
        }
        
        return false;
    }

    // 显示粘贴通知对话框
    showPasteNotification(content) {
        const modal = document.createElement('div');
        modal.id = 'pasteNotificationModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const dataPreview = this.getDataPreview(content);
        const dataType = this.detectDataType(content);

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);';
        contentDiv.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #1f2937;">📋 检测到数据内容</h3>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 0.9em;"><strong>数据类型：</strong> ${dataType}</p>
                <div style="background: white; padding: 10px; border-radius: 4px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 0.85em; color: #374151; white-space: pre-wrap; word-break: break-word;">
${this.escapeHtml(dataPreview)}
                </div>
            </div>

            <p style="color: #6b7280; margin-bottom: 20px; font-size: 0.95em;">是否导入这些数据？</p>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="pasteModalCancel" style="padding: 10px 20px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">取消</button>
                <button id="pasteModalConfirm" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">导入数据</button>
            </div>
        `;

        modal.appendChild(contentDiv);
        document.body.appendChild(modal);

        // 添加事件监听器
        document.getElementById('pasteModalCancel').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('pasteModalConfirm').addEventListener('click', () => {
            this.importPastedData(content);
            modal.remove();
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // HTML 转义函数
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // 获取数据预览
    getDataPreview(content, maxLength = 200) {
        if (content.length > maxLength) {
            return content.substring(0, maxLength) + '...\n[数据已截断]';
        }
        return content;
    }

    // 检测数据类型
    detectDataType(content) {
        const trimmed = content.trim();
        
        if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && 
            (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
            return '📄 JSON 格式';
        }
        
        if (trimmed.includes('\t')) {
            return '📊 表格数据（TSV/金山表格）';
        }
        
        if (trimmed.includes(',')) {
            return '📋 CSV 格式';
        }
        
        return '📝 文本数据';
    }

    // 导入粘贴的数据
    importPastedData(content) {
        try {
            // 切换到数据上传标签
            document.getElementById('pasteDataArea').value = content;
            this.switchTab('upload');
            this.switchUploadTab('paste');
            
            // 自动导入
            setTimeout(() => {
                this.parsePasteData();
            }, 300);
        } catch (error) {
            console.error('Error importing pasted data:', error);
        }
    }

    setupEventListeners() {
        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 搜索和过滤
        document.getElementById('teamSearch')?.addEventListener('input', (e) => this.filterTeams(e.target.value));
        document.getElementById('matchSearch')?.addEventListener('input', (e) => this.filterMatches(e.target.value));
        document.getElementById('sortBy')?.addEventListener('change', (e) => this.sortTeams(e.target.value));

        // 上传功能
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea?.addEventListener('click', () => fileInput?.click());
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.backgroundColor = 'rgba(37, 99, 235, 0.15)';
        });
        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
        });
        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // 按钮事件
        document.getElementById('loadSampleBtn')?.addEventListener('click', () => this.loadSampleData());
        document.getElementById('clearDataBtn')?.addEventListener('click', () => this.clearAllData());

        // 上传标签页切换
        document.querySelectorAll('.upload-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchUploadTab(e.target.dataset.uploadType));
        });

        // 粘贴数据功能
        document.getElementById('parsePasteBtn')?.addEventListener('click', () => this.parsePasteData());
        document.getElementById('quickPasteBtn')?.addEventListener('click', () => this.createTemporaryInputDialog());
        document.getElementById('clearPasteBtn')?.addEventListener('click', () => {
            document.getElementById('pasteDataArea').value = '';
            document.getElementById('pasteStatus').className = 'upload-status';
        });

        // 粘贴数据区域的快速粘贴
        document.getElementById('pasteDataArea')?.addEventListener('paste', (e) => {
            // 延迟处理，让文本先粘贴到textarea
            setTimeout(() => {
                const content = document.getElementById('pasteDataArea').value;
                if (content.trim()) {
                    // 显示检测到数据的提示
                    const hint = document.getElementById('pasteDataArea').parentElement;
                    const existingHint = hint.querySelector('.paste-hint');
                    if (!existingHint) {
                        const hintDiv = document.createElement('div');
                        hintDiv.className = 'paste-hint';
                        hintDiv.style.cssText = 'background: #dbeafe; color: #0c4a6e; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 0.9em;';
                        hintDiv.innerHTML = '✓ 检测到数据，请点击"导入数据"按钮导入';
                        hint.appendChild(hintDiv);
                        setTimeout(() => hintDiv.remove(), 5000);
                    }
                }
            }, 10);
        });

        // 排行榜功能
        document.getElementById('refreshRankingBtn')?.addEventListener('click', () => this.updateRanking());
        document.getElementById('autoRefreshToggle')?.addEventListener('change', (e) => this.toggleAutoRefresh(e.target.checked));
        document.getElementById('sortByWinLoss')?.addEventListener('change', (e) => this.updateRanking(e.target.value));
        document.getElementById('dataSourceBtn')?.addEventListener('click', () => this.showDataSourceSettings());
        document.getElementById('manageFavoritesBtn')?.addEventListener('click', () => this.manageFavorites());

        // 淘汰赛预测功能
        document.getElementById('generateBracketBtn')?.addEventListener('click', () => this.generateElimination());
        document.getElementById('readAllianceClipboardBtn')?.addEventListener('click', () => this.readAllianceClipboardAndGenerate());
        document.getElementById('bracketTypeSelect')?.addEventListener('change', (e) => {
            const topN = e.target.value === 'top4' ? 4 : (e.target.value === 'top8' ? 8 : 16);
            this.generateElimination(topN);
        });
    }

    switchTab(tabName) {
        // 移除所有活跃的标签
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 激活选中的标签
        document.getElementById(tabName)?.classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        this.currentTab = tabName;

        // 根据标签页更新内容
        if (tabName === 'teams') {
            this.updateTeamsTable();
        } else if (tabName === 'matches') {
            this.updateMatchesList();
        } else if (tabName === 'ranking') {
            this.updateRanking();
        } else if (tabName === 'prediction') {
            this.updatePredictionPage();
        } else if (tabName === 'dashboard') {
            this.updateDashboard();
        }
    }

    updateDashboard() {
        const stats = dataManager.getOverallStats();
        document.getElementById('totalTeams').textContent = stats.totalTeams;
        document.getElementById('totalMatches').textContent = stats.totalMatches;
        document.getElementById('avgScore').textContent = stats.avgScore;
        document.getElementById('maxScore').textContent = stats.maxScore;
        this.updateEPARankingTable();

        chartsManager.updateAllCharts();
    }

    updateEPARankingTable() {
        const tbody = document.getElementById('epaRankingBody');
        if (!tbody) return;

        const ranking = dataManager.getEPARanking();
        if (!ranking.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">暂无EPA数据</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        ranking.forEach((team) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${team.rank}</strong></td>
                <td>${team.name}</td>
                <td><strong>${team.epa}</strong></td>
                <td>${team.matches}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateTeamsTable() {
        const tbody = document.getElementById('teamsTableBody');
        if (!tbody) return;

        const stats = dataManager.getTeamStats();
        tbody.innerHTML = '';

        if (stats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">暂无队伍数据</td></tr>';
            return;
        }

        stats.forEach((team, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td>${team.name}</td>
                <td><strong>${team.totalScore}</strong></td>
                <td>${team.matches}</td>
                <td>${team.avgScore}</td>
                <td>${team.highestScore}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateMatchesList() {
        const matchesList = document.getElementById('matchesList');
        if (!matchesList) return;

        const matches = dataManager.matches.slice().reverse();
        matchesList.innerHTML = '';

        if (matches.length === 0) {
            matchesList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">暂无比赛数据</p>';
            return;
        }

        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <h4>${match.teamName}</h4>
                <div class="match-details">
                    <div class="match-detail">
                        <label>总分</label>
                        <value>${match.score}</value>
                    </div>
                    <div class="match-detail">
                        <label>类别</label>
                        <value>${this.getCategoryName(match.category)}</value>
                    </div>
                    <div class="match-detail">
                        <label>日期</label>
                        <value>${match.date}</value>
                    </div>
                    <div class="match-detail">
                        <label>自动期</label>
                        <value>${match.details?.auto || 'N/A'}</value>
                    </div>
                    <div class="match-detail">
                        <label>遥控期</label>
                        <value>${match.details?.tele || 'N/A'}</value>
                    </div>
                    <div class="match-detail">
                        <label>结束期</label>
                        <value>${match.details?.endgame || 'N/A'}</value>
                    </div>
                </div>
            `;
            matchesList.appendChild(matchCard);
        });
    }

    filterTeams(keyword) {
        const tbody = document.getElementById('teamsTableBody');
        if (!tbody) return;

        const filtered = dataManager.searchTeams(keyword);
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">没有找到匹配的队伍</td></tr>';
            return;
        }

        filtered.forEach((team, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td>${team.name}</td>
                <td><strong>${team.totalScore}</strong></td>
                <td>${team.matches}</td>
                <td>${team.avgScore}</td>
                <td>${team.highestScore}</td>
            `;
            tbody.appendChild(row);
        });
    }

    sortTeams(sortBy) {
        const stats = dataManager.getTeamStats();
        const tbody = document.getElementById('teamsTableBody');
        if (!tbody) return;

        let sorted = [...stats];
        if (sortBy === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'matches') {
            sorted.sort((a, b) => b.matches - a.matches);
        }

        tbody.innerHTML = '';
        sorted.forEach((team, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td>${team.name}</td>
                <td><strong>${team.totalScore}</strong></td>
                <td>${team.matches}</td>
                <td>${team.avgScore}</td>
                <td>${team.highestScore}</td>
            `;
            tbody.appendChild(row);
        });
    }

    filterMatches(keyword) {
        const matchesList = document.getElementById('matchesList');
        if (!matchesList) return;

        const filtered = dataManager.searchMatches(keyword);
        matchesList.innerHTML = '';

        if (filtered.length === 0) {
            matchesList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">没有找到匹配的比赛</p>';
            return;
        }

        filtered.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <h4>${match.teamName}</h4>
                <div class="match-details">
                    <div class="match-detail">
                        <label>总分</label>
                        <value>${match.score}</value>
                    </div>
                    <div class="match-detail">
                        <label>类别</label>
                        <value>${this.getCategoryName(match.category)}</value>
                    </div>
                    <div class="match-detail">
                        <label>日期</label>
                        <value>${match.date}</value>
                    </div>
                </div>
            `;
            matchesList.appendChild(matchCard);
        });
    }

    handleFileUpload(file) {
        const reader = new FileReader();
        const statusDiv = document.getElementById('uploadStatus');

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    dataManager.importJSON(data);
                    this.showUploadStatus('数据导入成功！', 'success');
                    this.updateDashboard();
                } else if (file.name.endsWith('.csv')) {
                    this.parseCSV(content);
                    this.showUploadStatus('CSV 数据导入成功！', 'success');
                    this.updateDashboard();
                } else {
                    this.showUploadStatus('不支持的文件格式', 'error');
                }
            } catch (error) {
                this.showUploadStatus('文件解析失败：' + error.message, 'error');
            }
        };

        reader.readAsText(file);
    }

    parseCSV(csv) {
        // 改进的CSV解析 - 支持样例站战队汇总格式与明细格式
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const looksCompetitive = headers.some(h =>
            h.includes('wins') || h.includes('胜场') || h.includes('losses') || h.includes('负场') || h.includes('points') || h.includes('积分')
        );

        if (looksCompetitive && headers.length >= 4) {
            const teams = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length < 4) continue;

                teams.push({
                    team: values[0],
                    wins: parseInt(values[1], 10) || 0,
                    losses: parseInt(values[2], 10) || 0,
                    points: parseInt(values[3], 10) || 0,
                    totalScore: parseInt(values[4], 10) || 0,
                    netScore: parseInt(values[5], 10) || 0,
                    matches: parseInt(values[6], 10) || 0
                });
            }

            if (teams.length > 0) {
                dataManager.importCompetitiveTeams(teams);
                return;
            }
        }
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const rowData = {};
                
                headers.forEach((header, idx) => {
                    rowData[header] = values[idx] || '';
                });

                this.addMatchFromRowData(rowData);
            }
        }
    }

    showUploadStatus(message, type) {
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.textContent = message;
        statusDiv.className = `upload-status ${type}`;
        setTimeout(() => {
            statusDiv.className = 'upload-status';
        }, 5000);
    }

    loadSampleData() {
        dataManager.loadSampleData();
        this.updateDashboard();
        this.updateTeamsTable();
        this.updateMatchesList();
        this.showUploadStatus('示例数据已加载！', 'success');
    }

    clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作无法撤销。')) {
            dataManager.clearAllData();
            this.updateDashboard();
            this.updateTeamsTable();
            this.updateMatchesList();
            this.showUploadStatus('所有数据已清除', 'success');
        }
    }

    getCategoryName(category) {
        const names = {
            'auto': '自动期',
            'tele': '遥控期',
            'endgame': '结束期'
        };
        return names[category] || category;
    }

    // 排行榜功能
    updateRanking(sortBy = 'composite') {
        const sortSelect = document.getElementById('sortByWinLoss');
        if (sortSelect) {
            sortBy = sortSelect.value;
        }

        const ranking = dataManager.getRankingData(sortBy);
        const tbody = document.getElementById('rankingTableBody');
        
        if (!tbody) return;

        tbody.innerHTML = '';

        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">暂无排名数据</td></tr>';
            this.updateRankingStats();
            return;
        }

        ranking.forEach((team, index) => {
            const row = document.createElement('tr');
            const isFavorite = this.isFavoriteTeam(team.name);
            row.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td><button class="team-detail-btn" style="background:none; border:none; color:#2563eb; text-decoration:underline; cursor:pointer; padding:0; font:inherit;" title="查看该队比赛详情">${team.name}</button></td>
                <td>${team.wins}</td>
                <td>${team.losses}</td>
                <td><strong>${team.totalWinLossScore || 0}</strong></td>
                <td style="color: ${team.netScore > 0 ? '#10b981' : team.netScore < 0 ? '#ef4444' : '#666'}">
                    ${team.netScore > 0 ? '+' : ''}${team.netScore}
                </td>
                <td>${team.totalScore}</td>
                <td>
                    <button class="favorite-btn" onclick="app.toggleFavoriteTeam('${team.name}')" 
                            style="background: ${isFavorite ? '#f59e0b' : 'transparent'}; border: 1px solid #f59e0b; cursor: pointer; padding: 5px 10px; border-radius: 4px;">
                        ${isFavorite ? '★' : '☆'}
                    </button>
                </td>
            `;

            const teamBtn = row.querySelector('.team-detail-btn');
            if (teamBtn) {
                teamBtn.addEventListener('click', () => this.showTeamAllianceMatches(team.name));
            }
            tbody.appendChild(row);
        });

        this.updateRankingStats(ranking);
        this.updateWatchedTeams();
    }

    updateRankingStats(ranking = null) {
        const list = ranking || dataManager.getRankingData('composite');
        const totalTeams = list.length;
        const totalMatches = dataManager.getCompetitiveMatchCount();
        const avgScore = totalTeams > 0
            ? (list.reduce((sum, t) => sum + (t.totalWinLossScore || 0), 0) / totalTeams).toFixed(1)
            : '0';

        document.getElementById('rankingTeams').textContent = totalTeams;
        document.getElementById('totalRankingMatches').textContent = totalMatches;
        document.getElementById('avgRankingScore').textContent = avgScore;
    }

    showTeamAllianceMatches(teamName) {
        const matches = dataManager.getTeamAllianceMatches(teamName);

        const existing = document.getElementById('teamMatchesModal');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'teamMatchesModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1100;';

        const rowsHtml = matches.length === 0
            ? '<tr><td colspan="5" style="text-align:center; padding: 20px;">暂无该队联盟比赛明细</td></tr>'
            : matches.map((m) => {
                const resultColor = m.result === '胜' ? '#10b981' : (m.result === '负' ? '#ef4444' : '#6b7280');
                return `
                    <tr>
                        <td>${m.matchNo || '-'}</td>
                        <td>${m.allies.join(' / ') || '-'}</td>
                        <td>${m.opponents.join(' / ') || '-'}</td>
                        <td>${m.myScore} : ${m.oppScore}</td>
                        <td style="color:${resultColor}; font-weight:600;">${m.result}</td>
                    </tr>
                `;
            }).join('');

        modal.innerHTML = `
            <div style="background:#fff; width:min(900px,92vw); max-height:85vh; overflow:auto; border-radius:12px; padding:20px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 style="margin:0;">${teamName} 已完成比赛</h3>
                    <button id="closeTeamMatchesModalBtn" class="btn btn-secondary">关闭</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>场次</th>
                            <th>盟友</th>
                            <th>对手</th>
                            <th>比分</th>
                            <th>结果</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('closeTeamMatchesModalBtn')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    toggleAutoRefresh(enabled) {
        if (enabled) {
            this.autoRefreshInterval = setInterval(() => {
                if (this.currentTab === 'ranking') {
                    this.updateRanking();
                }
            }, 30000); // 每30秒刷新一次
        } else {
            clearInterval(this.autoRefreshInterval);
        }
    }

    showDataSourceSettings() {
        const dataSource = prompt('请输入数据来源（支持URL或本地路径）：', localStorage.getItem('dataSource') || '');
        if (dataSource !== null) {
            localStorage.setItem('dataSource', dataSource);
            alert('数据来源已更新：' + dataSource);
        }
    }

    manageFavorites() {
        this.showFavoritesModal();
    }

    showFavoritesModal() {
        const favorites = JSON.parse(localStorage.getItem('favoriteTeams') || '[]');
        const teamList = dataManager.teams.map(t => t.name);
        
        let html = '<div style="padding: 20px;"><h3>管理关注战队</h3>';
        html += '<div style="max-height: 400px; overflow-y: auto;">';
        
        teamList.forEach(teamName => {
            const isSelected = favorites.includes(teamName);
            html += `<label style="display: block; margin-bottom: 10px;">
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="app.toggleFavoriteTeam('${teamName}')">
                ${teamName}
            </label>`;
        });
        
        html += '</div><button class="btn btn-primary" onclick="app.closeModal()">关闭</button></div>';
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
        modal.id = 'favoritesModal';
        modal.innerHTML = `<div style="background: white; padding: 20px; border-radius: 12px; max-width: 400px; width: 90%;">${html}</div>`;
        document.body.appendChild(modal);
    }

    closeModal() {
        const modal = document.getElementById('favoritesModal');
        if (modal) modal.remove();
        this.updateWatchedTeams();
    }

    toggleFavoriteTeam(teamName) {
        const favorites = JSON.parse(localStorage.getItem('favoriteTeams') || '[]');
        const index = favorites.indexOf(teamName);
        
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(teamName);
        }
        
        localStorage.setItem('favoriteTeams', JSON.stringify(favorites));
        this.updateWatchedTeams();
        this.updateRanking();
    }

    isFavoriteTeam(teamName) {
        const favorites = JSON.parse(localStorage.getItem('favoriteTeams') || '[]');
        return favorites.includes(teamName);
    }

    updateWatchedTeams() {
        const favorites = JSON.parse(localStorage.getItem('favoriteTeams') || '[]');
        const ranking = dataManager.getRankingData();
        const watchedTeams = ranking.filter(t => favorites.includes(t.name));
        
        const grid = document.getElementById('watchedTeamsGrid');
        if (!grid) return;

        if (watchedTeams.length === 0) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 20px; color: var(--text-secondary);">暂无关注的战队</p>';
            return;
        }

        grid.innerHTML = '';
        watchedTeams.forEach(team => {
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--card-bg); padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary-color); box-shadow: var(--shadow);';
            card.innerHTML = `
                <h4>${team.name}</h4>
                <p style="color: var(--text-secondary); margin: 5px 0;">排名: #${ranking.indexOf(team) + 1}</p>
                <p style="margin: 5px 0;"><strong>${team.totalScore}</strong> 总积分</p>
                <p style="margin: 5px 0; font-size: 0.9em; color: var(--text-secondary);">
                    ${team.wins}胜 ${team.losses}负 | 净胜分: ${team.netScore}
                </p>
            `;
            grid.appendChild(card);
        });
    }

    // 淘汰赛预测功能
    generateElimination(topN = 4) {
        const textarea = document.getElementById('alliancePasteArea');
        const clipboardText = textarea?.value?.trim() || '';

        if (!clipboardText) {
            document.getElementById('bracketContainer').innerHTML =
                '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">请先读取金山联盟剪贴板数据，再进行淘汰赛预测。</p>';
            return;
        }

        const directBattles = this.parseAllianceBattleTSV(clipboardText);
        if (directBattles.length > 0) {
            this.renderAllianceBattleList(directBattles);
            return;
        }

        const alliances = this.parseAllianceSelectionTSV(clipboardText);
        if (alliances.length > 0) {
            const rounds = this.buildAlliancePlayoffRounds(alliances);
            this.renderAlliancePlayoff(rounds);
            return;
        }

        document.getElementById('bracketContainer').innerHTML =
            '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">当前剪贴板内容不是有效联盟数据。请复制“联盟名 + 两支队伍”或“红蓝联盟对战”表格。</p>';
    }

    async readAllianceClipboardAndGenerate() {
        const area = document.getElementById('alliancePasteArea');
        if (!area) return;

        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                alert('剪贴板为空，请先从金山表格复制联盟分组数据。');
                return;
            }

            area.value = text;
            this.generateElimination();
        } catch (error) {
            alert('无法读取剪贴板，请手动粘贴到“联盟分组数据”文本框后再生成。');
        }
    }

    parseAllianceSelectionTSV(tsvContent) {
        const lines = tsvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
        const normalize = (value) => String(value || '').replace(/\s+/g, '').toLowerCase();
        const firstRow = rows[0] || [];
        const normalizedHeaders = firstRow.map(normalize);

        const findIndexByKeywords = (keywords) => {
            for (let i = 0; i < normalizedHeaders.length; i++) {
                const h = normalizedHeaders[i];
                if (!h) continue;
                if (keywords.some((k) => h.includes(k))) {
                    return i;
                }
            }
            return -1;
        };

        const rankIdxFromHeader = findIndexByKeywords(['排名', '序号', 'rank']);
        const allianceIdxFromHeader = findIndexByKeywords(['联盟名称', '联盟名', 'alliance']);
        const team1IdxFromHeader = findIndexByKeywords(['战队1', '队伍1', '1号', '一选', '队长', 'captain']);
        const team2IdxFromHeader = findIndexByKeywords(['战队2', '队伍2', '2号', '二选', '副队', '替补']);

        // 兼容金山表格常见列位（含空列）
        const rankIdx = rankIdxFromHeader >= 0 ? rankIdxFromHeader : 0;
        const allianceIdx = allianceIdxFromHeader >= 0 ? allianceIdxFromHeader : 1;
        const team1Idx = team1IdxFromHeader >= 0 ? team1IdxFromHeader : 4;
        const team2Idx = team2IdxFromHeader >= 0 ? team2IdxFromHeader : 7;

        const startRow = rankIdxFromHeader >= 0 || allianceIdxFromHeader >= 0 || team1IdxFromHeader >= 0 || team2IdxFromHeader >= 0
            ? 1
            : 0;

        const rankingByName = new Map();
        dataManager.getRankingData('composite').forEach(team => {
            rankingByName.set(team.name, team);
        });

        const alliances = [];
        for (let i = startRow; i < rows.length; i++) {
            const r = rows[i];
            if (r.length < Math.max(rankIdx, allianceIdx, team1Idx, team2Idx) + 1) continue;

            const rank = parseInt(r[rankIdx], 10);
            if (Number.isNaN(rank)) continue;

            const allianceName = r[allianceIdx] || `联盟${rank}`;
            const team1 = r[team1Idx] || '';
            const team2 = r[team2Idx] || '';
            if (!team1 || !team2) continue;

            const team1Info = rankingByName.get(team1);
            const team2Info = rankingByName.get(team2);
            const team1Epa = Number(team1Info?.epa || 0);
            const team2Epa = Number(team2Info?.epa || 0);

            alliances.push({
                rank,
                name: allianceName,
                team1,
                team2,
                totalEPA: (team1Epa + team2Epa).toFixed(2)
            });
        }

        alliances.sort((a, b) => a.rank - b.rank);
        return alliances;
    }

    parseAllianceBattleTSV(tsvContent) {
        const lines = tsvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
        const battles = [];

        const normalizeHeader = (value) => String(value || '').replace(/\s+/g, '').toLowerCase();
        const containsHeader = (value, token) => normalizeHeader(value).includes(token);
        const isSubHeaderRow = (red1, red2, blue1, blue2) => {
            return containsHeader(red1, '红方战队1名称')
                && containsHeader(red2, '红方战队2名称')
                && containsHeader(blue1, '蓝方战队1名称')
                && containsHeader(blue2, '蓝方战队2名称');
        };

        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (r.length < 10) continue;

            const red1 = r[3] || '';
            const red2 = r[5] || '';
            const blue1 = r[7] || '';
            const blue2 = r[9] || '';
            if (!red1 || !red2 || !blue1 || !blue2) continue;
            if (isSubHeaderRow(red1, red2, blue1, blue2)) {
                continue;
            }

            const redPoints = parseInt(r[10], 10) || 0;
            const bluePoints = parseInt(r[13], 10) || 0;
            const redName = `红方联盟 ${i}`;
            const blueName = `蓝方联盟 ${i}`;

            battles.push({
                red: { name: redName, team1: red1, team2: red2, points: redPoints },
                blue: { name: blueName, team1: blue1, team2: blue2, points: bluePoints },
                winner: redPoints >= bluePoints ? redName : blueName
            });
        }

        return battles;
    }

    buildAlliancePlayoffRounds(alliances) {
        let currentRound = [...alliances];
        const rounds = [];

        while (currentRound.length > 1) {
            const matches = [];
            const pairCount = Math.floor(currentRound.length / 2);

            for (let i = 0; i < pairCount; i++) {
                const alliance1 = currentRound[i];
                const alliance2 = currentRound[currentRound.length - 1 - i];
                const epa1 = Number(alliance1.totalEPA || 0);
                const epa2 = Number(alliance2.totalEPA || 0);
                const winner = epa1 >= epa2 ? alliance1 : alliance2;

                matches.push({
                    alliance1,
                    alliance2,
                    winner,
                    epaDiff: Math.abs(epa1 - epa2).toFixed(2)
                });
            }

            rounds.push(matches);
            currentRound = matches.map(m => m.winner);
        }

        return rounds;
    }

    renderAlliancePlayoff(rounds) {
        const container = document.getElementById('bracketContainer');
        if (!container) return;

        if (!rounds.length) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">联盟数据不足，无法生成淘汰赛。</p>';
            return;
        }

        const roundNames = ['四分之一决赛', '半决赛', '决赛'];
        let html = '<div style="display:flex; flex-direction:column; gap: 24px;">';

        rounds.forEach((matches, idx) => {
            const title = roundNames[idx] || `第${idx + 1}轮`;
            html += `<div><h4>${title}</h4><div style="display:grid; gap:14px;">`;

            matches.forEach((match, mIndex) => {
                const winnerName = match.winner.name;
                html += `
                    <div style="background: var(--card-bg); border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
                        <p style="margin-bottom: 8px; color: #6b7280;">对阵 ${mIndex + 1} | EPA差值: ${match.epaDiff}</p>
                        <div style="padding: 8px; border-radius: 6px; border: 1px solid ${winnerName === match.alliance1.name ? '#10b981' : '#d1d5db'}; margin-bottom: 8px;">
                            <strong>${match.alliance1.name}</strong> (${match.alliance1.team1} + ${match.alliance1.team2})
                            <span style="float:right;">EPA: ${match.alliance1.totalEPA}</span>
                        </div>
                        <div style="padding: 8px; border-radius: 6px; border: 1px solid ${winnerName === match.alliance2.name ? '#10b981' : '#d1d5db'};">
                            <strong>${match.alliance2.name}</strong> (${match.alliance2.team1} + ${match.alliance2.team2})
                            <span style="float:right;">EPA: ${match.alliance2.totalEPA}</span>
                        </div>
                        <p style="margin-top: 8px; color: #059669;"><strong>预测晋级:</strong> ${winnerName}</p>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderAllianceBattleList(battles) {
        const container = document.getElementById('bracketContainer');
        if (!container) return;

        let html = '<div style="display:flex; flex-direction:column; gap:14px;">';
        html += '<h4>联盟对联盟对战结果</h4>';

        battles.forEach((battle, index) => {
            const redWin = battle.winner === battle.red.name;
            html += `
                <div style="background: var(--card-bg); border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
                    <p style="margin-bottom: 8px;">联盟对战 ${index + 1}</p>
                    <div style="padding: 8px; border-radius: 6px; border: 1px solid ${redWin ? '#10b981' : '#d1d5db'}; margin-bottom: 8px;">
                        <strong>${battle.red.name}</strong> (${battle.red.team1} + ${battle.red.team2})
                        <span style="float:right;">联盟分: ${battle.red.points}</span>
                    </div>
                    <div style="padding: 8px; border-radius: 6px; border: 1px solid ${!redWin ? '#10b981' : '#d1d5db'};">
                        <strong>${battle.blue.name}</strong> (${battle.blue.team1} + ${battle.blue.team2})
                        <span style="float:right;">联盟分: ${battle.blue.points}</span>
                    </div>
                    <p style="margin-top:8px; color:#059669;"><strong>胜方联盟:</strong> ${battle.winner}</p>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    updatePredictionPage() {
        const ranking = dataManager.getRankingData();
        
        // 更新胜率分析图表
        const topTeams = ranking.slice(0, 8);
        const winRates = topTeams.map(team => {
            const totalGames = team.wins + team.losses;
            return totalGames > 0 ? ((team.wins / totalGames) * 100).toFixed(1) : 0;
        });

        this.createPredictionChart(topTeams, winRates);

        const area = document.getElementById('alliancePasteArea');
        if (area && area.value.trim()) {
            this.generateElimination(4);
        } else {
            const container = document.getElementById('bracketContainer');
            if (container) {
                container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">请先从金山表格复制联盟分组数据，再进行淘汰赛预测。</p>';
            }
        }
    }

    createPredictionChart(teams, winRates) {
        const ctx = document.getElementById('predictionChart');
        if (!ctx) return;

        const labels = teams.map(t => t.name);
        const data = winRates.map(rate => parseFloat(rate));

        if (this.predictionChartInstance) {
            this.predictionChartInstance.destroy();
        }

        this.predictionChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '胜率 (%)',
                    data: data,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        max: 100
                    }
                }
            }
        });
    }

    // 上传标签页切换
    switchUploadTab(tabType) {
        // 移除所有活跃的标签和部分
        document.querySelectorAll('.upload-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.upload-section').forEach(section => {
            section.classList.remove('active');
        });

        // 激活选中的标签和部分
        document.querySelector(`[data-upload-type="${tabType}"]`)?.classList.add('active');
        
        if (tabType === 'file') {
            document.getElementById('fileUploadSection')?.classList.add('active');
        } else if (tabType === 'paste') {
            document.getElementById('pasteDataSection')?.classList.add('active');
        }
    }

    // 从链接获取数据（参考样例站点：代理抓取 + 表格抽取）
    async fetchFromLink() {
        const url = document.getElementById('dataSourceUrl').value.trim();

        if (!url) {
            this.showLinkStatus('请输入链接', 'error');
            return;
        }

        this.showLinkStatus('正在获取数据...', 'info');

        try {
            if (this.isKdocsUrl(url)) {
                const html = await this.fetchViaCorsProxies(url);
                const tableText = this.extractKdocsTableText(html);

                if (!tableText) {
                    this.showLinkStatus('无法直接解析该链接数据，请使用“读取剪贴板”或“粘贴数据”导入。', 'error');
                    return;
                }

                this.parseTSVData(tableText);
                this.updateDashboard();
                this.showLinkStatus('成功从链接抓取并解析数据', 'success');
                return;
            }

            // 非金山链接仍保留 JSON/CSV 直接导入能力
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json,text/plain,*/*'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const text = await response.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                dataManager.importJSON(JSON.parse(text));
            } else if (text.includes('\t')) {
                this.parseTSVData(text);
            } else {
                this.parseCSV(text);
            }

            this.updateDashboard();
            this.showLinkStatus('链接数据导入成功', 'success');
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showLinkStatus('链接获取失败：' + error.message + '，建议使用“读取剪贴板”导入。', 'error');
        }
    }

    isKdocsUrl(url) {
        return /^https?:\/\/(www\.)?kdocs\.cn\/[lp]\/[a-zA-Z0-9_-]+/.test(url.trim());
    }

    async fetchViaCorsProxies(url) {
        const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?'
        ];

        let lastError = null;
        for (const prefix of proxies) {
            try {
                const target = prefix + encodeURIComponent(url);
                const response = await fetch(target, {
                    headers: { Accept: 'text/html,application/json,text/plain,*/*' }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return await response.text();
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('所有代理均不可用');
    }

    extractKdocsTableText(html) {
        const tableMatches = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
        if (tableMatches) {
            for (const table of tableMatches) {
                const rowMatches = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
                if (!rowMatches || rowMatches.length < 2) {
                    continue;
                }

                const lines = rowMatches.map((row) => {
                    const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
                    return cells
                        .map((cell) => cell.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
                        .join('\t');
                });

                const joined = lines.filter(Boolean).join('\n');
                if (joined.includes('\t')) {
                    return joined;
                }
            }
        }

        return null;
    }

    async readClipboardAndImport() {
        try {
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                this.showLinkStatus('当前浏览器不支持直接读取剪贴板，请切换到“粘贴数据”手动粘贴。', 'error');
                return;
            }

            const text = await navigator.clipboard.readText();
            if (!text) {
                this.showLinkStatus('剪贴板为空', 'error');
                return;
            }

            if (text.includes('\t')) {
                this.parseTSVData(text);
            } else if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                dataManager.importJSON(JSON.parse(text));
            } else {
                this.parseCSV(text);
            }

            this.updateDashboard();
            this.showLinkStatus('剪贴板数据导入成功', 'success');
        } catch (error) {
            console.error('Clipboard read failed:', error);
            this.showLinkStatus('无法读取剪贴板（需浏览器授权），请改用手动粘贴。', 'error');
        }
    }

    // 解析粘贴的数据
    parsePasteData() {
        const content = document.getElementById('pasteDataArea').value.trim();
        const pasteStatus = document.getElementById('pasteStatus');

        if (!content) {
            this.showPasteStatus('请粘贴数据内容', 'error');
            return;
        }

        try {
            let success = false;

            // 尝试作为 JSON 解析
            if (content.startsWith('{') || content.startsWith('[')) {
                const data = JSON.parse(content);
                dataManager.importJSON(data);
                this.showPasteStatus('JSON 数据导入成功！', 'success');
                success = true;
            } 
            // 尝试解析金山表格格式（HTML表格或制表符分隔）
            else if (content.includes('</tr>') || content.includes('<td')) {
                this.parseKdocsTable(content);
                this.showPasteStatus('金山表格数据导入成功！', 'success');
                success = true;
            }
            // 尝试作为 TSV（制表符分隔）解析 - 金山表格复制默认格式
            else if (content.includes('\t')) {
                this.parseTSVData(content);
                this.showPasteStatus('表格数据导入成功！', 'success');
                success = true;
            }
            // 作为 CSV 解析
            else {
                this.parseCSV(content);
                this.showPasteStatus('CSV 数据导入成功！', 'success');
                success = true;
            }
            
            if (success) {
                document.getElementById('pasteDataArea').value = '';
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Error parsing data:', error);
            this.showPasteStatus('数据格式错误。' + error.message, 'error');
        }
    }

    // 解析金山文档HTML表格格式
    parseKdocsTable(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const rows = doc.querySelectorAll('tr');
        
        if (rows.length === 0) return;

        const headers = [];
        const cells = rows[0].querySelectorAll('td, th');
        cells.forEach(cell => {
            headers.push(cell.textContent.trim().toLowerCase());
        });

        const tsvLines = [];
        // 解析数据行
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length === 0) continue;

            const rowData = {};
            cells.forEach((cell, idx) => {
                rowData[headers[idx]] = cell.textContent.trim();
            });

            tsvLines.push(Array.from(cells).map(c => c.textContent.trim()).join('\t'));

            this.addMatchFromRowData(rowData);
        }

        const headerLine = Array.from(rows[0].querySelectorAll('td, th')).map(c => c.textContent.trim()).join('\t');
        const mergedTsv = [headerLine].concat(tsvLines.filter(Boolean)).join('\n');
        this.parseCompetitiveTableTSV(mergedTsv);
    }

    // 解析TSV格式（制表符分隔）- 金山表格复制默认格式
    parseTSVData(tsvContent) {
        const lines = tsvContent.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        if (this.parseCompetitiveTableTSV(tsvContent)) {
            return;
        }

        // 第一行是表头
        const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());

        // 解析数据行
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split('\t');
            const rowData = {};
            
            headers.forEach((header, idx) => {
                rowData[header] = cells[idx]?.trim() || '';
            });

            this.addMatchFromRowData(rowData);
        }
    }

    // 样例站同款：按联盟赛表格聚合战队分析数据
    parseCompetitiveTableTSV(tsvContent) {
        const lines = tsvContent.split('\n').filter(line => line.trim());
        if (lines.length < 3) return false;

        const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
        const looksLikeAllianceSheet = rows.some(r => r.length >= 16);
        if (!looksLikeAllianceSheet) return false;

        const teamMap = new Map();
        let validAllianceMatches = 0;
        const competitiveMatches = [];
        const normalizeHeader = (value) => String(value || '').replace(/\s+/g, '').toLowerCase();
        const containsHeader = (value, token) => normalizeHeader(value).includes(token);
        const isSubHeaderRow = (teamA1, teamA2, teamB1, teamB2) => {
            return containsHeader(teamA1, '红方战队1名称')
                && containsHeader(teamA2, '红方战队2名称')
                && containsHeader(teamB1, '蓝方战队1名称')
                && containsHeader(teamB2, '蓝方战队2名称');
        };
        const ensureTeam = (name) => {
            if (!name) return null;
            if (!teamMap.has(name)) {
                teamMap.set(name, {
                    team: name,
                    wins: 0,
                    losses: 0,
                    points: 0,
                    totalScore: 0,
                    netScore: 0,
                    matches: 0
                });
            }
            return teamMap.get(name);
        };

        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (r.length < 16) continue;

            const teamA1 = r[3];
            const teamA2 = r[5];
            const teamB1 = r[7];
            const teamB2 = r[9];
            if (isSubHeaderRow(teamA1, teamA2, teamB1, teamB2)) {
                continue;
            }

            const pointsA = parseInt(r[10], 10) || 0;
            const totalA = parseInt(r[11], 10) || 0;
            const pointsB = parseInt(r[13], 10) || 0;
            const totalB = parseInt(r[14], 10) || 0;

            // 联盟模式净胜分：红方联盟(红1+红2) 对 蓝方联盟(蓝1+蓝2) 的逐场分差
            const allianceDiff = (totalA || pointsA) - (totalB || pointsB);
            const netA = allianceDiff;
            const netB = -allianceDiff;

            validAllianceMatches += 1;

            competitiveMatches.push({
                matchNo: validAllianceMatches,
                redTeams: [teamA1, teamA2],
                blueTeams: [teamB1, teamB2],
                redScore: (totalA || pointsA),
                blueScore: (totalB || pointsB)
            });

            const addTeamStat = (name, points, totalScore, netScore, opponentPoints) => {
                const team = ensureTeam(name);
                if (!team) return;

                team.points += points;
                team.totalScore += totalScore;
                team.netScore += netScore;
                team.matches += 1;

                if (points > opponentPoints) {
                    team.wins += 1;
                } else if (points < opponentPoints) {
                    team.losses += 1;
                }
            };

            addTeamStat(teamA1, pointsA, totalA, netA, pointsB);
            addTeamStat(teamA2, pointsA, totalA, netA, pointsB);
            addTeamStat(teamB1, pointsB, totalB, netB, pointsA);
            addTeamStat(teamB2, pointsB, totalB, netB, pointsA);
        }

        const teams = Array.from(teamMap.values());
        if (teams.length === 0) return false;

        dataManager.importCompetitiveTeams(teams, validAllianceMatches, competitiveMatches);
        return true;
    }

    // 从行数据添加比赛信息
    addMatchFromRowData(rowData) {
        // 常见的列名映射
        const teamNameField = this.findField(rowData, ['队伍名称', '队伍', '队名', 'team', 'teamname', 'team_name', '团队']);
        const scoreField = this.findField(rowData, ['分数', '总分', 'score', 'totalscore', '最终分', '积分']);
        const categoryField = this.findField(rowData, ['类别', '类型', 'category', 'type', '期次']);
        const dateField = this.findField(rowData, ['日期', '时间', 'date', 'time', '比赛日期']);

        if (!teamNameField || !scoreField) {
            console.warn('Missing required fields:', rowData);
            return;
        }

        const teamName = rowData[teamNameField];
        const score = parseInt(rowData[scoreField]) || 0;
        const category = rowData[categoryField] || 'auto';
        const date = rowData[dateField] || new Date().toLocaleDateString('zh-CN');

        // 创建或更新队伍
        if (!dataManager.teams.find(t => t.name === teamName)) {
            dataManager.addTeam(teamName);
        }

        // 添加比赛记录
        const match = {
            teamName: teamName,
            score: score,
            category: category,
            date: date,
            details: {
                auto: 0,
                tele: 0,
                endgame: 0
            }
        };

        dataManager.addMatch(match);
    }

    // 在行数据中查找字段
    findField(rowData, possibleNames) {
        const keys = Object.keys(rowData);
        
        for (let name of possibleNames) {
            // 精确匹配
            if (keys.includes(name)) {
                return name;
            }
            
            // 不区分大小写匹配
            const exact = keys.find(k => k.toLowerCase() === name.toLowerCase());
            if (exact) {
                return exact;
            }
            
            // 包含匹配
            const contains = keys.find(k => k.toLowerCase().includes(name.toLowerCase()));
            if (contains) {
                return contains;
            }
        }
        
        return null;
    }

    // 显示链接状态
    showLinkStatus(message, type) {
        const statusDiv = document.getElementById('linkStatus');
        statusDiv.textContent = message;
        statusDiv.className = `upload-status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.className = 'upload-status';
            }, 5000);
        }
    }

    // 显示粘贴状态
    showPasteStatus(message, type) {
        const statusDiv = document.getElementById('pasteStatus');
        statusDiv.textContent = message;
        statusDiv.className = `upload-status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.className = 'upload-status';
            }, 5000);
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MakeXAnalysisApp();
});
