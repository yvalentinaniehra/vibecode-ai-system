// src/parser/tool-selector.ts

import type { AgentType, ToolSelection } from '../types/index.js';
import { agentRegistry } from '../data/agent-registry.js';
import { toolRegistry } from '../data/tool-registry.js';

export class ToolSelector {
    /**
     * Select appropriate tools for agent
     * @param agent - Agent type
     * @returns Primary and optional tools
     */
    selectForAgent(agent: AgentType): ToolSelection {
        const agentDef = agentRegistry.get(agent);
        if (!agentDef) {
            return { primary: [], optional: [] };
        }

        // Get default tools from agent definition
        const primary = agentDef.defaultTools.filter((tool) => toolRegistry.exists(tool));

        // Suggest optional tools based on agent category
        const optional = this.suggestOptionalTools(agent);

        return { primary, optional };
    }

    /**
     * Validate if tool exists in registry
     */
    validateToolExists(toolName: string): boolean {
        return toolRegistry.exists(toolName);
    }

    /**
     * Suggest optional tools based on agent type
     */
    private suggestOptionalTools(agent: AgentType): string[] {
        const suggestions: Record<AgentType, string[]> = {
            research: ['search_web'],
            strategy: ['mcp_notebooklm_list_notebooks'],
            pm: ['view_file'],
            ux: ['generate_image'],
            architect: ['mcp_perplexity-ask_perplexity_ask'],
            database: ['mcp_supabase-mcp-server_list_tables'],
            coder: ['grep_search', 'view_file'],
            reviewer: ['grep_search'],
            qa: ['browser_subagent'],
            devops: ['mcp_cloudrun_get_service_log'],
        };

        return (suggestions[agent] || []).filter((tool) => toolRegistry.exists(tool));
    }

    /**
     * Get tools by category
     */
    getToolsByCategory(category: string): string[] {
        return toolRegistry.getByCategory(category).map((tool) => tool.name);
    }
}
