// src/validator/path-validator.ts

import path from 'path';
import { fileURLToPath } from 'url';
import { SecurityError, ValidationError } from '../types/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PathValidator {
    private readonly ALLOWED_BASE: string;

    constructor(allowedBase = '.agent/workflows') {
        // Calculate project root from this file's location:
        // validator/ -> src/ -> workflow-generator/ -> tools/ -> control-agent-full/
        const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
        this.ALLOWED_BASE = path.join(projectRoot, allowedBase);
    }

    /**
     * Validates output path to prevent path traversal attacks
     * @param userPath - User-provided path
     * @returns Validated absolute path
     * @throws SecurityError if path traversal detected
     * @throws ValidationError if invalid filename
     */
    validateOutputPath(userPath: string): string {
        // Normalize to prevent ../ attacks
        const normalized = path.normalize(userPath);
        const resolved = path.resolve(this.ALLOWED_BASE, normalized);

        // Ensure resolved path is within allowed directory
        if (!resolved.startsWith(this.ALLOWED_BASE)) {
            throw new SecurityError('Path traversal detected', {
                attempted: userPath,
                resolved,
                allowed: this.ALLOWED_BASE,
            });
        }

        // Validate filename
        const basename = path.basename(resolved);
        if (!basename.endsWith('.md')) {
            throw new ValidationError('Workflow files must end with .md');
        }

        // Check for suspicious characters
        if (/[<>:"|?*]/.test(basename)) {
            throw new ValidationError('Invalid characters in filename');
        }

        // Prevent hidden files
        if (basename.startsWith('.')) {
            throw new ValidationError('Workflow files cannot be hidden');
        }

        return resolved;
    }

    /**
     * Check if path exists and is within allowed directory
     */
    isValidWorkflowPath(filePath: string): boolean {
        try {
            const resolved = path.resolve(filePath);
            return resolved.startsWith(this.ALLOWED_BASE) && resolved.endsWith('.md');
        } catch {
            return false;
        }
    }
}
