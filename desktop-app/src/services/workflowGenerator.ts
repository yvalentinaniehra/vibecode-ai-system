// src/services/workflowGenerator.ts

import { invoke } from '@tauri-apps/api/core';

export interface WorkflowResult {
    success: boolean;
    content: string;
    filename: string;
    errors: string[];
}

export interface SaveResult {
    success: boolean;
    path?: string;
    error?: string;
}

export interface AgentInfo {
    name: string;
    phase: string;
    model: string;
    keywords: string[];
}

export interface AgentsResult {
    success: boolean;
    agents?: AgentInfo[];
    error?: string;
}

/**
 * Generate workflow from user story
 */
export async function generateWorkflow(userStory: string): Promise<WorkflowResult> {
    try {
        const result = await invoke<WorkflowResult>('generate_workflow', { userStory });
        return result;
    } catch (error) {
        console.error('Failed to generate workflow:', error);
        throw new Error(String(error));
    }
}

/**
 * Save workflow to file
 */
export async function saveWorkflow(content: string, filename: string): Promise<SaveResult> {
    try {
        const result = await invoke<SaveResult>('save_workflow', { content, filename });
        return result;
    } catch (error) {
        console.error('Failed to save workflow:', error);
        throw new Error(String(error));
    }
}

/**
 * List all available agents
 */
export async function listAgents(): Promise<AgentsResult> {
    try {
        const result = await invoke<AgentsResult>('list_agents');
        return result;
    } catch (error) {
        console.error('Failed to list agents:', error);
        throw new Error(String(error));
    }
}
