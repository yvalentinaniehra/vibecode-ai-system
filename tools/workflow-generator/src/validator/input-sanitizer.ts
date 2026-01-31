// src/validator/input-sanitizer.ts

export class InputSanitizer {
    /**
     * Sanitize user story input to prevent code injection
     * @param input - Raw user input
     * @returns Sanitized string
     */
    sanitizeUserStory(input: string): string {
        return (
            input
                // Remove HTML tags
                .replace(/[<>]/g, '')
                // Remove control characters
                .replace(/[\x00-\x1F\x7F]/g, '')
                // Trim whitespace
                .trim()
                // Limit length
                .slice(0, 500)
        );
    }

    /**
     * Sanitize filename to be filesystem-safe
     * @param input - Raw filename input
     * @returns Safe filename (lowercase, alphanumeric + dash)
     */
    sanitizeFilename(input: string): string {
        return (
            input
                .toLowerCase()
                // Only alphanumeric and dash
                .replace(/[^a-z0-9-]/g, '-')
                // Collapse multiple dashes
                .replace(/-+/g, '-')
                // Trim dashes from start/end
                .replace(/^-|-$/g, '')
                // Limit length
                .slice(0, 100)
        );
    }

    /**
     * Sanitize tool names to prevent injection
     * @param toolName - Tool name from user
     * @returns Sanitized tool name
     */
    sanitizeToolName(toolName: string): string {
        return toolName
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 100);
    }
}
