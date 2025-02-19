import { 
  validateRequired, 
  validateEmail, 
  validatePassword, 
  validateDate, 
  validateDateRange, 
  validateLength 
} from '../../src/utils/validation.util';

import { 
  ERROR_MESSAGES, 
  PASSWORD_RULES, 
  EMAIL_PATTERN, 
  DATE_RULES 
} from '../../src/constants/validation.constants';

import { performance } from 'jest-performance';

describe('validateRequired', () => {
  it('should validate non-empty values correctly', () => {
    expect(validateRequired('test', 'Field').isValid).toBe(true);
    expect(validateRequired(['item'], 'Field').isValid).toBe(true);
    expect(validateRequired({ key: 'value' }, 'Field').isValid).toBe(true);
  });

  it('should reject empty or invalid values', () => {
    expect(validateRequired('', 'Field').isValid).toBe(false);
    expect(validateRequired(null, 'Field').isValid).toBe(false);
    expect(validateRequired(undefined, 'Field').isValid).toBe(false);
    expect(validateRequired([], 'Field').isValid).toBe(false);
    expect(validateRequired({}, 'Field').isValid).toBe(false);
  });

  it('should prevent XSS in input values', () => {
    const result = validateRequired('<script>alert("xss")</script>', 'Field');
    expect(result.isValid).toBe(true);
    expect(result.metadata?.sanitizedValue).not.toContain('<script>');
  });

  it('should include proper ARIA attributes', () => {
    const result = validateRequired('', 'Field');
    expect(result.aria).toEqual({
      'aria-required': 'true',
      'aria-invalid': 'true',
      'aria-errormessage': 'Field-error'
    });
  });

  it('should meet performance benchmarks', async () => {
    const { duration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        validateRequired('test', 'Field');
      }
    });
    expect(duration).toBeLessThan(100); // 100ms for 1000 validations
  });
});

describe('validateEmail', () => {
  it('should validate correct email formats', () => {
    expect(validateEmail('user@domain.com').isValid).toBe(true);
    expect(validateEmail('user.name+tag@domain.co.uk').isValid).toBe(true);
  });

  it('should reject invalid email formats', () => {
    expect(validateEmail('invalid.email').isValid).toBe(false);
    expect(validateEmail('user@').isValid).toBe(false);
    expect(validateEmail('@domain.com').isValid).toBe(false);
    expect(validateEmail('user@domain').isValid).toBe(false);
  });

  it('should enforce email length limits', () => {
    const longEmail = 'a'.repeat(255) + '@domain.com';
    expect(validateEmail(longEmail).isValid).toBe(false);
  });

  it('should prevent email security vulnerabilities', () => {
    const result = validateEmail('user@domain.com<script>');
    expect(result.isValid).toBe(true);
    expect(result.metadata?.sanitizedValue).not.toContain('<script>');
  });

  it('should meet performance benchmarks', async () => {
    const { duration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        validateEmail('test@domain.com');
      }
    });
    expect(duration).toBeLessThan(200); // 200ms for 1000 validations
  });
});

describe('validatePassword', () => {
  it('should validate password complexity requirements', () => {
    const validPassword = 'Test123!@#$';
    const result = validatePassword(validPassword);
    expect(result.isValid).toBe(true);
    expect(result.metadata?.strength).toBeGreaterThan(80);
  });

  it('should reject passwords not meeting requirements', () => {
    expect(validatePassword('short').isValid).toBe(false);
    expect(validatePassword('nouppercase123!').isValid).toBe(false);
    expect(validatePassword('NOLOWERCASE123!').isValid).toBe(false);
    expect(validatePassword('NoSpecialChar123').isValid).toBe(false);
    expect(validatePassword('NoNumber!@#').isValid).toBe(false);
  });

  it('should calculate password strength score', () => {
    const result = validatePassword('Test123!@#$');
    expect(result.metadata?.strength).toBeDefined();
    expect(result.metadata?.strength).toBeGreaterThanOrEqual(0);
    expect(result.metadata?.strength).toBeLessThanOrEqual(100);
  });

  it('should meet performance benchmarks', async () => {
    const { duration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        validatePassword('Test123!@#$');
      }
    });
    expect(duration).toBeLessThan(300); // 300ms for 1000 validations
  });
});

describe('validateDate', () => {
  it('should validate dates correctly', () => {
    const futureDate = new Date(Date.now() + 86400000); // Tomorrow
    expect(validateDate(futureDate).isValid).toBe(true);
  });

  it('should reject invalid dates', () => {
    expect(validateDate(new Date('invalid')).isValid).toBe(false);
    expect(validateDate(new Date('2020-13-45')).isValid).toBe(false);
  });

  it('should handle timezone conversions', () => {
    const date = new Date();
    const result = validateDate(date, true, 'America/New_York');
    expect(result.metadata?.timezone).toBe('America/New_York');
  });

  it('should enforce future date requirement when specified', () => {
    const pastDate = new Date(Date.now() - 86400000); // Yesterday
    expect(validateDate(pastDate, false).isValid).toBe(false);
  });

  it('should meet performance benchmarks', async () => {
    const { duration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        validateDate(new Date());
      }
    });
    expect(duration).toBeLessThan(200); // 200ms for 1000 validations
  });
});

describe('validateDateRange', () => {
  it('should validate correct date ranges', () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 86400000);
    expect(validateDateRange(startDate, endDate).isValid).toBe(true);
  });

  it('should reject invalid date ranges', () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() - 86400000);
    expect(validateDateRange(startDate, endDate).isValid).toBe(false);
  });

  it('should calculate duration in days', () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 86400000 * 5); // 5 days
    const result = validateDateRange(startDate, endDate);
    expect(result.metadata?.durationDays).toBe(5);
  });

  it('should handle timezone edge cases', () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 86400000);
    const result = validateDateRange(startDate, endDate, 'Asia/Tokyo');
    expect(result.metadata?.timezone).toBe('Asia/Tokyo');
  });

  it('should meet performance benchmarks', async () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 86400000);
    const { duration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        validateDateRange(startDate, endDate);
      }
    });
    expect(duration).toBeLessThan(300); // 300ms for 1000 validations
  });
});

describe('validateLength', () => {
  it('should validate string lengths correctly', () => {
    expect(validateLength('test', 3, 10, 'Field').isValid).toBe(true);
    expect(validateLength('test', 5, 10, 'Field').isValid).toBe(false);
    expect(validateLength('toolongstring', 3, 5, 'Field').isValid).toBe(false);
  });

  it('should handle multi-byte characters', () => {
    const multiByteString = '测试'; // Chinese characters
    expect(validateLength(multiByteString, 1, 5, 'Field').isValid).toBe(true);
  });

  it('should sanitize input for security', () => {
    const result = validateLength('<script>alert("xss")</script>', 3, 50, 'Field');
    expect(result.metadata?.sanitizedValue).not.toContain('<script>');
  });

  it('should include proper error messages', () => {
    const tooShort = validateLength('a', 3, 10, 'Field');
    expect(tooShort.error).toBe(ERROR_MESSAGES.MIN_LENGTH('Field', 3));

    const tooLong = validateLength('toolongstring', 3, 5, 'Field');
    expect(tooLong.error).toBe(ERROR_MESSAGES.MAX_LENGTH('Field', 5));
  });

  it('should meet performance benchmarks', async () => {
    const { duration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        validateLength('test', 3, 10, 'Field');
      }
    });
    expect(duration).toBeLessThan(100); // 100ms for 1000 validations
  });
});