
export interface User {
  id: string;
  name: string;
  email: string;
  schoolId: string;
  walletBalance: number;
  avatar: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  price: number;
  sellerId: string;
  schoolId: string;
  status: 'available' | 'escrow' | 'sold';
  image: string;
  description: string;
  category: string;
}

export interface Transaction {
  id: string;
  bookId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: 'pending' | 'escrow' | 'completed' | 'cancelled';
  date: string;
  handshakeId: string;
}

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Alex Johnson',
  email: 'alex@university.edu',
  schoolId: 's1',
  walletBalance: 4500,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
};

export const SCHOOLS = [
  { id: 's1', name: 'University of Lagos' },
  { id: 's2', name: 'Covenant University' },
  { id: 's3', name: 'Obafemi Awolowo University' },
  { id: 's4', name: 'University of Ibadan' }
];

export const MOCK_BOOKS: Book[] = [
  {
    id: 'b1',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '9780262033848',
    condition: 'Like New',
    price: 15000,
    sellerId: 'u2',
    schoolId: 's1',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000',
    description: 'Barely used, no highlights. Essential for CS students.',
    category: 'Computer Science'
  },
  {
    id: 'b2',
    title: 'Campbell Biology',
    author: 'Lisa A. Urry',
    isbn: '9780134093413',
    condition: 'Good',
    price: 12000,
    sellerId: 'u3',
    schoolId: 's1',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=1000',
    description: 'Some wear on the cover, but pages are clean.',
    category: 'Biology'
  },
  {
    id: 'b3',
    title: 'Organic Chemistry',
    author: 'Paula Yurkanis Bruice',
    isbn: '9780134042282',
    condition: 'Fair',
    price: 8500,
    sellerId: 'u4',
    schoolId: 's2',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1614726365723-49cfae968656?auto=format&fit=crop&q=80&w=1000',
    description: 'Highlighted key concepts, still very usable.',
    category: 'Chemistry'
  },
  {
    id: 'b4',
    title: 'Principles of Economics',
    author: 'N. Gregory Mankiw',
    isbn: '9781305585126',
    condition: 'New',
    price: 18000,
    sellerId: 'u5',
    schoolId: 's1',
    status: 'escrow',
    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1000',
    description: 'Brand new, never opened.',
    category: 'Economics'
  },
  {
    id: 'b5',
    title: 'Engineering Mechanics: Statics',
    author: 'Russell C. Hibbeler',
    isbn: '9780133918922',
    condition: 'Good',
    price: 9500,
    sellerId: 'u2',
    schoolId: 's3',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=1000',
    description: 'Standard textbook for first year engineering.',
    category: 'Engineering'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    bookId: 'b4',
    buyerId: 'u1',
    sellerId: 'u5',
    amount: 18000,
    status: 'escrow',
    date: '2025-05-15',
    handshakeId: 'HS-8829-XP'
  }
];
