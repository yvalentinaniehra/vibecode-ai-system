// src/generator/template-engine.ts

import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TemplateData } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateEngine {
    private template: HandlebarsTemplateDelegate;

    constructor(templatePath = '../data/templates/workflow.hbs') {
        const resolvedPath = path.resolve(__dirname, templatePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Template not found: ${resolvedPath}`);
        }

        const templateSource = fs.readFileSync(resolvedPath, 'utf-8');
        this.template = Handlebars.compile(templateSource);

        // Register helpers
        this.registerHelpers();
    }

    /**
     * Render workflow template with data
     * @param data - Template data
     * @returns Rendered markdown content
     */
    render(data: any): string {
        // Add default values
        const enrichedData = {
            ...data,
            emoji: this.getEmojiForAgent(data.agentName),
            title: this.generateTitle(data.description),
            input: data.input || 'Requirements from previous phase',
            output: data.output || 'Deliverables for next phase',
            prerequisites: data.prerequisites || [],
            deliverables: data.deliverables || [],
            nextAgent: data.nextAgent || 'reviewer',
            handoffAction: data.handoffAction || 'Review and validate',
            artifacts: data.artifacts || [],
            codeLanguage: 'bash',
        };

        return this.template(enrichedData);
    }

    /**
     * Register Handlebars helpers
     */
    private registerHelpers(): void {
        // Helper to format tool names
        Handlebars.registerHelper('formatTool', (toolName: string) => {
            return toolName.replace(/_/g, ' ').replace(/mcp-/g, '');
        });

        // Helper for conditional rendering
        Handlebars.registerHelper('ifEquals', (arg1: any, arg2: any, options: any) => {
            return arg1 === arg2 ? options.fn(options) : options.inverse(options);
        });
    }

    /**
     * Get emoji for agent type
     */
    private getEmojiForAgent(agentName: string): string {
        const emojiMap: Record<string, string> = {
            'Research Agent': '🔍',
            'Strategy Agent': '🎯',
            'PM Agent': '📋',
            'UX Agent': '🎨',
            'Architect Agent': '🏗️',
            'Database Agent': '🗄️',
            'Coder Agent': '💻',
            'Reviewer Agent': '👀',
            'QA Agent': '🧪',
            'DevOps Agent': '🚀',
        };

        return emojiMap[agentName] || '⚙️';
    }

    /**
     * Generate title from description
     */
    private generateTitle(description: string): string {
        // Capitalize first letter of each word
        return description
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
