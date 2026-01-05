/**
 * Test script for Enhanced Wishlist Matching System
 *
 * This script demonstrates how the enhanced matching algorithm works
 * with various scenarios and scoring combinations.
 */

interface WishlistItem {
  id: number;
  title: string;
  isbn?: string;
  publisher?: string;
  author?: string;
  edition?: string;
  subject?: string;
  grade?: string;
  curriculum?: string;
}

interface BookListing {
  id: number;
  title: string;
  isbn?: string;
  publisher?: string;
  author?: string;
  edition?: string;
  subject?: string;
  classGrade?: string;
  curriculum?: string;
}

// Test scenarios
const testScenarios = [
  {
    name: "Perfect ISBN Match",
    wishlist: {
      id: 1,
      title: "Mathematics Grade 5 Textbook",
      isbn: "978-9966-08-123-4",
      publisher: "Oxford University Press",
      subject: "Mathematics",
      grade: "Grade 5",
      curriculum: "CBC"
    },
    listing: {
      id: 101,
      title: "Math Grade 5 Student Book",
      isbn: "978-9966-08-123-4", // Same ISBN
      publisher: "Oxford University Press",
      subject: "Mathematics",
      classGrade: "Grade 5",
      curriculum: "CBC"
    },
    expectedScore: "≥140 (Excellent)",
    expectedQuality: "excellent"
  },
  {
    name: "Strong Match Without ISBN",
    wishlist: {
      id: 2,
      title: "Kiswahili Msingi wa Isimu Darasa la 6",
      publisher: "Longhorn Publishers",
      author: "Dr. James Mwangi",
      subject: "Kiswahili",
      grade: "Grade 6",
      curriculum: "CBC"
    },
    listing: {
      id: 102,
      title: "Kiswahili Msingi wa Isimu Darasa la 6",
      publisher: "Longhorn Publishers",
      author: "Dr. James Mwangi",
      subject: "Kiswahili",
      classGrade: "Grade 6",
      curriculum: "CBC"
    },
    expectedScore: "≥95 (Excellent/Good)",
    expectedQuality: "excellent"
  },
  {
    name: "Adjacent Grade Match",
    wishlist: {
      id: 3,
      title: "Science Activities Book",
      subject: "Science",
      grade: "Grade 4",
      curriculum: "CBC"
    },
    listing: {
      id: 103,
      title: "Science Activities Book",
      subject: "Science",
      classGrade: "Grade 5", // Adjacent grade
      curriculum: "CBC"
    },
    expectedScore: "≥80 (Good)",
    expectedQuality: "good"
  },
  {
    name: "Similar Title Match",
    wishlist: {
      id: 4,
      title: "English Grammar Workbook for Secondary Schools",
      subject: "English",
      grade: "Form 1"
    },
    listing: {
      id: 104,
      title: "English Grammar Workbook for Secondary School Students",
      subject: "English",
      classGrade: "Form 1"
    },
    expectedScore: "≥80 (Good)",
    expectedQuality: "good"
  },
  {
    name: "Fair Match - Different Editions",
    wishlist: {
      id: 5,
      title: "Chemistry for Secondary Schools",
      edition: "2nd Edition",
      subject: "Chemistry",
      grade: "Form 3"
    },
    listing: {
      id: 105,
      title: "Chemistry for Secondary Schools",
      edition: "3rd Edition", // Different edition
      subject: "Chemistry",
      classGrade: "Form 3"
    },
    expectedScore: "≥65 (Fair)",
    expectedQuality: "fair"
  },
  {
    name: "Poor Match - Below Threshold",
    wishlist: {
      id: 6,
      title: "Advanced Physics Grade 8",
      subject: "Physics",
      grade: "Grade 8"
    },
    listing: {
      id: 106,
      title: "Basic Chemistry Notes",
      subject: "Chemistry", // Different subject
      classGrade: "Grade 6" // Different grade
    },
    expectedScore: "<60 (No match)",
    expectedQuality: "poor"
  }
];

