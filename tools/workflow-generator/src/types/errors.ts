// src/types/errors.ts

export class SecurityError extends Error {
    constructor(
        message: string,
        public context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'SecurityError';
        Error.captureStackTrace(this, SecurityError);
    }
}

export class ValidationError extends Error {
    constructor(
        message: string,
        public line?: number
    ) {
        super(message);
        this.name = 'ValidationError';
        Error.captureStackTrace(this, ValidationError);
    }
}

export class ParserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ParserError';
        Error.captureStackTrace(this, ParserError);
    }
}

export class RegistryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RegistryError';
        Error.captureStackTrace(this, RegistryError);
    }
}
