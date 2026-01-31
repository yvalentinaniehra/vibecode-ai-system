// src/data/tool-registry.ts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ToolDefinition } from '../types/index.js';
import { RegistryError } from '../types/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ToolRegistry {
    private tools: Map<string, ToolDefinition>;
    private configPath: string;

    constructor(configPath?: string) {
        // Resolve from project root (4 levels up from dist/data/)
        const projectRoot = path.resolve(__dirname, '../../../../');
        this.configPath = configPath
            ? path.resolve(configPath)
            : path.join(projectRoot, '.agent/config/tool-registry.json');
        this.tools = new Map();
        this.load();
    }

    /**
     * Load tool definitions from JSON config
     * @throws RegistryError if config file not found or invalid
     */
    private load(): void {
        if (!fs.existsSync(this.configPath)) {
            throw new RegistryError(`Tool registry not found: ${this.configPath}`);
        }

        try {
            const raw = fs.readFileSync(this.configPath, 'utf-8');
            const config = JSON.parse(raw) as Record<string, ToolDefinition>;

            // Validate and load
            for (const [key, value] of Object.entries(config)) {
                this.validateToolDefinition(value);
                this.tools.set(key, value);
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new RegistryError(`Invalid JSON in tool registry: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Validate tool definition structure
     */
    private validateToolDefinition(def: ToolDefinition): void {
        const required = ['name', 'category', 'description'];
        for (const field of required) {
            if (!(field in def)) {
                throw new RegistryError(`Tool definition missing required field: ${field}`);
            }
        }
    }

    /**
     * Check if tool exists in registry
     */
    exists(toolName: string): boolean {
        return this.tools.has(toolName);
    }

    /**
     * Get tool definition by name
     */
    get(toolName: string): ToolDefinition | undefined {
        return this.tools.get(toolName);
    }

    /**
     * Get all tool definitions
     */
    getAll(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get all tool names
     */
    getNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * Get tools by category
     */
    getByCategory(category: string): ToolDefinition[] {
        return Array.from(this.tools.values()).filter((tool) => tool.category === category);
    }

    /**
     * Get all categories
     */
    getCategories(): string[] {
        const categories = new Set<string>();
        for (const tool of this.tools.values()) {
            categories.add(tool.category);
        }
        return Array.from(categories).sort();
    }

    /**
     * Validate array of tool names
     * @returns Object with valid and invalid tool names
     */
    validateTools(toolNames: string[]): { valid: string[]; invalid: string[] } {
        const valid: string[] = [];
        const invalid: string[] = [];

        for (const toolName of toolNames) {
            if (this.exists(toolName)) {
                valid.push(toolName);
            } else {
                invalid.push(toolName);
            }
        }

        return { valid, invalid };
    }

    /**
     * Hot reload registry from disk
     */
    reload(): void {
        this.tools.clear();
        this.load();
    }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
