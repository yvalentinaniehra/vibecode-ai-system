#!/usr/bin/env node

/**
 * Node.js bridge script for Workflow Generator
 * Called from Rust/Tauri to generate workflows
 */

import { WorkflowBuilder } from '../../../tools/workflow-generator/dist/generator/workflow-builder.js';
import { agentRegistry } from '../../../tools/workflow-generator/dist/data/agent-registry.js';

const command = process.argv[2];
const args = process.argv.slice(3);

async function generateWorkflow(userStory) {
    try {
        const builder = new WorkflowBuilder();
        const result = await builder.build(userStory, { dryRun: true });

        // Return structured JSON
        console.log(JSON.stringify({
            success: result.success,
            content: result.content,
            filename: result.filePath,
            errors: result.validationErrors || []
        }));
    } catch (error) {
        console.error(JSON.stringify({
            success: false,
            content: '',
            filename: '',
            errors: [error.message]
        }));
        process.exit(1);
    }
}

async function saveWorkflow(content, filename) {
    try {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        // Get script directory using import.meta.url
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // If filename is an absolute path, extract just the basename
        const baseFilename = path.isAbsolute(filename) ? path.basename(filename) : filename;

        // Navigate from scripts/ folder to project root:
        // scripts/ -> src-tauri/ -> desktop-app/ -> control-agent-full/
        const projectRoot = path.resolve(__dirname, '..', '..', '..');
        const workflowsDir = path.join(projectRoot, '.agent', 'workflows');
        const filePath = path.join(workflowsDir, baseFilename);

        // Ensure directory exists
        if (!fs.existsSync(workflowsDir)) {
            fs.mkdirSync(workflowsDir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, content, 'utf-8');

        console.log(JSON.stringify({
            success: true,
            path: filePath
        }));
    } catch (error) {
        console.error(JSON.stringify({
            success: false,
            error: error.message
        }));
        process.exit(1);
    }
}

async function listAgents() {
    try {
        const agents = agentRegistry.getAll().map(agent => ({
            name: agent.name,
            phase: agent.phase,
            model: agent.model,
            keywords: agent.keywords
        }));

        console.log(JSON.stringify({
            success: true,
            agents
        }));
    } catch (error) {
        console.error(JSON.stringify({
            success: false,
            error: error.message
        }));
        process.exit(1);
    }
}

// Main
switch (command) {
    case 'generate':
        await generateWorkflow(args[0]);
        break;
    case 'save':
        await saveWorkflow(args[0], args[1]);
        break;
    case 'list-agents':
        await listAgents();
        break;
    default:
        console.error(JSON.stringify({
            success: false,
            error: `Unknown command: ${command}`
        }));
        process.exit(1);
}
