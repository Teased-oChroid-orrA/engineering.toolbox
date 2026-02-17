/**
 * Validation builder utility for DRY validation patterns.
 * 
 * **Features:**
 * - Chainable validation API
 * - Type-safe validation rules
 * - Custom error messages
 * - Reusable validation schemas
 * 
 * **Usage:**
 * ```typescript
 * import { validator } from '$lib/utils/validation';
 * 
 * const errors = validator(value)
 *   .required('Field is required')
 *   .minLength(3, 'Must be at least 3 characters')
 *   .maxLength(50, 'Must be at most 50 characters')
 *   .custom((v) => v.startsWith('A'), 'Must start with A')
 *   .validate();
 * 
 * if (errors.length > 0) {
 *   // Handle validation errors
 * }
 * ```
 */

export interface ValidationError {
  rule: string;
  message: string;
}

export class ValidationBuilder<T> {
  private value: T;
  private errors: ValidationError[] = [];

  constructor(value: T) {
    this.value = value;
  }

  /**
   * Validate that value is not null/undefined/empty.
   */
  required(message: string = 'This field is required'): this {
    const isEmpty = 
      this.value === null ||
      this.value === undefined ||
      (typeof this.value === 'string' && this.value.trim() === '') ||
      (Array.isArray(this.value) && this.value.length === 0);

    if (isEmpty) {
      this.errors.push({ rule: 'required', message });
    }
    return this;
  }

  /**
   * Validate minimum length (for strings/arrays).
   */
  minLength(length: number, message?: string): this {
    if (typeof this.value === 'string' || Array.isArray(this.value)) {
      if (this.value.length < length) {
        this.errors.push({
          rule: 'minLength',
          message: message || `Must be at least ${length} characters`
        });
      }
    }
    return this;
  }

  /**
   * Validate maximum length (for strings/arrays).
   */
  maxLength(length: number, message?: string): this {
    if (typeof this.value === 'string' || Array.isArray(this.value)) {
      if (this.value.length > length) {
        this.errors.push({
          rule: 'maxLength',
          message: message || `Must be at most ${length} characters`
        });
      }
    }
    return this;
  }

  /**
   * Validate minimum value (for numbers).
   */
  min(value: number, message?: string): this {
    if (typeof this.value === 'number' && this.value < value) {
      this.errors.push({
        rule: 'min',
        message: message || `Must be at least ${value}`
      });
    }
    return this;
  }

  /**
   * Validate maximum value (for numbers).
   */
  max(value: number, message?: string): this {
    if (typeof this.value === 'number' && this.value > value) {
      this.errors.push({
        rule: 'max',
        message: message || `Must be at most ${value}`
      });
    }
    return this;
  }

  /**
   * Validate pattern match (for strings).
   */
  pattern(regex: RegExp, message: string = 'Invalid format'): this {
    if (typeof this.value === 'string' && !regex.test(this.value)) {
      this.errors.push({ rule: 'pattern', message });
    }
    return this;
  }

  /**
   * Validate email format.
   */
  email(message: string = 'Invalid email address'): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.pattern(emailRegex, message);
  }

  /**
   * Validate URL format.
   */
  url(message: string = 'Invalid URL'): this {
    try {
      if (typeof this.value === 'string') {
        new URL(this.value);
      }
    } catch {
      this.errors.push({ rule: 'url', message });
    }
    return this;
  }

  /**
   * Custom validation function.
   */
  custom(fn: (value: T) => boolean, message: string): this {
    if (!fn(this.value)) {
      this.errors.push({ rule: 'custom', message });
    }
    return this;
  }

  /**
   * Validate that value is one of allowed values.
   */
  oneOf(values: T[], message?: string): this {
    if (!values.includes(this.value)) {
      this.errors.push({
        rule: 'oneOf',
        message: message || `Must be one of: ${values.join(', ')}`
      });
    }
    return this;
  }

  /**
   * Get validation errors.
   */
  validate(): ValidationError[] {
    return this.errors;
  }

  /**
   * Check if validation passed.
   */
  isValid(): boolean {
    return this.errors.length === 0;
  }

  /**
   * Get first error message (or null if valid).
   */
  firstError(): string | null {
    return this.errors.length > 0 ? this.errors[0].message : null;
  }
}

/**
 * Create a validation builder for a value.
 * 
 * @param value - Value to validate
 * @returns ValidationBuilder instance
 */
export function validator<T>(value: T): ValidationBuilder<T> {
  return new ValidationBuilder(value);
}

/**
 * Validate multiple fields at once.
 * 
 * @param validations - Record of field validations
 * @returns Record of field errors
 * 
 * @example
 * const errors = validateMany({
 *   name: validator(name).required().minLength(3).validate(),
 *   email: validator(email).required().email().validate()
 * });
 */
export function validateMany(
  validations: Record<string, ValidationError[]>
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [field, errors] of Object.entries(validations)) {
    result[field] = errors.length > 0 ? errors[0].message : null;
  }
  return result;
}
