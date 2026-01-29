/**
 * Vibecode AI - VS Code Extension
 * Main entry point
 */
import * as vscode from 'vscode';
import { VibecodeCli } from './vibecode-cli';
import { AgentsTreeProvider } from './providers/agents-provider';
import { WorkflowsTreeProvider } from './providers/workflows-provider';
import { HistoryTreeProvider } from './providers/history-provider';
import { VibecodePanel } from './webview/panel';

let vibecodeClient: VibecodeCli;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('Vibecode AI extension is now active!');

    // Create output channel
    outputChannel = vscode.window.createOutputChannel('Vibecode AI');
    context.subscriptions.push(outputChannel);

    // Initialize Vibecode CLI client
    vibecodeClient = new VibecodeCli(context, outputChannel);

    // Register tree view providers
    const agentsProvider = new AgentsTreeProvider();
    const workflowsProvider = new WorkflowsTreeProvider(vibecodeClient);
    const historyProvider = new HistoryTreeProvider(vibecodeClient);

    vscode.window.registerTreeDataProvider('vibecode.agents', agentsProvider);
    vscode.window.registerTreeDataProvider('vibecode.workflows', workflowsProvider);
    vscode.window.registerTreeDataProvider('vibecode.history', historyProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('vibecode.executeTask', () => executeTask()),
        vscode.commands.registerCommand('vibecode.openPanel', () => VibecodePanel.createOrShow(context.extensionUri, vibecodeClient)),
        vscode.commands.registerCommand('vibecode.runWorkflow', (workflow) => runWorkflow(workflow)),
        vscode.commands.registerCommand('vibecode.showContext', () => showContext()),
        vscode.commands.registerCommand('vibecode.analyzeSelection', () => analyzeSelection()),
        vscode.commands.registerCommand('vibecode.explainCode', () => explainCode()),
        vscode.commands.registerCommand('vibecode.refactorCode', () => refactorCode()),
        vscode.commands.registerCommand('vibecode.generateTests', () => generateTests()),
        vscode.commands.registerCommand('vibecode.fixError', () => fixError()),
        vscode.commands.registerCommand('vibecode.refreshWorkflows', () => workflowsProvider.refresh())
    );

    // Show welcome message
    vscode.window.showInformationMessage('Vibecode AI is ready!');
}

async function executeTask() {
    const task = await vscode.window.showInputBox({
        prompt: 'Enter your task description',
        placeHolder: 'e.g., Analyze the architecture of this project'
    });

    if (!task) {
        return;
    }

    const agent = await vscode.window.showQuickPick(
        ['auto', 'api', 'cli', 'batch', 'antigravity'],
        { placeHolder: 'Select agent (or auto for smart routing)' }
    );

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Vibecode AI',
        cancellable: false
    }, async (progress) => {
        progress.report({ message: `Executing: ${task.substring(0, 30)}...` });

        try {
            const result = await vibecodeClient.executeTask(task, agent || 'auto');
            showResult(result);
        } catch (error) {
            vscode.window.showErrorMessage(`Task failed: ${error}`);
        }
    });
}

async function runWorkflow(workflow: any) {
    const workflowName = workflow?.label || await vscode.window.showInputBox({
        prompt: 'Enter workflow name',
        placeHolder: 'e.g., feature, bugfix, code-review'
    });

    if (!workflowName) {
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Vibecode AI',
        cancellable: false
    }, async (progress) => {
        progress.report({ message: `Running workflow: ${workflowName}` });

        try {
            const result = await vibecodeClient.runWorkflow(workflowName);
            showResult(result);
        } catch (error) {
            vscode.window.showErrorMessage(`Workflow failed: ${error}`);
        }
    });
}

async function showContext() {
    try {
        const context = await vibecodeClient.getContext();
        const doc = await vscode.workspace.openTextDocument({
            content: context,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to get context: ${error}`);
    }
}

async function analyzeSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection) {
        vscode.window.showWarningMessage('No text selected');
        return;
    }

    await executeWithSelection('Analyze this code and explain what it does:', selection);
}

async function explainCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection) {
        vscode.window.showWarningMessage('No text selected');
        return;
    }

    await executeWithSelection('Explain this code in detail:', selection);
}

async function refactorCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection) {
        vscode.window.showWarningMessage('No text selected');
        return;
    }

    await executeWithSelection('Refactor this code to improve readability and performance:', selection);
}

async function generateTests() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection) {
        vscode.window.showWarningMessage('No text selected');
        return;
    }

    await executeWithSelection('Generate unit tests for this code:', selection);
}

async function fixError() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // Get diagnostics for current file
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);

    if (errors.length === 0) {
        vscode.window.showInformationMessage('No errors found in current file');
        return;
    }

    const errorMessages = errors.map(e => `Line ${e.range.start.line + 1}: ${e.message}`).join('\n');
    const code = editor.document.getText();

    await executeWithSelection(`Fix these errors:\n${errorMessages}\n\nIn this code:`, code);
}

async function executeWithSelection(prompt: string, code: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Vibecode AI',
        cancellable: false
    }, async (progress) => {
        progress.report({ message: 'Processing...' });

        try {
            const task = `${prompt}\n\n\`\`\`\n${code}\n\`\`\``;
            const result = await vibecodeClient.executeTask(task, 'api');
            showResult(result);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed: ${error}`);
        }
    });
}

function showResult(result: string) {
    outputChannel.appendLine('---');
    outputChannel.appendLine(result);
    outputChannel.show();

    const config = vscode.workspace.getConfiguration('vibecode');
    if (config.get('showNotifications')) {
        vscode.window.showInformationMessage('Task completed! Check output for results.');
    }
}

export function deactivate() {
    console.log('Vibecode AI extension deactivated');
}
