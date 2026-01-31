// src/parser/story-parser.ts

import type { ParsedStory } from '../types/index.js';
import { ParserError } from '../types/errors.js';
import { InputSanitizer } from '../validator/input-sanitizer.js';

export interface ParserConfig {
    useAI?: boolean;
    confidenceThreshold?: number;
}

export class StoryParser {
    private sanitizer: InputSanitizer;

    constructor() {
        this.sanitizer = new InputSanitizer();
    }

    /**
     * Parse user story into structured data
     * @param userStory - Raw user input
     * @param config - Parser configuration
     * @returns Parsed story with intent, domain, and keywords
     */
    async parse(userStory: string, config: ParserConfig = {}): Promise<ParsedStory> {
        const { useAI = false, confidenceThreshold = 0.7 } = config;

        // Sanitize input
        const sanitized = this.sanitizer.sanitizeUserStory(userStory);
        if (!sanitized) {
            throw new ParserError('User story cannot be empty');
        }

        // Extract keywords using simple NLP
        const keywords = this.extractKeywords(sanitized);

        // Determine intent and domain
        const intent = this.extractIntent(sanitized, keywords);
        const domain = this.extractDomain(sanitized, keywords);

        // Calculate confidence based on keyword matches
        const confidence = this.calculateConfidence(intent, domain, keywords);

        // If confidence is low and AI is enabled, use Claude API
        if (useAI && confidence < confidenceThreshold) {
            return await this.parseWithAI(sanitized);
        }

        return {
            intent,
            domain,
            keywords,
            rawInput: userStory,
            confidence,
        };
    }

    /**
     * Extract keywords from text
     */
    private extractKeywords(text: string): string[] {
        const words = text
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3); // Filter short words

        // Remove common stop words
        const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'would', 'should']);
        return words.filter((word) => !stopWords.has(word));
    }

    /**
     * Extract intent from user story
     */
    private extractIntent(text: string, keywords: string[]): string {
        const intentMap: Record<string, string[]> = {
            deploy: ['deploy', 'deployment', 'production', 'release'],
            create: ['create', 'build', 'develop', 'implement', 'add'],
            test: ['test', 'testing', 'qa', 'verify'],
            design: ['design', 'mockup', 'ui', 'ux', 'prototype'],
            analyze: ['analyze', 'research', 'study', 'investigate'],
            review: ['review', 'audit', 'check', 'validate'],
            fix: ['fix', 'bug', 'error', 'issue'],
            refactor: ['refactor', 'optimize', 'improve'],
        };

        for (const [intent, intentKeywords] of Object.entries(intentMap)) {
            if (keywords.some((kw) => intentKeywords.includes(kw))) {
                return intent;
            }
        }

        return 'unknown';
    }

    /**
     * Extract domain from user story
     */
    private extractDomain(text: string, keywords: string[]): string {
        const domainMap: Record<string, string[]> = {
            backend: ['backend', 'api', 'server', 'database', 'sql'],
            frontend: ['frontend', 'ui', 'component', 'react', 'page'],
            database: ['database', 'schema', 'migration', 'prisma', 'sql'],
            devops: ['deploy', 'docker', 'cloud', 'ci/cd', 'cloudrun'],
            testing: ['test', 'qa', 'e2e', 'integration'],
            design: ['design', 'mockup', 'figma', 'ui', 'ux'],
        };

        for (const [domain, domainKeywords] of Object.entries(domainMap)) {
            if (keywords.some((kw) => domainKeywords.includes(kw))) {
                return domain;
            }
        }

        return 'unknown';
    }

    /**
     * Calculate confidence score
     */
    private calculateConfidence(intent: string, domain: string, keywords: string[]): number {
        let score = 0;

        // Intent identified
        if (intent !== 'unknown') score += 0.4;

        // Domain identified
        if (domain !== 'unknown') score += 0.4;

        // Has meaningful keywords
        if (keywords.length >= 2) score += 0.2;

        return Math.min(score, 1.0);
    }

    /**
     * Parse using Claude API (placeholder for now)
     * TODO: Implement in next iteration
     */
    private async parseWithAI(userStory: string): Promise<ParsedStory> {
        // Placeholder - will implement with Anthropic SDK
        throw new ParserError('AI parsing not yet implemented');
    }
}
