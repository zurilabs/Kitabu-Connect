import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a URL-friendly slug from a book title and ID
 * @param title - The book title
 * @param id - The book ID
 * @returns A URL-friendly slug
 */
export function generateBookSlug(title: string, id: number | string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen

  return `${id}-${slug}`;
}

/**
 * Extract book ID from a slug
 * @param slug - The book slug (e.g., "123-mathematics-grade-4")
 * @returns The book ID
 */
export function extractIdFromSlug(slug: string): string {
  return slug.split('-')[0];
}
