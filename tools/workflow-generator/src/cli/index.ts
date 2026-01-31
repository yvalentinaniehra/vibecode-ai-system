#!/usr/bin/env node

// src/cli/index.ts

import { Command } from 'commander';
import chalk from 'chalk';
import { WorkflowBuilder } from '../generator/workflow-builder.js';
import { promptUser } from './prompts.js';
import { displayPreview, displaySuccess, displayError } from './display.js';

const program = new Command();
const builder = new WorkflowBuilder();

program
    .name('workflow')
    .description('Generate Vibecode workflow files from user stories')
    .version('1.0.0');

// Create command
program
    .command('create')
    .description('Create a new workflow from user story')
    .option('-s, --story <story>', 'User story description')
    .option('-a, --agent <agent>', 'Force specific agent')
    .option('-o, --output <path>', 'Output path')
    .option('--no-ai', 'Disable AI parsing')
    .option('--dry-run', 'Preview without writing file')
    .option('--overwrite', 'Overwrite existing file')
    .action(async (options) => {
        try {
            let userStory = options.story;

            // Interactive mode if no story provided
            if (!userStory) {
                const answers = await promptUser();
                userStory = answers.userStory;
                options.output = answers.outputPath;
                options.overwrite = answers.confirmSave;
            }

            console.log(chalk.blue('\n🔄 Generating workflow...\n'));

            // Build workflow
            const result = await builder.build(userStory, {
                outputPath: options.output,
                overwrite: options.overwrite,
                dryRun: options.dryRun,
            });

            if (!result.success) {
                displayError(result.validationErrors || ['Unknown error']);
                process.exit(1);
            }

            // Show preview
            if (options.dryRun || !options.story) {
                displayPreview(result.content);
            }

            // Confirm save in interactive mode
            if (!options.story && !options.dryRun) {
                const { confirmSave } = await import('inquirer').then((m) =>
                    m.default.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmSave',
                            message: 'Save this workflow?',
                            default: true,
                        },
                    ])
                );

                if (!confirmSave) {
                    console.log(chalk.yellow('\n❌ Workflow not saved.\n'));
                    process.exit(0);
                }
            }

            displaySuccess(result.filePath);
        } catch (error) {
            displayError([error instanceof Error ? error.message : 'Unknown error']);
            process.exit(1);
        }
    });

// Validate command
program
    .command('validate <file>')
    .description('Validate existing workflow file')
    .action(async (file) => {
        console.log(chalk.blue(`\n🔍 Validating ${file}...\n`));
        // TODO: Implement validation
        console.log(chalk.yellow('Validation not yet implemented\n'));
    });

program.parse();
