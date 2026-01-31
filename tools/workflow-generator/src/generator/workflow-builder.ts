// src/generator/workflow-builder.ts

import type { BuildOptions, BuildResult, AgentMatch, ToolSelection } from '../types/index.js';
import { StoryParser } from '../parser/story-parser.js';
import { AgentMatcher } from '../parser/agent-matcher.js';
import { ToolSelector } from '../parser/tool-selector.js';
import { TemplateEngine } from './template-engine.js';
import { PathValidator } from '../validator/path-validator.js';
import { InputSanitizer } from '../validator/input-sanitizer.js';
import { agentRegistry } from '../data/agent-registry.js';
import path from 'path';
import fs from 'fs';

export class WorkflowBuilder {
    private parser: StoryParser;
    private matcher: AgentMatcher;
    private selector: ToolSelector;
    private engine: TemplateEngine;
    private pathValidator: PathValidator;
    private sanitizer: InputSanitizer;

    constructor() {
        this.parser = new StoryParser();
        this.matcher = new AgentMatcher();
        this.selector = new ToolSelector();
        this.engine = new TemplateEngine();
        this.pathValidator = new PathValidator();
        this.sanitizer = new InputSanitizer();
    }

    /**
     * Build workflow from user story
     * @param userStory - User's feature description
     * @param options - Build options
     * @returns Build result with file path and content
     */
    async build(userStory: string, options: BuildOptions = {}): Promise<BuildResult> {
        try {
            // 1. Parse user story
            const parsed = await this.parser.parse(userStory);

            // 2. Match to agent
            const agentMatch = this.matcher.match(parsed);

            // 3. Select tools
            const tools = this.selector.selectForAgent(agentMatch.agent);

            // 4. Generate filename
            const filename = this.generateFilename(userStory, options.outputPath);

            // 5. Validate path
            const validatedPath = this.pathValidator.validateOutputPath(filename);

            // 6. Build template data
            const templateData = this.buildTemplateData(userStory, agentMatch, tools);

            // 7. Render template
            const content = this.engine.render(templateData);

            // 8. Write file (unless dry run)
            if (!options.dryRun) {
                // Check if file exists
                if (fs.existsSync(validatedPath) && !options.overwrite) {
                    return {
                        success: false,
                        filePath: validatedPath,
                        content,
                        validationErrors: ['File already exists. Use --overwrite to replace.'],
                    };
                }

                // Ensure directory exists
                const dir = path.dirname(validatedPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Write file
                fs.writeFileSync(validatedPath, content, 'utf-8');
            }

            return {
                success: true,
                filePath: validatedPath,
                content,
            };
        } catch (error) {
            return {
                success: false,
                filePath: '',
                content: '',
                validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }

    /**
     * Generate filename from user story
     */
    private generateFilename(userStory: string, customPath?: string): string {
        if (customPath) {
            return customPath.endsWith('.md') ? customPath : `${customPath}.md`;
        }

        // Generate from user story
        const sanitized = this.sanitizer.sanitizeFilename(userStory);
        return `${sanitized}.md`;
    }

    /**
     * Build template data from parsed information
     */
    private buildTemplateData(
        userStory: string,
        agentMatch: AgentMatch,
        tools: ToolSelection
    ): any {
        const agentDef = agentRegistry.get(agentMatch.agent)!;

        return {
            description: userStory,
            agentName: agentDef.name,
            phase: agentMatch.phase,
            aiModel: agentMatch.model,
            tools: [...tools.primary, ...tools.optional],
            steps: this.generateSteps(agentMatch.agent),
            relatedFiles: this.getRelatedFiles(agentMatch.agent),
            prerequisites: this.getPrerequisites(agentMatch.agent),
            deliverables: this.getDeliverables(agentMatch.agent),
            nextAgent: this.getNextAgent(agentMatch.agent),
            handoffAction: this.getHandoffAction(agentMatch.agent),
            artifacts: [],
        };
    }

    /**
     * Generate workflow steps based on agent type
     */
    private generateSteps(agent: string): any[] {
        // Basic steps - can be enhanced later
        return [
            {
                number: 1,
                title: 'Load Context',
                description: 'Review requirements and previous phase outputs',
                turbo: true,
                code: '# Load required documents',
            },
            {
                number: 2,
                title: 'Execute Task',
                description: 'Implement the required functionality',
                turbo: false,
            },
            {
                number: 3,
                title: 'Validate Output',
                description: 'Verify deliverables meet acceptance criteria',
                turbo: false,
            },
        ];
    }

    /**
     * Get related files for agent
     */
    private getRelatedFiles(agent: string): any[] {
        return [
            {
                name: `${agent} Agent Definition`,
                path: `file:///d:/project/control-agent-full/.agent/agents/${agent}.md`,
            },
        ];
    }

    /**
     * Get prerequisites for agent
     */
    private getPrerequisites(agent: string): string[] {
        const prereqMap: Record<string, string[]> = {
            coder: ['PRD approved', 'Design spec ready', 'Database schema defined'],
            qa: ['Code implementation complete', 'Unit tests passing'],
            devops: ['Build successful', 'Tests passing'],
        };

        return prereqMap[agent] || ['Previous phase completed'];
    }

    /**
     * Get deliverables for agent
     */
    private getDeliverables(agent: string): string[] {
        const deliverableMap: Record<string, string[]> = {
            coder: ['Source code', 'Unit tests', 'Documentation'],
            qa: ['Test results', 'Bug reports', 'Coverage report'],
            devops: ['Deployment logs', 'Service URL', 'Monitoring dashboard'],
        };

        return deliverableMap[agent] || ['Completed work artifacts'];
    }

    /**
     * Get next agent in workflow
     */
    private getNextAgent(agent: string): string {
        const nextAgentMap: Record<string, string> = {
            pm: 'ux',
            ux: 'architect',
            architect: 'database',
            database: 'coder',
            coder: 'reviewer',
            reviewer: 'qa',
            qa: 'devops',
        };

        return nextAgentMap[agent] || 'reviewer';
    }

    /**
     * Get handoff action
     */
    private getHandoffAction(agent: string): string {
        const actionMap: Record<string, string> = {
            coder: 'Review code for production readiness',
            qa: 'Deploy to staging environment',
            devops: 'Monitor production deployment',
        };

        return actionMap[agent] || 'Review and validate deliverables';
    }
}
