/**
 * Agents Tree View Provider
 * Shows available AI agents in the sidebar
 */
import * as vscode from 'vscode';

export class AgentItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly agentType: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
        this.tooltip = description;
        this.contextValue = 'agent';
        this.iconPath = this.getIcon();
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.agentType) {
            case 'api':
                return new vscode.ThemeIcon('symbol-interface');
            case 'cli':
                return new vscode.ThemeIcon('terminal');
            case 'batch':
                return new vscode.ThemeIcon('files');
            case 'antigravity':
                return new vscode.ThemeIcon('rocket');
            default:
                return new vscode.ThemeIcon('robot');
        }
    }
}

export class AgentsTreeProvider implements vscode.TreeDataProvider<AgentItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AgentItem | undefined | null | void> = new vscode.EventEmitter<AgentItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private agents: AgentItem[] = [
        new AgentItem(
            'API Agent',
            'api',
            'Strategic analysis, planning, research, and explanation'
        ),
        new AgentItem(
            'CLI Agent',
            'cli',
            'Code implementation, debugging, testing, and execution'
        ),
        new AgentItem(
            'Batch Agent',
            'batch',
            'Parallel batch operations, pipelines, sync, and bulk processing'
        ),
        new AgentItem(
            'Antigravity Agent',
            'antigravity',
            'Project scaffolding and template generation'
        )
    ];

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AgentItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AgentItem): Thenable<AgentItem[]> {
        if (!element) {
            return Promise.resolve(this.agents);
        }
        return Promise.resolve([]);
    }
}
