// src/parser/agent-matcher.ts

import type { ParsedStory, AgentMatch, AgentType } from '../types/index.js';
import { agentRegistry } from '../data/agent-registry.js';

export class AgentMatcher {
    /**
     * Match parsed story to appropriate agent
     * @param parsed - Parsed user story
     * @returns Agent match with confidence
     */
    match(parsed: ParsedStory): AgentMatch {
        // Find agents by keyword matching
        const matches = agentRegistry.findByKeywords(parsed.keywords);

        if (matches.length === 0) {
            // Fallback to domain-based matching
            return this.matchByDomain(parsed.domain);
        }

        // Get top match
        const topMatch = matches[0];
        const agentDef = agentRegistry.get(topMatch.agent)!;

        // Combine parser confidence with keyword match score
        const confidence = Math.min((parsed.confidence + topMatch.score / 3) / 2, 1.0);

        return {
            agent: topMatch.agent,
            phase: agentDef.phase,
            model: agentDef.model,
            modelJustification: agentDef.modelReason,
            confidence,
        };
    }

    /**
     * Suggest alternative agents when confidence is low
     * @param parsed - Parsed user story
     * @returns Top 3 agent suggestions
     */
    suggestAlternatives(parsed: ParsedStory): AgentMatch[] {
        const matches = agentRegistry.findByKeywords(parsed.keywords);

        return matches.slice(0, 3).map((match) => {
            const agentDef = agentRegistry.get(match.agent)!;
            return {
                agent: match.agent,
                phase: agentDef.phase,
                model: agentDef.model,
                modelJustification: agentDef.modelReason,
                confidence: match.score / 3, // Lower confidence for alternatives
            };
        });
    }

    /**
     * Fallback matching by domain
     */
    private matchByDomain(domain: string): AgentMatch {
        const domainToAgent: Record<string, AgentType> = {
            backend: 'coder',
            frontend: 'coder',
            database: 'database',
            devops: 'devops',
            testing: 'qa',
            design: 'ux',
            unknown: 'coder', // Default fallback
        };

        const agentType = domainToAgent[domain] || 'coder';
        const agentDef = agentRegistry.get(agentType)!;

        return {
            agent: agentType,
            phase: agentDef.phase,
            model: agentDef.model,
            modelJustification: agentDef.modelReason,
            confidence: 0.5, // Medium confidence for domain-based match
        };
    }
}
