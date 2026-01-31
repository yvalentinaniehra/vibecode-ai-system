// src/types/index.ts

export type AgentType =
    | 'research'
    | 'strategy'
    | 'pm'
    | 'ux'
    | 'architect'
    | 'database'
    | 'coder'
    | 'reviewer'
    | 'qa'
    | 'devops';

export interface AgentDefinition {
    name: string;
    phase: string;
    model: string;
    modelReason: string;
    keywords: string[];
    defaultTools: string[];
}

export interface ToolDefinition {
    name: string;
    category: string;
    description: string;
}

export interface ParsedStory {
    intent: string;
    domain: string;
    keywords: string[];
    rawInput: string;
    confidence: number;
}

export interface AgentMatch {
    agent: AgentType;
    phase: string;
    model: string;
    modelJustification: string;
    confidence: number;
}

export interface ToolSelection {
    primary: string[];
    optional: string[];
}

export interface WorkflowStep {
    number: number;
    title: string;
    description: string;
    turbo?: boolean;
    code?: string;
}

export interface TemplateData {
    description: string;
    agentName: string;
    phase: string;
    aiModel: string;
    tools: string[];
    steps: WorkflowStep[];
    relatedFiles: string[];
}

export interface BuildOptions {
    outputPath?: string;
    overwrite?: boolean;
    preview?: boolean;
    dryRun?: boolean;
}

export interface BuildResult {
    success: boolean;
    filePath: string;
    content: string;
    validationErrors?: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    line: number;
    message: string;
    severity: 'error' | 'warning';
}

export interface ValidationWarning {
    line: number;
    message: string;
}
