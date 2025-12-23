/**
 * Data Templates for Realistic Test Data
 *
 * Kenyan names, book titles, and realistic content
 */

// Realistic Kenyan First Names
export const KENYAN_FIRST_NAMES = {
  MALE: [
    'John', 'James', 'David', 'Peter', 'Paul', 'Michael', 'Joseph', 'Daniel',
    'Brian', 'Kevin', 'Dennis', 'Eric', 'Felix', 'Geoffrey', 'Ian', 'Jackson',
    'Moses', 'Samuel', 'Timothy', 'Victor', 'Walter', 'Martin', 'Patrick', 'Stephen',
    'Kamau', 'Kipchoge', 'Wanjiru', 'Otieno', 'Omondi', 'Mwangi', 'Njoroge', 'Kiprono',
    'Mutua', 'Odhiambo', 'Kiplagat', 'Kariuki', 'Kamau', 'Wafula', 'Barasa', 'Muema',
  ],
  FEMALE: [
    'Mary', 'Jane', 'Faith', 'Grace', 'Joy', 'Elizabeth', 'Ann', 'Sarah',
    'Nancy', 'Lucy', 'Catherine', 'Margaret', 'Rose', 'Lilian', 'Esther', 'Ruth',
    'Christine', 'Rachel', 'Rebecca', 'Lydia', 'Agnes', 'Monica', 'Susan', 'Alice',
    'Wanjiku', 'Akinyi', 'Njeri', 'Atieno', 'Chebet', 'Wambui', 'Nyambura', 'Cheptoo',
    'Muthoni', 'Awino', 'Jeptoo', 'Wangari', 'Nafula', 'Kemunto', 'Wanjiru', 'Adhiambo',
  ],
};

// Common Kenyan Surnames
export const KENYAN_SURNAMES = [
  'Kamau', 'Mwangi', 'Njoroge', 'Kariuki', 'Wanjiru', 'Njeri', 'Nyambura',
  'Otieno', 'Odhiambo', 'Omondi', 'Akinyi', 'Atieno', 'Awino', 'Adhiambo',
  'Kipchoge', 'Kiprono', 'Kiplagat', 'Chebet', 'Cheptoo', 'Jeptoo', 'Rotich',
  'Wafula', 'Barasa', 'Nafula', 'Simiyu', 'Waswa', 'Wekesa', 'Mukhwana',
  'Mutua', 'Muema', 'Muthui', 'Ndunda', 'Musyoka', 'Kimeu', 'Kyalo',
  'Kihara', 'Gitau', 'Gachanja', 'Waithaka', 'Macharia', 'Kimani', 'Gitonga',
  'Okoth', 'Owino', 'Onyango', 'Ogola', 'Ouma', 'Juma', 'Wambua',
];

