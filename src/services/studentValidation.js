// =====================================================
// Student Details Validation Service
// =====================================================
// Validates roll numbers, names, and department consistency
// for college registration integrity.

// Roll number pattern: 23881A05XX (XX = 01-99 or A-Z combos)
// Format: [Year:2][College:3][Branch:1][Dept:2][Number:2]
// 23 = Admission year, 881 = College code, A = Regular, 05 = CSE dept code
const ROLL_NUMBER_REGEX = /^[0-9]{2}881[A-Z][0-9]{2}[0-9A-Z]{2}$/i;

// Department codes mapping from roll number
const DEPT_CODES = {
  '01': 'Civil Engineering',
  '02': 'Electrical Engineering',
  '03': 'Mechanical Engineering',
  '04': 'Electronics & Communication',
  '05': 'Computer Science',
  '06': 'Chemical Engineering',
  '07': 'Information Technology',
  '08': 'Biotechnology',
  '12': 'Business Administration'
};

// Branch codes
const BRANCH_CODES = {
  'A': 'Regular',
  'B': 'Lateral Entry'
};

/**
 * Validate roll number format
 * Example valid: 23881A0501, 23881A0512, 22881A0305, 23881B0701
 */
export function validateRollNumber(rollNo) {
  if (!rollNo || !rollNo.trim()) {
    return { valid: false, message: 'Roll number is required' };
  }

  const cleaned = rollNo.trim().toUpperCase();

  if (cleaned.length !== 10) {
    return { valid: false, message: 'Roll number must be exactly 10 characters (e.g., 23881A0501)' };
  }

  if (!ROLL_NUMBER_REGEX.test(cleaned)) {
    return { valid: false, message: 'Invalid roll number format. Expected format: 23881A05XX' };
  }

  // Validate college code
  const collegeCode = cleaned.substring(2, 5);
  if (collegeCode !== '881') {
    return { valid: false, message: 'Invalid college code. Must be 881.' };
  }

  // Validate branch code
  const branchCode = cleaned.charAt(5);
  if (!BRANCH_CODES[branchCode]) {
    return { valid: false, message: `Invalid branch code "${branchCode}". Must be A (Regular) or B (Lateral Entry).` };
  }

  // Validate department code
  const deptCode = cleaned.substring(6, 8);
  if (!DEPT_CODES[deptCode]) {
    return { valid: false, message: `Invalid department code "${deptCode}". Please check your roll number.` };
  }

  return {
    valid: true,
    message: 'Valid roll number',
    parsed: {
      admissionYear: '20' + cleaned.substring(0, 2),
      collegeCode: collegeCode,
      branch: BRANCH_CODES[branchCode],
      departmentCode: deptCode,
      department: DEPT_CODES[deptCode],
      rollNumber: cleaned
    }
  };
}

/**
 * Get department from roll number
 */
export function getDepartmentFromRoll(rollNo) {
  const result = validateRollNumber(rollNo);
  if (result.valid) {
    return result.parsed.department;
  }
  return null;
}

/**
 * Validate student name (as on college ID card)
 * - Minimum 2 words (first name + last name)
 * - Only letters and spaces
 * - Each word at least 2 characters
 * - No numbers or special characters
 */
export function validateStudentName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Full name is required (as on college ID card)' };
  }

  const cleaned = name.trim();

  // Check for numbers
  if (/\d/.test(cleaned)) {
    return { valid: false, message: 'Name should not contain numbers' };
  }

  // Check for special characters (allow only letters, spaces, dots, hyphens)
  if (!/^[A-Za-z\s.-]+$/.test(cleaned)) {
    return { valid: false, message: 'Name should only contain letters, spaces, dots, or hyphens' };
  }

  // Check minimum length
  if (cleaned.length < 3) {
    return { valid: false, message: 'Name is too short' };
  }

  // Must have at least first name and last name
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return { valid: false, message: 'Please enter your full name (First Name and Last Name) as on college ID card' };
  }

  // Each word should be at least 1 character
  for (const word of words) {
    const cleanWord = word.replace(/[.-]/g, '');
    if (cleanWord.length < 1) {
      return { valid: false, message: 'Each part of the name must have at least 1 character' };
    }
  }

  return { valid: true, message: 'Valid name' };
}

/**
 * Validate department matches roll number
 */
export function validateDepartmentMatch(rollNo, selectedDept) {
  const rollDept = getDepartmentFromRoll(rollNo);
  if (!rollDept) return { valid: true, message: '' }; // Can't validate if roll is invalid

  if (rollDept !== selectedDept) {
    return {
      valid: false,
      message: `Department mismatch! Your roll number indicates "${rollDept}" but you selected "${selectedDept}".`
    };
  }

  return { valid: true, message: 'Department matches roll number ✓' };
}

/**
 * Check for duplicate roll number
 */
export function checkDuplicateRoll(rollNo) {
  const users = JSON.parse(localStorage.getItem('smart_campus_users') || '[]');
  const exists = users.find(u => u.studentId && u.studentId.toUpperCase() === rollNo.toUpperCase());
  if (exists) {
    return { duplicate: true, message: 'This roll number is already registered. Contact admin if this is an error.' };
  }
  return { duplicate: false };
}

/**
 * Get valid departments for signup dropdown
 */
export function getValidDepartments() {
  return Object.values(DEPT_CODES);
}

/**
 * Format roll number for display
 */
export function formatRollNumber(rollNo) {
  if (!rollNo) return '';
  return rollNo.trim().toUpperCase();
}
