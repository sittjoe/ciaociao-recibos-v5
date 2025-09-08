/**
 * Form validation utilities and common validation functions
 */

/**
 * Validates an email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates an Irish phone number (mobile and landline)
 */
export const isValidIrishPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Irish mobile: 08X XXX XXXX (10 digits starting with 08)
  // Irish landline: 0XX XXX XXXX (9-10 digits starting with 0)
  // International: +353 XX XXX XXXX
  
  if (cleaned.startsWith('353')) {
    return cleaned.length === 12 && /^353[0-9]{9}$/.test(cleaned);
  }
  
  if (cleaned.startsWith('0')) {
    return (cleaned.length === 9 || cleaned.length === 10) && /^0[0-9]{8,9}$/.test(cleaned);
  }
  
  return false;
};

/**
 * Validates a VAT number (Irish format)
 */
export const isValidVATNumber = (vat: string): boolean => {
  const cleaned = vat.replace(/\s/g, '').toUpperCase();
  
  // Irish VAT format: IE followed by 7 digits and 1 letter, or 7 digits and 2 letters
  const irishVATRegex = /^IE[0-9]{7}[A-Z]{1,2}$/;
  
  return irishVATRegex.test(cleaned);
};

/**
 * Validates a price value
 */
export const isValidPrice = (price: string | number): boolean => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 999999.99;
};

/**
 * Validates required field
 */
export const isRequired = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim().length > 0;
};

/**
 * Validates minimum length
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

/**
 * Validates maximum length
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

/**
 * Validates that value is a positive number
 */
export const isPositiveNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
};

/**
 * Validates that value is a non-negative number
 */
export const isNonNegativeNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0;
};

/**
 * Validates an IBAN
 */
export const isValidIBAN = (iban: string): boolean => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // Basic IBAN validation - check format and length
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
    return false;
  }
  
  // Check length by country (simplified - only common ones)
  const countryLengths: Record<string, number> = {
    'IE': 22, // Ireland
    'GB': 22, // UK
    'DE': 22, // Germany
    'FR': 27, // France
    'IT': 27, // Italy
    'ES': 24, // Spain
    'NL': 18, // Netherlands
  };
  
  const countryCode = cleaned.slice(0, 2);
  const expectedLength = countryLengths[countryCode];
  
  return expectedLength ? cleaned.length === expectedLength : cleaned.length >= 15 && cleaned.length <= 34;
};

/**
 * Validation error messages
 */
export const ValidationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid Irish phone number',
  vat: 'Please enter a valid VAT number (e.g., IE1234567T)',
  price: 'Please enter a valid price (max €999,999.99)',
  positiveNumber: 'Please enter a positive number',
  nonNegativeNumber: 'Please enter a number greater than or equal to 0',
  minLength: (min: number) => `Must be at least ${min} characters long`,
  maxLength: (max: number) => `Must not exceed ${max} characters`,
  iban: 'Please enter a valid IBAN',
} as const;

/**
 * Common validation schemas for react-hook-form with yup
 */
export const createValidationSchema = () => {
  // This would typically use yup, but we'll return validation functions
  return {
    email: (value: string) => isValidEmail(value) || ValidationMessages.email,
    phone: (value: string) => isValidIrishPhone(value) || ValidationMessages.phone,
    vat: (value: string) => isValidVATNumber(value) || ValidationMessages.vat,
    price: (value: string | number) => isValidPrice(value) || ValidationMessages.price,
    required: (value: string) => isRequired(value) || ValidationMessages.required,
    positiveNumber: (value: string | number) => isPositiveNumber(value) || ValidationMessages.positiveNumber,
    iban: (value: string) => isValidIBAN(value) || ValidationMessages.iban,
  };
};