import { Injectable } from '../../infrastructure/di/index.js';

export interface ValidationRule<T = any> {
  name: string;
  message: string;
  validate: (value: T, context?: any) => boolean | Promise<boolean>;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

@Injectable()
export class ValidationService {
  private rules = new Map<string, ValidationRule>();

  constructor() {
    this.registerBuiltInRules();
  }

  /**
   * Register a validation rule
   */
  registerRule<T = any>(rule: ValidationRule<T>): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * Get a validation rule by name
   */
  getRule(name: string): ValidationRule | undefined {
    return this.rules.get(name);
  }

  /**
   * Validate a single value against rules
   */
  async validateField(
    value: any,
    rules: ValidationRule[],
    context?: any
  ): Promise<string[]> {
    const errors: string[] = [];

    for (const rule of rules) {
      try {
        const isValid = await rule.validate(value, context);
        if (!isValid) {
          errors.push(rule.message);
        }
      } catch (error) {
        errors.push(`Validation error: ${error.message}`);
      }
    }

    return errors;
  }

  /**
   * Validate an object against a schema
   */
  async validate(
    data: Record<string, any>,
    schema: ValidationSchema,
    context?: any
  ): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {};
    let valid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = await this.validateField(value, rules, context);
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        valid = false;
      }
    }

    return { valid, errors };
  }

  /**
   * Create validation rules using builders
   */
  field(name: string): FieldValidator {
    return new FieldValidator(name, this);
  }

  /**
   * Built-in validation rules
   */
  private registerBuiltInRules(): void {
    // Required
    this.registerRule({
      name: 'required',
      message: 'This field is required',
      validate: (value) => value !== null && value !== undefined && value !== '',
    });

    // String length
    this.registerRule({
      name: 'minLength',
      message: 'Value is too short',
      validate: (value, context) => {
        if (typeof value !== 'string') return false;
        return value.length >= (context?.min || 0);
      },
    });

    this.registerRule({
      name: 'maxLength',
      message: 'Value is too long',
      validate: (value, context) => {
        if (typeof value !== 'string') return false;
        return value.length <= (context?.max || Infinity);
      },
    });

    // Numeric
    this.registerRule({
      name: 'min',
      message: 'Value is too small',
      validate: (value, context) => {
        const num = Number(value);
        if (isNaN(num)) return false;
        return num >= (context?.min || 0);
      },
    });

    this.registerRule({
      name: 'max',
      message: 'Value is too large',
      validate: (value, context) => {
        const num = Number(value);
        if (isNaN(num)) return false;
        return num <= (context?.max || Infinity);
      },
    });

    this.registerRule({
      name: 'positive',
      message: 'Value must be positive',
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
    });

    this.registerRule({
      name: 'integer',
      message: 'Value must be an integer',
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && Number.isInteger(num);
      },
    });

    // Format validations
    this.registerRule({
      name: 'email',
      message: 'Invalid email format',
      validate: (value) => {
        if (typeof value !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
    });

    this.registerRule({
      name: 'phone',
      message: 'Invalid phone number format',
      validate: (value) => {
        if (typeof value !== 'string') return false;
        const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
        return phoneRegex.test(value.replace(/\s/g, ''));
      },
    });

    this.registerRule({
      name: 'url',
      message: 'Invalid URL format',
      validate: (value) => {
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
    });

    // Date validations
    this.registerRule({
      name: 'date',
      message: 'Invalid date',
      validate: (value) => {
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
    });

    this.registerRule({
      name: 'futureDate',
      message: 'Date must be in the future',
      validate: (value) => {
        const date = new Date(value);
        return !isNaN(date.getTime()) && date > new Date();
      },
    });

    this.registerRule({
      name: 'pastDate',
      message: 'Date must be in the past',
      validate: (value) => {
        const date = new Date(value);
        return !isNaN(date.getTime()) && date < new Date();
      },
    });

    // Business-specific validations
    this.registerRule({
      name: 'karat',
      message: 'Karat must be between 1 and 24',
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num >= 1 && num <= 24 && Number.isInteger(num);
      },
    });

    this.registerRule({
      name: 'weight',
      message: 'Weight must be a positive number',
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
    });

    this.registerRule({
      name: 'percentage',
      message: 'Value must be between 0 and 100',
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
    });

    this.registerRule({
      name: 'currency',
      message: 'Invalid currency amount',
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num >= 0 && Number.isFinite(num);
      },
    });
  }
}

/**
 * Fluent API for building validation rules
 */
export class FieldValidator {
  private validationRules: ValidationRule[] = [];

  constructor(
    private fieldName: string,
    private validationService: ValidationService
  ) {}

  required(message?: string): this {
    this.validationRules.push({
      name: 'required',
      message: message || `${this.fieldName} is required`,
      validate: (value) => value !== null && value !== undefined && value !== '',
    });
    return this;
  }

  minLength(min: number, message?: string): this {
    this.validationRules.push({
      name: 'minLength',
      message: message || `${this.fieldName} must be at least ${min} characters`,
      validate: (value) => {
        if (typeof value !== 'string') return false;
        return value.length >= min;
      },
    });
    return this;
  }

  maxLength(max: number, message?: string): this {
    this.validationRules.push({
      name: 'maxLength',
      message: message || `${this.fieldName} must be no more than ${max} characters`,
      validate: (value) => {
        if (typeof value !== 'string') return false;
        return value.length <= max;
      },
    });
    return this;
  }

  min(min: number, message?: string): this {
    this.validationRules.push({
      name: 'min',
      message: message || `${this.fieldName} must be at least ${min}`,
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num >= min;
      },
    });
    return this;
  }

  max(max: number, message?: string): this {
    this.validationRules.push({
      name: 'max',
      message: message || `${this.fieldName} must be no more than ${max}`,
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num <= max;
      },
    });
    return this;
  }

  email(message?: string): this {
    this.validationRules.push({
      name: 'email',
      message: message || `${this.fieldName} must be a valid email address`,
      validate: (value) => {
        if (typeof value !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
    });
    return this;
  }

  phone(message?: string): this {
    this.validationRules.push({
      name: 'phone',
      message: message || `${this.fieldName} must be a valid phone number`,
      validate: (value) => {
        if (typeof value !== 'string') return false;
        const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
        return phoneRegex.test(value.replace(/\s/g, ''));
      },
    });
    return this;
  }

  positive(message?: string): this {
    this.validationRules.push({
      name: 'positive',
      message: message || `${this.fieldName} must be a positive number`,
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
    });
    return this;
  }

  integer(message?: string): this {
    this.validationRules.push({
      name: 'integer',
      message: message || `${this.fieldName} must be an integer`,
      validate: (value) => {
        const num = Number(value);
        return !isNaN(num) && Number.isInteger(num);
      },
    });
    return this;
  }

  custom(validator: (value: any, context?: any) => boolean | Promise<boolean>, message: string): this {
    this.validationRules.push({
      name: 'custom',
      message,
      validate: validator,
    });
    return this;
  }

  getRules(): ValidationRule[] {
    return [...this.validationRules];
  }
}
