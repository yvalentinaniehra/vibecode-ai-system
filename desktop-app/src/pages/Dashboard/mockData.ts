/**
 * Mock data for Dashboard
 * Used as fallbacks when real data is not available
 */
import { QuotaDisplayItem, UsageChartData, TokenUsageData, TreeSectionState } from '../../types';

export const mockQuotas: QuotaDisplayItem[] = [
    { id: 'gemini', label: 'Gemini 3', type: 'group', remaining: 85, resetTime: '2h 15m', hasData: true, themeColor: '#4285f4' },
    { id: 'claude', label: 'Claude 4.5', type: 'group', remaining: 62, resetTime: '5h 30m', hasData: true, themeColor: '#8b5cf6' },
    { id: 'gpt', label: 'GPT-4o', type: 'group', remaining: 100, resetTime: '23h', hasData: true, themeColor: '#22c55e' },
];

export const mockChartData: UsageChartData = {
    buckets: [
        {
            startTime: Date.now() - 90 * 60000, endTime: Date.now() - 80 * 60000, items: [
                { groupId: 'Gemini', usage: 5, color: '#4285f4' },
                { groupId: 'Claude', usage: 8, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 80 * 60000, endTime: Date.now() - 70 * 60000, items: [
                { groupId: 'Gemini', usage: 12, color: '#4285f4' },
                { groupId: 'Claude', usage: 6, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 70 * 60000, endTime: Date.now() - 60 * 60000, items: [
                { groupId: 'Gemini', usage: 8, color: '#4285f4' },
                { groupId: 'Claude', usage: 15, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 60 * 60000, endTime: Date.now() - 50 * 60000, items: [
                { groupId: 'Gemini', usage: 18, color: '#4285f4' },
                { groupId: 'Claude', usage: 10, color: '#8b5cf6' },
            ]
        },
        {
            startTime: Date.now() - 50 * 60000, endTime: Date.now() - 40 * 60000, items: [
                { groupId: 'Gemini', usage: 22, color: '#4285f4' },
                { groupId: 'Claude', usage: 12, color: '#8b5cf6' },
            ]
        },
    ],
    maxUsage: 25,
    displayMinutes: 90,
    interval: 10,
    prediction: {
        groupId: 'claude',
        groupLabel: 'Claude 4.5',
        usageRate: 12.5,
        runway: '~5h',
        remaining: 62,
    },
};

export const mockTokenUsage: TokenUsageData = {
    promptCredits: { available: 45000, monthly: 100000, usedPercentage: 55, remainingPercentage: 45 },
    flowCredits: { available: 8000, monthly: 20000, usedPercentage: 60, remainingPercentage: 40 },
    totalAvailable: 53000,
    totalMonthly: 120000,
    overallRemainingPercentage: 44,
    formatted: {
        promptAvailable: '45K',
        promptMonthly: '100K',
        flowAvailable: '8K',
        flowMonthly: '20K',
        totalAvailable: '53K',
        totalMonthly: '120K',
    },
};

export const mockBrainTasks: TreeSectionState = {
    title: 'Brain',
    stats: '3 Tasks • 45MB',
    collapsed: true,
    folders: [
        {
            id: '1', label: 'vibecode-desktop-app', size: '25MB', files: [
                { name: 'implementation_plan.md', path: '/brain/1/implementation_plan.md' },
                { name: 'task.md', path: '/brain/1/task.md' },
                { name: 'walkthrough.md', path: '/brain/1/walkthrough.md' },
            ]
        },
        {
            id: '2', label: 'api-integration', size: '15MB', files: [
                { name: 'research.md', path: '/brain/2/research.md' },
            ]
        },
        { id: '3', label: 'bug-fix-session', size: '5MB', files: [] },
    ],
};

export const mockCodeTracker: TreeSectionState = {
    title: 'Code Tracker',
    stats: '2 Projects • 120MB',
    collapsed: true,
    folders: [
        { id: 'proj1', label: 'control-agent-full', size: '80MB', files: [] },
        { id: 'proj2', label: 'educrm-frontend', size: '40MB', files: [] },
    ],
};