// Realistic Kenyan Phone Numbers
export function generateKenyanPhoneNumber(): string {
  const prefixes = ['0701', '0702', '0703', '0704', '0705', '0706', '0707', '0708', '0710', '0711', '0712', '0713', '0714', '0715', '0716', '0717', '0718', '0720', '0721', '0722', '0723', '0724', '0725', '0726', '0727', '0728', '0729', '0740', '0741', '0742', '0743', '0745', '0746', '0748', '0757', '0758', '0759', '0768', '0769', '0790', '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `${prefix}${suffix}`;
}

// Book Titles by Subject (Kenya Curriculum)
export const BOOK_TITLES = {
  Mathematics: [
    'Secondary Mathematics Book 1',
    'Secondary Mathematics Book 2',
    'Secondary Mathematics Book 3',
    'Secondary Mathematics Book 4',
    'KLB Mathematics Form 1',
    'KLB Mathematics Form 2',
    'KLB Mathematics Form 3',
    'KLB Mathematics Form 4',
    'Longhorn Mathematics Form 1',
    'Longhorn Mathematics Form 2',
    'Longhorn Mathematics Form 3',
    'Longhorn Mathematics Form 4',
    'Spotlight Mathematics Class 7',
    'Spotlight Mathematics Class 8',
  ],
  English: [
    'Oxford Secondary English Book 1',
    'Oxford Secondary English Book 2',
    'Oxford Secondary English Book 3',
    'Oxford Secondary English Book 4',
    'Integrated English Form 1',
    'Integrated English Form 2',
    'Integrated English Form 3',
    'Integrated English Form 4',
    'The River and the Source',
    'A Doll\'s House',
    'The Pearl',
    'Blossoms of the Savannah',
    'Inheritance',
  ],
  Kiswahili: [
    'Kiswahili Sekondari Darasa la 1',
    'Kiswahili Sekondari Darasa la 2',
    'Kiswahili Sekondari Darasa la 3',
    'Kiswahili Sekondari Darasa la 4',
    'Chemchemi ya Kiswahili Kidato cha 1',
    'Chemchemi ya Kiswahili Kidato cha 2',
    'Chemchemi ya Kiswahili Kidato cha 3',
    'Chemchemi ya Kiswahili Kidato cha 4',
    'Ushairi wa Kiswahili',
  ],
  Biology: [
    'KLB Biology Form 1',
    'KLB Biology Form 2',
    'KLB Biology Form 3',
    'KLB Biology Form 4',
    'Longhorn Biology Form 1',
    'Longhorn Biology Form 2',
    'Longhorn Biology Form 3',
    'Longhorn Biology Form 4',
    'Comprehensive Biology Form 1',
    'Comprehensive Biology Form 2',
    'Comprehensive Biology Form 3',
    'Comprehensive Biology Form 4',
  ],
  Chemistry: [
    'KLB Chemistry Form 1',
    'KLB Chemistry Form 2',
    'KLB Chemistry Form 3',
    'KLB Chemistry Form 4',
    'Longhorn Chemistry Form 1',
    'Longhorn Chemistry Form 2',
    'Longhorn Chemistry Form 3',
    'Longhorn Chemistry Form 4',
    'Comprehensive Chemistry',
  ],
  Physics: [
    'KLB Physics Form 1',
    'KLB Physics Form 2',
    'KLB Physics Form 3',
    'KLB Physics Form 4',
    'Longhorn Physics Form 1',
    'Longhorn Physics Form 2',
    'Longhorn Physics Form 3',
    'Longhorn Physics Form 4',
  ],
  History: [
    'KLB History Form 1',
    'KLB History Form 2',
    'KLB History Form 3',
    'KLB History Form 4',
    'Longhorn History Form 1',
    'Longhorn History Form 2',
    'History and Government Form 3',
    'History and Government Form 4',
  ],
  Geography: [
    'KLB Geography Form 1',
    'KLB Geography Form 2',
    'KLB Geography Form 3',
    'KLB Geography Form 4',
    'Longhorn Geography Form 1',
    'Longhorn Geography Form 2',
    'Longhorn Geography Form 3',
    'Longhorn Geography Form 4',
  ],
  CRE: [
    'Fountain CRE Form 1',
    'Fountain CRE Form 2',
    'Fountain CRE Form 3',
    'Fountain CRE Form 4',
    'Longhorn CRE Form 1',
    'Longhorn CRE Form 2',
    'Christian Religious Education Book 3',
    'Christian Religious Education Book 4',
  ],
  'Business Studies': [
    'KLB Business Studies Form 1',
    'KLB Business Studies Form 2',
    'KLB Business Studies Form 3',
    'KLB Business Studies Form 4',
    'Longhorn Business Studies',
  ],
  Agriculture: [
    'KLB Agriculture Form 1',
    'KLB Agriculture Form 2',
    'KLB Agriculture Form 3',
    'KLB Agriculture Form 4',
  ],
  'Computer Studies': [
    'Computer Studies Form 1',
    'Computer Studies Form 2',
    'Computer Studies Form 3',
    'Computer Studies Form 4',
  ],
};

// Publishers (Real Kenyan Publishers)
export const KENYAN_PUBLISHERS = [
  'Kenya Literature Bureau (KLB)',
  'Longhorn Publishers',
  'Oxford University Press East Africa',
  'East African Educational Publishers',
  'Moran Publishers',
  'Focus Publishers',
  'Spotlight Publishers',
  'Jomo Kenyatta Foundation',
  'Phoenix Publishers',
  'Mountain Top Publishers',
];

// Book Descriptions by Condition
export const CONDITION_DESCRIPTIONS = {
  Excellent: [
    'Brand new condition, never used',
    'Like new, no marks or damage',
    'Perfect condition, just bought',
    'Excellent state, barely opened',
  ],
  'Very Good': [
    'Gently used, minimal wear',
    'Very good condition, clean pages',
    'Well maintained, few pencil marks',
    'Slight cover wear, pages intact',
  ],
  Good: [
    'Used but in good condition',
    'Some highlighting, readable',
    'Minor cover damage, all pages present',
    'Normal wear, good for study',
  ],
  Fair: [
    'Used with noticeable wear',
    'Some pages slightly torn',
    'Cover worn, content complete',
    'Fair condition, fully functional',
  ],
  Poor: [
    'Heavily used, readable',
    'Significant wear, all content present',
    'Cover damaged, pages intact',
    'Poor condition but usable',
  ],
};

// Swap Reasons
export const SWAP_REASONS = [
  'Upgrading to new edition',
  'Already finished this book',
  'Need different subject',
  'Switching streams',
  'Teacher recommended different book',
  'Moving to different school',
  'Subject combination changed',
];

// Helper Functions

export function generateFullName(gender?: 'MALE' | 'FEMALE'): string {
  const selectedGender = gender || (Math.random() > 0.5 ? 'MALE' : 'FEMALE');
  const firstName = KENYAN_FIRST_NAMES[selectedGender][
    Math.floor(Math.random() * KENYAN_FIRST_NAMES[selectedGender].length)
  ];
  const surname = KENYAN_SURNAMES[Math.floor(Math.random() * KENYAN_SURNAMES.length)];
  return `${firstName} ${surname}`;
}

export function generateEmail(fullName: string): string {
  const name = fullName.toLowerCase().replace(' ', '.');
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'student.ac.ke'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const random = Math.floor(Math.random() * 999);
  return `${name}${random}@${domain}`;
}

export function getRandomBookTitle(subject: string): string {
  const titles = BOOK_TITLES[subject as keyof typeof BOOK_TITLES] || [];
  if (titles.length === 0) return `${subject} Textbook`;
  return titles[Math.floor(Math.random() * titles.length)];
}

export function getRandomPublisher(): string {
  return KENYAN_PUBLISHERS[Math.floor(Math.random() * KENYAN_PUBLISHERS.length)];
}

export function getConditionDescription(condition: string): string {
  const descriptions = CONDITION_DESCRIPTIONS[condition as keyof typeof CONDITION_DESCRIPTIONS] || [];
  if (descriptions.length === 0) return `Book in ${condition} condition`;
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

export function getRandomSwapReason(): string {
  return SWAP_REASONS[Math.floor(Math.random() * SWAP_REASONS.length)];
}

// Generate random date within range
export function randomDateBetween(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const random = Math.random() * (end - start) + start;
  return new Date(random);
}

// Get grade-appropriate subjects
export function getSubjectsForGrade(grade: number): string[] {
  // Secondary Form 1-2 (Grades 9-10): Core subjects
  if (grade === 9 || grade === 10) {
    return ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'CRE'];
  }

  // Secondary Form 3-4 (Grades 11-12): Can include electives
  if (grade === 11 || grade === 12) {
    return ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'CRE', 'Business Studies', 'Agriculture', 'Computer Studies'];
  }

  // Primary (Grades 1-8)
  return ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE'];
}
