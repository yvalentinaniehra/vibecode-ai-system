// src/cli/display.ts

import chalk from 'chalk';

/**
 * Display workflow preview (first 20 lines)
 */
export function displayPreview(content: string): void {
    const lines = content.split('\n');
    const preview = lines.slice(0, 20).join('\n');

    console.log(chalk.cyan('\n📄 Preview:\n'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(preview);
    if (lines.length > 20) {
        console.log(chalk.gray(`\n... (${lines.length - 20} more lines)`));
    }
    console.log(chalk.gray('─'.repeat(60) + '\n'));
}

/**
 * Display success message
 */
export function displaySuccess(filePath: string): void {
    console.log(chalk.green('\n✅ Workflow created successfully!\n'));
    console.log(chalk.white(`📁 File: ${chalk.cyan(filePath)}\n`));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Review the generated workflow'));
    console.log(chalk.gray('  2. Customize steps if needed'));
    console.log(chalk.gray('  3. Commit to version control\n'));
}

/**
 * Display error messages
 */
export function displayError(errors: string[]): void {
    console.log(chalk.red('\n❌ Error generating workflow:\n'));
    errors.forEach((error) => {
        console.log(chalk.red(`  • ${error}`));
    });
    console.log();
}

/**
 * Display agent match information
 */
export function displayAgentMatch(agentName: string, confidence: number): void {
    const confidenceColor = confidence > 0.7 ? chalk.green : confidence > 0.5 ? chalk.yellow : chalk.red;

    console.log(chalk.blue('\n🤖 Agent Detection:\n'));
    console.log(chalk.white(`  Agent: ${chalk.cyan(agentName)}`));
    console.log(chalk.white(`  Confidence: ${confidenceColor(`${(confidence * 100).toFixed(0)}%`)}\n`));
}
