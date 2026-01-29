/**
 * History Tree View Provider
 * Shows task execution history in the sidebar
 */
import * as vscode from 'vscode';
import { VibecodeCli } from '../vibecode-cli';

export class HistoryItem extends vscode.TreeItem {
    constructor(
        public readonly task: any
    ) {
        super(task.description || 'Unknown task', vscode.TreeItemCollapsibleState.None);

        const success = task.success !== false;
        this.tooltip = `Agent: ${task.agent || 'auto'}\nTime: ${task.execution_time?.toFixed(1) || '?'}s`;
        this.description = task.agent || 'auto';
        this.iconPath = new vscode.ThemeIcon(
            success ? 'pass' : 'error',
            success ? new vscode.ThemeColor('testing.iconPassed') : new vscode.ThemeColor('testing.iconFailed')
        );
        this.contextValue = 'historyItem';
    }
}

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | undefined | null | void> = new vscode.EventEmitter<HistoryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HistoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private historyItems: HistoryItem[] = [];

    constructor(private vibecodeClient: VibecodeCli) {
        this.loadHistory();
    }

    refresh(): void {
        this.loadHistory();
    }

    private async loadHistory() {
        try {
            const tasks = await this.vibecodeClient.getTaskHistory();
            this.historyItems = tasks.slice(-10).reverse().map(t => new HistoryItem(t));
        } catch (error) {
            console.error('Failed to load history:', error);
            this.historyItems = [];
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HistoryItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
        if (!element) {
            return Promise.resolve(this.historyItems);
        }
        return Promise.resolve([]);
    }
}
