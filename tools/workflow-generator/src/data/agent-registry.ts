// src/data/agent-registry.ts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AgentType, AgentDefinition } from '../types/index.js';
import { RegistryError } from '../types/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgentRegistry {
    private agents: Map<AgentType, AgentDefinition>;
    private configPath: string;

    constructor(configPath?: string) {
        // Resolve from project root (4 levels up from dist/data/)
        const projectRoot = path.resolve(__dirname, '../../../../');
        this.configPath = configPath
            ? path.resolve(configPath)
            : path.join(projectRoot, '.agent/config/agent-registry.json');
        this.agents = new Map();
        this.load();
    }

    /**
     * Load agent definitions from JSON config
     * @throws RegistryError if config file not found or invalid
     */
    private load(): void {
        if (!fs.existsSync(this.configPath)) {
            throw new RegistryError(`Agent registry not found: ${this.configPath}`);
        }

        try {
            const raw = fs.readFileSync(this.configPath, 'utf-8');
            const config = JSON.parse(raw) as Record<string, AgentDefinition>;

            // Validate and load
            for (const [key, value] of Object.entries(config)) {
                this.validateAgentDefinition(value);
                this.agents.set(key as AgentType, value);
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new RegistryError(`Invalid JSON in agent registry: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Validate agent definition structure
     */
    private validateAgentDefinition(def: AgentDefinition): void {
        const required = ['name', 'phase', 'model', 'modelReason', 'keywords', 'defaultTools'];
        for (const field of required) {
            if (!(field in def)) {
                throw new RegistryError(`Agent definition missing required field: ${field}`);
            }
        }

        if (!Array.isArray(def.keywords) || def.keywords.length === 0) {
            throw new RegistryError('Agent must have at least one keyword');
        }
    }

    /**
     * Get agent definition by type
     */
    get(agentType: AgentType): AgentDefinition | undefined {
        return this.agents.get(agentType);
    }

    /**
     * Get all agent definitions
     */
    getAll(): AgentDefinition[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get all agent types
     */
    getTypes(): AgentType[] {
        return Array.from(this.agents.keys());
    }

    /**
     * Find agents by keyword match
     * @param keywords - Keywords to search
     * @returns Array of matching agent types with confidence scores
     */
    findByKeywords(keywords: string[]): Array<{ agent: AgentType; score: number }> {
        const results: Array<{ agent: AgentType; score: number }> = [];

        for (const [agentType, definition] of this.agents.entries()) {
            let score = 0;
            const agentKeywords = definition.keywords.map((k) => k.toLowerCase());

            for (const keyword of keywords) {
                const lowerKeyword = keyword.toLowerCase();
                // Exact match
                if (agentKeywords.includes(lowerKeyword)) {
                    score += 1.0;
                }
                // Partial match
                else if (agentKeywords.some((k) => k.includes(lowerKeyword) || lowerKeyword.includes(k))) {
                    score += 0.5;
                }
            }

            if (score > 0) {
                results.push({ agent: agentType, score });
            }
        }

        // Sort by score descending
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Hot reload registry from disk
     */
    reload(): void {
        this.agents.clear();
        this.load();
    }

    /**
     * Check if agent type exists
     */
    has(agentType: AgentType): boolean {
        return this.agents.has(agentType);
    }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();
