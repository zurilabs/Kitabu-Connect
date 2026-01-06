import { useEffect } from 'react';
import { useLocation } from 'wouter';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

export function usePageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location,
        page_title: document.title,
      });
    }
  }, [location]);
}

export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
}

// Predefined event tracking functions
export const analytics = {
  // E-commerce events
  viewItem: (bookId: number, bookTitle: string, price: number) => {
    trackEvent('view_item', {
      currency: 'KES',
      value: price,
      items: [{
        item_id: bookId,
        item_name: bookTitle,
        price: price,
      }]
    });
  },

  addToWishlist: (bookId: number, bookTitle: string) => {
    trackEvent('add_to_wishlist', {
      items: [{
        item_id: bookId,
        item_name: bookTitle,
      }]
    });
  },

  beginCheckout: (bookId: number, bookTitle: string, price: number) => {
    trackEvent('begin_checkout', {
      currency: 'KES',
      value: price,
      items: [{
        item_id: bookId,
        item_name: bookTitle,
        price: price,
      }]
    });
  },

  purchase: (orderId: number, totalValue: number, items: any[]) => {
    trackEvent('purchase', {
      transaction_id: orderId,
      currency: 'KES',
      value: totalValue,
      items: items,
    });
  },

  // User events
  signUp: (method: string) => {
    trackEvent('sign_up', {
      method: method, // 'email' or 'google'
    });
  },

  login: (method: string) => {
    trackEvent('login', {
      method: method,
    });
  },

  // Listing events
  createListing: (listingType: string, subject?: string, grade?: string) => {
    trackEvent('create_listing', {
      listing_type: listingType, // 'sell' or 'swap'
      subject: subject,
      grade: grade,
    });
  },

  searchBooks: (searchTerm: string, filters?: Record<string, any>) => {
    trackEvent('search', {
      search_term: searchTerm,
      ...filters,
    });
  },

  // Engagement events
  shareBook: (bookId: number, method: string) => {
    trackEvent('share', {
      content_type: 'book_listing',
      item_id: bookId,
      method: method, // 'whatsapp', 'facebook', etc.
    });
  },

  contactSeller: (bookId: number) => {
    trackEvent('contact_seller', {
      item_id: bookId,
    });
  },

  // Swap events
  createSwapRequest: (requestedBookId: number, offeredBookId?: number) => {
    trackEvent('create_swap_request', {
      requested_book_id: requestedBookId,
      offered_book_id: offeredBookId,
    });
  },

  acceptSwapRequest: (swapRequestId: number) => {
    trackEvent('accept_swap_request', {
      swap_request_id: swapRequestId,
    });
  },
};