// Simplified scoring functions for demonstration
function normalizeISBN(isbn: string): string {
  return isbn.replace(/[\s-]/g, '').toUpperCase();
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;
  if (longer.includes(shorter)) return 0.9;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function isAdjacentGrade(grade1: string, grade2: string): boolean {
  const extractNumber = (grade: string): number | null => {
    const match = grade.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const num1 = extractNumber(grade1);
  const num2 = extractNumber(grade2);

  if (num1 === null || num2 === null) return false;

  const isGradeSystem = grade2.toLowerCase().includes('grade');
  const isFormSystem = grade2.toLowerCase().includes('form');

  if (grade1.toLowerCase().includes('grade') !== isGradeSystem &&
      grade1.toLowerCase().includes('form') !== isFormSystem) {
    return false;
  }

  return Math.abs(num1 - num2) === 1;
}

function calculateMatchScore(listing: BookListing, wishlist: WishlistItem): {
  score: number;
  matchReasons: string[];
} {
  let score = 0;
  const matchReasons: string[] = [];

  // 1. ISBN MATCH (0-100 points)
  if (listing.isbn && wishlist.isbn) {
    const listingISBN = normalizeISBN(listing.isbn);
    const wishlistISBN = normalizeISBN(wishlist.isbn);

    if (listingISBN === wishlistISBN) {
      score += 100;
      matchReasons.push(`Exact ISBN match (${listing.isbn})`);
    }
  }

  // 2. TITLE SIMILARITY (0-40 points)
  if (listing.title && wishlist.title) {
    const titleSimilarity = calculateStringSimilarity(
      listing.title.toLowerCase(),
      wishlist.title.toLowerCase()
    );

    let titleScore = 0;
    if (titleSimilarity >= 0.95) {
      titleScore = 40;
      matchReasons.push("Exact title match");
    } else if (titleSimilarity >= 0.85) {
      titleScore = 35;
      matchReasons.push("Very similar title");
    } else if (titleSimilarity >= 0.70) {
      titleScore = 25;
      matchReasons.push("Similar title");
    } else if (titleSimilarity >= 0.50) {
      titleScore = 15;
      matchReasons.push("Partially matching title");
    }
    score += titleScore;
  }

  // 3. GRADE MATCH (0-25 points)
  if (listing.classGrade && wishlist.grade) {
    if (listing.classGrade === wishlist.grade) {
      score += 25;
      matchReasons.push(`Matches grade ${wishlist.grade}`);
    } else if (isAdjacentGrade(listing.classGrade, wishlist.grade)) {
      score += 15;
      matchReasons.push(`Close grade (${listing.classGrade} vs ${wishlist.grade})`);
    }
  }

  // 4. SUBJECT MATCH (0-20 points)
  if (listing.subject && wishlist.subject) {
    if (listing.subject.toLowerCase() === wishlist.subject.toLowerCase()) {
      score += 20;
      matchReasons.push(`Same subject (${listing.subject})`);
    }
  }

  // 5. PUBLISHER MATCH (0-10 points)
  if (listing.publisher && wishlist.publisher) {
    const similarity = calculateStringSimilarity(
      listing.publisher.toLowerCase(),
      wishlist.publisher.toLowerCase()
    );
    if (similarity >= 0.8) {
      score += 10;
      matchReasons.push(`Same publisher (${listing.publisher})`);
    }
  }

  // 6. AUTHOR MATCH (0-5 points)
  if (listing.author && wishlist.author) {
    const similarity = calculateStringSimilarity(
      listing.author.toLowerCase(),
      wishlist.author.toLowerCase()
    );
    if (similarity >= 0.8) {
      score += 5;
      matchReasons.push(`Same author (${listing.author})`);
    }
  }

  // 7. CURRICULUM BONUS
  if (listing.curriculum && wishlist.curriculum) {
    if (listing.curriculum === wishlist.curriculum) {
      matchReasons.push(`Same curriculum (${listing.curriculum})`);
    }
  }

  return {
    score: Math.round(score),
    matchReasons: matchReasons.length > 0 ? matchReasons : ["Multiple matching criteria"]
  };
}

// Run tests
console.log("\n=================================");
console.log("WISHLIST MATCHING TEST RESULTS");
console.log("=================================\n");

testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log("-".repeat(50));

  const { score, matchReasons } = calculateMatchScore(scenario.listing, scenario.wishlist);

  let quality: string;
  if (score >= 100) {
    quality = "excellent";
  } else if (score >= 80) {
    quality = "good";
  } else if (score >= 60) {
    quality = "fair";
  } else {
    quality = "poor (no notification)";
  }

  console.log(`Wishlist: "${scenario.wishlist.title}"`);
  console.log(`  ISBN: ${scenario.wishlist.isbn || 'N/A'}`);
  console.log(`  Grade: ${scenario.wishlist.grade}, Subject: ${scenario.wishlist.subject}`);
  console.log(`\nListing: "${scenario.listing.title}"`);
  console.log(`  ISBN: ${scenario.listing.isbn || 'N/A'}`);
  console.log(`  Grade: ${scenario.listing.classGrade}, Subject: ${scenario.listing.subject}`);
  console.log(`\n✨ MATCH SCORE: ${score} points`);
  console.log(`📊 QUALITY: ${quality.toUpperCase()}`);
  console.log(`📝 REASONS: ${matchReasons.join(', ')}`);
  console.log(`\n✓ Would notify parent: ${score >= 60 ? 'YES' : 'NO'}`);
  console.log(`✓ Expected: ${scenario.expectedScore}`);
});

console.log("\n\n=================================");
console.log("SCORING SYSTEM SUMMARY");
console.log("=================================");
console.log("ISBN Match:       0-100 points (Exact: 100)");
console.log("Title Similarity: 0-40 points  (Exact: 40, High: 35, Good: 25)");
console.log("Grade Match:      0-25 points  (Exact: 25, Adjacent: 15)");
console.log("Subject Match:    0-20 points  (Exact: 20)");
console.log("Publisher Match:  0-10 points  (Exact: 10)");
console.log("Author Match:     0-5 points   (Exact: 5)");
console.log("\nQUALITY THRESHOLDS:");
console.log("- Excellent: ≥100 (Perfect match - ISBN or very strong metadata)");
console.log("- Good:      ≥80  (Strong match across multiple fields)");
console.log("- Fair:      ≥60  (Reasonable match - will notify)");
console.log("- Poor:      <60  (No notification sent)");
console.log("=================================\n");
