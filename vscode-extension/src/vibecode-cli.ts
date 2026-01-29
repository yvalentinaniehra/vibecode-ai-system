/**
 * Vibecode CLI Client
 * Wraps the Python vibe.py CLI for VS Code integration
 */
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export interface TaskResult {
    success: boolean;
    result?: string;
    error?: string;
    agent?: string;
    executionTime?: number;
}

export interface WorkflowInfo {
    file: string;
    name: string;
    description?: string;
    steps: number;
    version: string;
}

export class VibecodeCli {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private pythonPath: string;
    private vibecodeCliPath: string;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.pythonPath = this.getPythonPath();
        this.vibecodeCliPath = this.getVibecodeCliPath();
    }

    private getPythonPath(): string {
        const config = vscode.workspace.getConfiguration('vibecode');
        return config.get<string>('pythonPath') || 'python';
    }

    private getVibecodeCliPath(): string {
        const config = vscode.workspace.getConfiguration('vibecode');
        const customPath = config.get<string>('vibecodeCliPath');

        if (customPath) {
            return customPath;
        }

        // Try to find vibe.py in workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                const vibePath = path.join(folder.uri.fsPath, 'vibe.py');
                // Check if file exists (we'll handle this in execute)
                return vibePath;
            }
        }

        return 'vibe.py';
    }

    private getWorkspacePath(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        return process.cwd();
    }

    async executeTask(task: string, agent: string = 'auto'): Promise<string> {
        const args = ['task', `"${task}"`];

        if (agent && agent !== 'auto') {
            args.push(`--${agent}`);
        }

        return this.runCommand(args);
    }

    async runWorkflow(workflowName: string, dryRun: boolean = false): Promise<string> {
        const args = ['workflow', workflowName];

        if (dryRun) {
            args.push('--dry-run');
        }

        return this.runCommand(args);
    }

    async getContext(): Promise<string> {
        return this.runCommand(['context']);
    }

    async getStats(): Promise<string> {
        return this.runCommand(['stats']);
    }

    async listWorkflows(): Promise<WorkflowInfo[]> {
        try {
            const output = await this.runCommand(['workflow', 'list']);
            // Parse workflow list from output
            return this.parseWorkflowList(output);
        } catch (error) {
            return [];
        }
    }

    async getTaskHistory(): Promise<any[]> {
        try {
            const contextOutput = await this.getContext();
            // Parse completed tasks from context
            return this.parseTaskHistory(contextOutput);
        } catch (error) {
            return [];
        }
    }

    private parseWorkflowList(output: string): WorkflowInfo[] {
        const workflows: WorkflowInfo[] = [];
        const lines = output.split('\n');

        // Simple parsing - look for workflow entries
        for (const line of lines) {
            const match = line.match(/(\S+\.yaml)\s+(\S+)\s+(\d+)/);
            if (match) {
                workflows.push({
                    file: match[1],
                    name: match[2],
                    steps: parseInt(match[3]),
                    version: '1.0.0'
                });
            }
        }

        // If no workflows parsed, return some defaults
        if (workflows.length === 0) {
            return [
                { file: 'feature.yaml', name: 'feature', steps: 3, version: '1.0.0' },
                { file: 'bugfix.yaml', name: 'bugfix', steps: 3, version: '1.0.0' },
                { file: 'code-review.yaml', name: 'code-review', steps: 2, version: '1.0.0' }
            ];
        }

        return workflows;
    }

    private parseTaskHistory(contextOutput: string): any[] {
        try {
            // Look for Recent Tasks section
            const match = contextOutput.match(/Recent Tasks.*?\[([\s\S]*?)\]/);
            if (match) {
                return JSON.parse(`[${match[1]}]`);
            }
        } catch (error) {
            // Ignore parse errors
        }
        return [];
    }

    private runCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const workspacePath = this.getWorkspacePath();
            const command = `${this.pythonPath} "${this.vibecodeCliPath}" ${args.join(' ')}`;

            this.outputChannel.appendLine(`> ${command}`);

            cp.exec(command, {
                cwd: workspacePath,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                env: {
                    ...process.env,
                    PYTHONIOENCODING: 'utf-8',
                    FORCE_COLOR: '0'
                }
            }, (error, stdout, stderr) => {
                if (error) {
                    this.outputChannel.appendLine(`Error: ${error.message}`);
                    if (stderr) {
                        this.outputChannel.appendLine(`Stderr: ${stderr}`);
                    }
                    reject(error);
                    return;
                }

                const output = stdout.toString();
                this.outputChannel.appendLine(output);
                resolve(output);
            });
        });
    }

    async checkHealth(): Promise<boolean> {
        try {
            await this.runCommand(['--version']);
            return true;
        } catch (error) {
            return false;
        }
    }
}
