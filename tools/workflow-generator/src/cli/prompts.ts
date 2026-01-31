// src/cli/prompts.ts

import inquirer from 'inquirer';
import { agentRegistry } from '../data/agent-registry.js';

export interface PromptAnswers {
    userStory: string;
    agent?: string;
    confirmModel: boolean;
    additionalTools: string[];
    outputPath: string;
    confirmSave: boolean;
}

export async function promptUser(): Promise<PromptAnswers> {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'userStory',
            message: 'Describe your feature/task:',
            validate: (input: string) => {
                if (!input.trim()) {
                    return 'User story cannot be empty';
                }
                if (input.length < 10) {
                    return 'Please provide more details (at least 10 characters)';
                }
                return true;
            },
        },
        {
            type: 'list',
            name: 'agent',
            message: 'Which agent should handle this? (auto-detected)',
            choices: agentRegistry.getTypes().map((type) => ({
                name: agentRegistry.get(type)!.name,
                value: type,
            })),
            when: (answers) => {
                // Only ask if auto-detection fails (we'll implement this logic later)
                return false; // For now, always auto-detect
            },
        },
        {
            type: 'confirm',
            name: 'confirmModel',
            message: (answers) => `Use recommended AI model?`,
            default: true,
        },
        {
            type: 'input',
            name: 'outputPath',
            message: 'Output filename (leave empty for auto-generated):',
            default: '',
        },
        {
            type: 'confirm',
            name: 'confirmSave',
            message: 'Save workflow after preview?',
            default: true,
        },
    ]);

    return {
        ...answers,
        additionalTools: [],
    };
}
