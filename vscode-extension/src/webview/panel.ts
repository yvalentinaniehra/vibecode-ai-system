/**
 * Vibecode Panel - Main webview panel for interactive AI chat
 */
import * as vscode from 'vscode';
import { VibecodeCli } from '../vibecode-cli';

export class VibecodePanel {
    public static currentPanel: VibecodePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _vibecodeClient: VibecodeCli;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, vibecodeClient: VibecodeCli) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (VibecodePanel.currentPanel) {
            VibecodePanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'vibecodePanel',
            'Vibecode AI',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'webview'),
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        VibecodePanel.currentPanel = new VibecodePanel(panel, extensionUri, vibecodeClient);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, vibecodeClient: VibecodeCli) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._vibecodeClient = vibecodeClient;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeTask':
                        await this._handleExecuteTask(message.task, message.agent);
                        break;
                    case 'getContext':
                        await this._handleGetContext();
                        break;
                    case 'runWorkflow':
                        await this._handleRunWorkflow(message.workflow);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async _handleExecuteTask(task: string, agent: string) {
        try {
            this._panel.webview.postMessage({ command: 'loading', loading: true });
            const result = await this._vibecodeClient.executeTask(task, agent);
            this._panel.webview.postMessage({
                command: 'taskResult',
                success: true,
                result: result
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'taskResult',
                success: false,
                error: String(error)
            });
        } finally {
            this._panel.webview.postMessage({ command: 'loading', loading: false });
        }
    }

    private async _handleGetContext() {
        try {
            const context = await this._vibecodeClient.getContext();
            this._panel.webview.postMessage({
                command: 'contextResult',
                context: context
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'contextResult',
                error: String(error)
            });
        }
    }

    private async _handleRunWorkflow(workflow: string) {
        try {
            this._panel.webview.postMessage({ command: 'loading', loading: true });
            const result = await this._vibecodeClient.runWorkflow(workflow);
            this._panel.webview.postMessage({
                command: 'workflowResult',
                success: true,
                result: result
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'workflowResult',
                success: false,
                error: String(error)
            });
        } finally {
            this._panel.webview.postMessage({ command: 'loading', loading: false });
        }
    }

    public dispose() {
        VibecodePanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Vibecode AI';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Vibecode AI</title>
    <style>
        :root {
            --bg-primary: var(--vscode-editor-background);
            --bg-secondary: var(--vscode-sideBar-background);
            --text-primary: var(--vscode-editor-foreground);
            --text-secondary: var(--vscode-descriptionForeground);
            --accent: var(--vscode-button-background);
            --accent-hover: var(--vscode-button-hoverBackground);
            --border: var(--vscode-panel-border);
            --input-bg: var(--vscode-input-background);
            --input-border: var(--vscode-input-border);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--text-primary);
            background: var(--bg-primary);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            padding: 16px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header h1 {
            font-size: 18px;
            font-weight: 600;
        }

        .header .status {
            margin-left: auto;
            font-size: 12px;
            color: var(--text-secondary);
        }

        .main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        .message {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 8px;
            max-width: 90%;
        }

        .message.user {
            background: var(--accent);
            color: white;
            margin-left: auto;
        }

        .message.assistant {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
        }

        .message pre {
            background: var(--bg-primary);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin-top: 8px;
        }

        .message code {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .result-content {
            line-height: 1.6;
        }

        .result-header {
            font-size: 14px;
            font-weight: 600;
            margin: 12px 0 8px 0;
            color: var(--accent);
            border-bottom: 1px solid var(--border);
            padding-bottom: 4px;
        }

        .result-content ul {
            margin: 8px 0;
            padding-left: 20px;
        }

        .result-content li {
            margin: 4px 0;
        }

        .info-row {
            display: flex;
            gap: 8px;
            margin: 4px 0;
            padding: 4px 8px;
            background: var(--bg-primary);
            border-radius: 4px;
        }

        .info-label {
            font-weight: 600;
            color: var(--text-secondary);
            min-width: 100px;
        }

        .info-value {
            color: var(--text-primary);
        }

        .status-success {
            color: #4caf50;
            font-weight: 600;
        }

        .status-error {
            color: #f44336;
            font-weight: 600;
        }

        .code-block {
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
            overflow-x: auto;
        }

        .code-block code {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            white-space: pre-wrap;
        }

        .inline-code {
            background: var(--bg-primary);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .input-area {
            padding: 16px;
            border-top: 1px solid var(--border);
            background: var(--bg-secondary);
        }

        .input-row {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .input-row input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid var(--input-border);
            border-radius: 6px;
            background: var(--input-bg);
            color: var(--text-primary);
            font-size: 14px;
        }

        .input-row input:focus {
            outline: none;
            border-color: var(--accent);
        }

        .input-row select {
            padding: 10px 12px;
            border: 1px solid var(--input-border);
            border-radius: 6px;
            background: var(--input-bg);
            color: var(--text-primary);
            cursor: pointer;
        }

        .input-row button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            background: var(--accent);
            color: white;
            cursor: pointer;
            font-weight: 500;
        }

        .input-row button:hover {
            background: var(--accent-hover);
        }

        .input-row button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .quick-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .quick-action {
            padding: 6px 12px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 12px;
        }

        .quick-action:hover {
            background: var(--bg-primary);
            color: var(--text-primary);
        }

        .loading {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 12px;
            color: var(--text-secondary);
        }

        .loading.active {
            display: flex;
        }

        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
        }

        .empty-state h2 {
            margin-bottom: 8px;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Vibecode AI</h1>
        <span class="status" id="status">Ready</span>
    </div>

    <div class="main">
        <div class="messages" id="messages">
            <div class="empty-state">
                <h2>Welcome to Vibecode AI</h2>
                <p>Enter a task below or use quick actions to get started.</p>
            </div>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <span>Processing...</span>
        </div>
    </div>

    <div class="input-area">
        <div class="input-row">
            <input type="text" id="taskInput" placeholder="Enter your task..." />
            <select id="agentSelect">
                <option value="auto">Auto</option>
                <option value="api">API Agent</option>
                <option value="cli">CLI Agent</option>
                <option value="batch">Batch Agent</option>
                <option value="antigravity">Antigravity</option>
            </select>
            <button id="sendBtn">Send</button>
        </div>
        <div class="quick-actions">
            <button class="quick-action" data-action="analyze">Analyze Code</button>
            <button class="quick-action" data-action="explain">Explain</button>
            <button class="quick-action" data-action="refactor">Refactor</button>
            <button class="quick-action" data-action="tests">Generate Tests</button>
            <button class="quick-action" data-action="context">Show Context</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        const taskInput = document.getElementById('taskInput');
        const agentSelect = document.getElementById('agentSelect');
        const sendBtn = document.getElementById('sendBtn');
        const messagesEl = document.getElementById('messages');
        const loadingEl = document.getElementById('loading');
        const statusEl = document.getElementById('status');

        let isFirstMessage = true;

        // Send task
        sendBtn.addEventListener('click', sendTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendTask();
        });

        function sendTask() {
            const task = taskInput.value.trim();
            if (!task) return;

            addMessage(task, 'user');
            vscode.postMessage({
                command: 'executeTask',
                task: task,
                agent: agentSelect.value
            });

            taskInput.value = '';
        }

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                switch (action) {
                    case 'analyze':
                        taskInput.value = 'Analyze the current code and explain its architecture';
                        break;
                    case 'explain':
                        taskInput.value = 'Explain how this code works';
                        break;
                    case 'refactor':
                        taskInput.value = 'Suggest refactoring improvements for this code';
                        break;
                    case 'tests':
                        taskInput.value = 'Generate unit tests for this code';
                        break;
                    case 'context':
                        vscode.postMessage({ command: 'getContext' });
                        break;
                }
                taskInput.focus();
            });
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'loading':
                    loadingEl.classList.toggle('active', message.loading);
                    sendBtn.disabled = message.loading;
                    statusEl.textContent = message.loading ? 'Processing...' : 'Ready';
                    break;

                case 'taskResult':
                    if (message.success) {
                        addMessage(message.result, 'assistant');
                    } else {
                        addMessage('Error: ' + message.error, 'assistant');
                    }
                    break;

                case 'contextResult':
                    if (message.context) {
                        addMessage(message.context, 'assistant');
                    } else {
                        addMessage('Error: ' + message.error, 'assistant');
                    }
                    break;

                case 'workflowResult':
                    if (message.success) {
                        addMessage('Workflow completed:\\n' + message.result, 'assistant');
                    } else {
                        addMessage('Workflow error: ' + message.error, 'assistant');
                    }
                    break;
            }
        });

        function addMessage(text, type) {
            if (isFirstMessage) {
                messagesEl.innerHTML = '';
                isFirstMessage = false;
            }

            const messageEl = document.createElement('div');
            messageEl.className = 'message ' + type;

            // Clean and format the text
            let formattedText = cleanOutput(text);

            messageEl.innerHTML = formattedText;
            messagesEl.appendChild(messageEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function cleanOutput(text) {
            // Remove ANSI escape codes
            let cleaned = text.replace(/\\x1B\\[[0-9;]*[a-zA-Z]/g, '');
            cleaned = cleaned.replace(/\\[[0-9;]*m/g, '');

            // Remove Rich box drawing characters (using unicode ranges)
            cleaned = cleaned.replace(/[\\u2500-\\u257F]/g, '');
            cleaned = cleaned.replace(/[\\u2550-\\u256C]/g, '');

            // Clean up extra whitespace from box removal
            cleaned = cleaned.replace(/^\\s*$/gm, '');
            cleaned = cleaned.replace(/\\n{3,}/g, '\\n\\n');

            // Format sections with headers
            cleaned = cleaned.replace(/^(#{1,3})\\s*(.+)$/gm, '<h3 class="result-header">$2</h3>');

            // Format bullet points
            cleaned = cleaned.replace(/^[\\s]*[-*]\\s*(.+)$/gm, '<li>$1</li>');

            // Format key-value pairs (like "Agent: api")
            cleaned = cleaned.replace(/^([A-Za-z][A-Za-z\\s]+):\\s*(.+)$/gm, '<div class="info-row"><span class="info-label">$1:</span> <span class="info-value">$2</span></div>');

            // Format success/error indicators
            cleaned = cleaned.replace(/SUCCESS|Completed|Success/gi, '<span class="status-success">OK</span>');
            cleaned = cleaned.replace(/ERROR|Failed|FAILED/gi, '<span class="status-error">Error</span>');

            // Remove common emojis
            cleaned = cleaned.replace(/[\\u{1F300}-\\u{1F9FF}]/gu, '');

            // Convert newlines to breaks
            cleaned = cleaned.replace(/\\n/g, '<br>');

            // Clean up multiple breaks
            cleaned = cleaned.replace(/(<br>\\s*){3,}/g, '<br><br>');

            // Wrap in result container
            return '<div class="result-content">' + cleaned + '</div>';
        }
    </script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
