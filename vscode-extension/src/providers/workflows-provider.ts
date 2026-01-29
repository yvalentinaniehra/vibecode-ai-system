/**
 * Workflows Tree View Provider
 * Shows available workflows in the sidebar
 */
import * as vscode from 'vscode';
import { VibecodeCli, WorkflowInfo } from '../vibecode-cli';

export class WorkflowItem extends vscode.TreeItem {
    constructor(
        public readonly workflow: WorkflowInfo
    ) {
        super(workflow.name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = workflow.description || `${workflow.steps} steps`;
        this.description = `${workflow.steps} steps`;
        this.contextValue = 'workflow';
        this.iconPath = new vscode.ThemeIcon('symbol-event');

        this.command = {
            command: 'vibecode.runWorkflow',
            title: 'Run Workflow',
            arguments: [this]
        };
    }
}

export class WorkflowsTreeProvider implements vscode.TreeDataProvider<WorkflowItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<WorkflowItem | undefined | null | void> = new vscode.EventEmitter<WorkflowItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<WorkflowItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private workflows: WorkflowItem[] = [];

    constructor(private vibecodeClient: VibecodeCli) {
        this.loadWorkflows();
    }

    refresh(): void {
        this.loadWorkflows();
        this._onDidChangeTreeData.fire();
    }

    private async loadWorkflows() {
        try {
            const workflowInfos = await this.vibecodeClient.listWorkflows();
            this.workflows = workflowInfos.map(wf => new WorkflowItem(wf));
        } catch (error) {
            console.error('Failed to load workflows:', error);
            // Use default workflows
            this.workflows = [
                new WorkflowItem({ file: 'feature.yaml', name: 'feature', steps: 3, version: '1.0.0', description: 'New feature workflow' }),
                new WorkflowItem({ file: 'bugfix.yaml', name: 'bugfix', steps: 3, version: '1.0.0', description: 'Bug fix workflow' }),
                new WorkflowItem({ file: 'code-review.yaml', name: 'code-review', steps: 2, version: '1.0.0', description: 'Code review workflow' }),
                new WorkflowItem({ file: 'quick-task.yaml', name: 'quick-task', steps: 1, version: '1.0.0', description: 'Quick task execution' })
            ];
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: WorkflowItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: WorkflowItem): Thenable<WorkflowItem[]> {
        if (!element) {
            return Promise.resolve(this.workflows);
        }
        return Promise.resolve([]);
    }
}
