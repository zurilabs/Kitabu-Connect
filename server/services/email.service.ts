/**
 * Email Service
 * Handles sending emails for all notification types using Resend API
 *
 * Setup:
 * 1. Install: npm install resend
 * 2. Get API key from: https://resend.com/api-keys
 * 3. Add to .env: RESEND_API_KEY=re_xxxxx
 * 4. Verify domain at: https://resend.com/domains
 */

import { db } from "../db";
import { users, userPreferences } from "../db/schema";
import { eq } from "drizzle-orm";

// Email configuration
const EMAIL_CONFIG = {
  fromEmail: process.env.EMAIL_FROM || "Kitabu Connect <noreply@kitabuconnect.com>",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5000",
  resendApiKey: process.env.RESEND_API_KEY,
};

// Check if email service is enabled
const isEmailEnabled = () => {
  return Boolean(EMAIL_CONFIG.resendApiKey);
};

/**
 * Send email using Resend API
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isEmailEnabled()) {
    console.log("[EmailService] Email service disabled - RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${EMAIL_CONFIG.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_CONFIG.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[EmailService] Send email error:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    console.log(`[EmailService] Email sent successfully to ${params.to}: ${params.subject}`);
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error("[EmailService] Send email error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's email and email preferences
 */
async function getUserEmailInfo(userId: string): Promise<{
  email: string | null;
  emailNotificationsEnabled: boolean;
}> {
  try {
    // Get user email
    const [user] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { email: null, emailNotificationsEnabled: false };
    }

    // Get email notification preferences from user_preferences table
    const [preferences] = await db
      .select({
        emailNotifications: userPreferences.emailNotifications,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return {
      email: user.email,
      emailNotificationsEnabled: preferences?.emailNotifications ?? true, // Default to true if no preferences set
    };
  } catch (error) {
    console.error("[EmailService] Get user email error:", error);
    return { email: null, emailNotificationsEnabled: false };
  }
}

/**
 * Base email template with Kitabu Connect branding
 */
function getEmailTemplate(params: {
  title: string;
  preheader?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${params.preheader ? `<meta name="description" content="${params.preheader}">` : ''}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333333;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      color: #555555;
      font-size: 16px;
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #5568d3;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Kitabu Connect</h1>
    </div>
    <div class="content">
      <h2>${params.title}</h2>
      ${params.body}
      ${params.ctaText && params.ctaUrl ? `
        <a href="${params.ctaUrl}" class="button">${params.ctaText}</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>You're receiving this email because you have an account on Kitabu Connect.</p>
      <p>
        <a href="${EMAIL_CONFIG.frontendUrl}/settings">Manage Email Preferences</a> •
        <a href="${EMAIL_CONFIG.frontendUrl}">Visit Kitabu Connect</a>
      </p>
      <p style="margin-top: 20px; color: #9ca3af;">
        © ${new Date().getFullYear()} Kitabu Connect. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Email notification templates for each notification type
 */
export const EmailTemplates = {
  // ==================== BOOK LISTINGS ====================

  wishlist_match: (data: {
    bookTitle: string;
    bookUrl: string;
    matchQuality: string;
    childName: string;
  }) => ({
    subject: `📚 Book Match Found: ${data.bookTitle}`,
    html: getEmailTemplate({
      title: `We Found a Book for ${data.childName}!`,
      preheader: `A ${data.matchQuality} match for your wishlist`,
      body: `
        <p>Great news! We found a book that matches your wishlist for <strong>${data.childName}</strong>.</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Match Quality:</strong> ${data.matchQuality}</p>
        <p>Check it out now before it's gone!</p>
      `,
      ctaText: "View Book",
      ctaUrl: data.bookUrl,
    }),
  }),

  // ==================== SWAP REQUESTS ====================

  swap_request_received: (data: {
    requesterName: string;
    offeredBookTitle: string;
    requestedBookTitle: string;
    swapRequestUrl: string;
  }) => ({
    subject: `📖 New Swap Request from ${data.requesterName}`,
    html: getEmailTemplate({
      title: "New Swap Request!",
      preheader: `${data.requesterName} wants to swap books with you`,
      body: `
        <p><strong>${data.requesterName}</strong> wants to swap books with you!</p>
        <p><strong>They're offering:</strong> ${data.offeredBookTitle}</p>
        <p><strong>They want:</strong> ${data.requestedBookTitle}</p>
        <p>Review the request and respond at your earliest convenience.</p>
      `,
      ctaText: "View Swap Request",
      ctaUrl: data.swapRequestUrl,
    }),
  }),

  swap_request_approved: (data: {
    ownerName: string;
    bookTitle: string;
    swapRequestUrl: string;
  }) => ({
    subject: `✅ Swap Request Approved by ${data.ownerName}`,
    html: getEmailTemplate({
      title: "Swap Request Approved!",
      preheader: `${data.ownerName} accepted your swap request`,
      body: `
        <p>Good news! <strong>${data.ownerName}</strong> has approved your swap request for <strong>${data.bookTitle}</strong>.</p>
        <p>You can now proceed with the exchange. Check the swap details and coordinate the exchange.</p>
      `,
      ctaText: "View Swap Details",
      ctaUrl: data.swapRequestUrl,
    }),
  }),

  swap_request_rejected: (data: {
    ownerName: string;
    bookTitle: string;
  }) => ({
    subject: `❌ Swap Request Declined`,
    html: getEmailTemplate({
      title: "Swap Request Declined",
      preheader: `Your swap request was declined`,
      body: `
        <p>Unfortunately, <strong>${data.ownerName}</strong> has declined your swap request for <strong>${data.bookTitle}</strong>.</p>
        <p>Don't worry! There are many other books available for swap. Keep browsing!</p>
      `,
      ctaText: "Browse More Books",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/browse`,
    }),
  }),

  // ==================== PURCHASE ORDERS ====================

  purchase_order_created: (data: {
    buyerName: string;
    bookTitle: string;
    orderAmount: string;
    orderUrl: string;
  }) => ({
    subject: `🛒 New Purchase Order for ${data.bookTitle}`,
    html: getEmailTemplate({
      title: "New Book Order!",
      preheader: `${data.buyerName} ordered your book`,
      body: `
        <p><strong>${data.buyerName}</strong> has ordered your book!</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Amount:</strong> KES ${data.orderAmount}</p>
        <p>Once payment is confirmed, prepare the book for delivery.</p>
      `,
      ctaText: "View Order Details",
      ctaUrl: data.orderUrl,
    }),
  }),

  payment_received: (data: {
    bookTitle: string;
    orderAmount: string;
    orderUrl: string;
  }) => ({
    subject: `💰 Payment Received for ${data.bookTitle}`,
    html: getEmailTemplate({
      title: "Payment Confirmed!",
      preheader: `Buyer has paid for ${data.bookTitle}`,
      body: `
        <p>Great news! Payment has been received for your book.</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Amount:</strong> KES ${data.orderAmount}</p>
        <p>The funds are being held in escrow for 7 days. Please prepare the book for delivery.</p>
      `,
      ctaText: "View Order & Ship Book",
      ctaUrl: data.orderUrl,
    }),
  }),

  book_shipped: (data: {
    sellerName: string;
    bookTitle: string;
    trackingNumber?: string;
    orderUrl: string;
  }) => ({
    subject: `📦 Your Book Has Been Shipped!`,
    html: getEmailTemplate({
      title: "Book Shipped!",
      preheader: `${data.sellerName} has shipped your book`,
      body: `
        <p><strong>${data.sellerName}</strong> has shipped your book!</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
        <p>Your book is on its way. Track the delivery and confirm receipt once you receive it.</p>
      `,
      ctaText: "Track Order",
      ctaUrl: data.orderUrl,
    }),
  }),

  order_delivered: (data: {
    bookTitle: string;
    orderUrl: string;
  }) => ({
    subject: `✅ Order Delivered - Confirm Receipt`,
    html: getEmailTemplate({
      title: "Order Delivered!",
      preheader: `Please confirm receipt of ${data.bookTitle}`,
      body: `
        <p>Your book <strong>${data.bookTitle}</strong> has been marked as delivered.</p>
        <p>Please confirm that you've received the book in good condition.</p>
        <p><strong>Important:</strong> If you don't confirm receipt within 7 days, funds will be automatically released to the seller.</p>
      `,
      ctaText: "Confirm Receipt",
      ctaUrl: data.orderUrl,
    }),
  }),

  order_completed: (data: {
    bookTitle: string;
    amount: string;
    orderUrl: string;
  }) => ({
    subject: `✅ Order Completed - Funds Released`,
    html: getEmailTemplate({
      title: "Order Completed!",
      preheader: `Funds released for ${data.bookTitle}`,
      body: `
        <p>Your order for <strong>${data.bookTitle}</strong> has been completed!</p>
        <p><strong>Amount:</strong> KES ${data.amount}</p>
        <p>The funds have been released from escrow to your wallet. You can now withdraw them.</p>
      `,
      ctaText: "View Wallet",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/dashboard`,
    }),
  }),

  // ==================== WALLET TRANSACTIONS ====================

  wallet_topup: (data: {
    amount: string;
    newBalance: string;
  }) => ({
    subject: `💰 Wallet Top-Up Successful`,
    html: getEmailTemplate({
      title: "Wallet Credited!",
      preheader: `Added KES ${data.amount} to your wallet`,
      body: `
        <p>Your wallet has been successfully topped up.</p>
        <p><strong>Amount Added:</strong> KES ${data.amount}</p>
        <p><strong>New Balance:</strong> KES ${data.newBalance}</p>
        <p>You can now use this balance to purchase books on Kitabu Connect.</p>
      `,
      ctaText: "View Wallet",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/dashboard`,
    }),
  }),

  withdrawal_completed: (data: {
    amount: string;
    fee: string;
    netAmount: string;
    method: string;
  }) => ({
    subject: `✅ Withdrawal Processed`,
    html: getEmailTemplate({
      title: "Withdrawal Successful!",
      preheader: `KES ${data.netAmount} sent to your ${data.method}`,
      body: `
        <p>Your withdrawal has been processed successfully.</p>
        <p><strong>Requested Amount:</strong> KES ${data.amount}</p>
        <p><strong>Withdrawal Fee:</strong> KES ${data.fee}</p>
        <p><strong>Amount Sent:</strong> KES ${data.netAmount}</p>
        <p><strong>Method:</strong> ${data.method.toUpperCase()}</p>
        <p>Funds should arrive in your account within 1-3 business days.</p>
      `,
      ctaText: "View Transactions",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/dashboard`,
    }),
  }),

  // ==================== MESSAGES ====================

  new_message: (data: {
    senderName: string;
    messagePreview: string;
    conversationUrl: string;
  }) => ({
    subject: `💬 New Message from ${data.senderName}`,
    html: getEmailTemplate({
      title: "New Message!",
      preheader: data.messagePreview,
      body: `
        <p><strong>${data.senderName}</strong> sent you a message:</p>
        <p style="padding: 15px; background-color: #f9fafb; border-left: 4px solid #667eea; margin: 20px 0;">
          "${data.messagePreview}"
        </p>
        <p>Reply to continue the conversation.</p>
      `,
      ctaText: "View Message",
      ctaUrl: data.conversationUrl,
    }),
  }),

  // ==================== REFERRALS & REWARDS ====================

  referral_signup: (data: {
    referredName: string;
    bonusAmount: string;
  }) => ({
    subject: `🎉 Referral Bonus Earned!`,
    html: getEmailTemplate({
      title: "You Earned a Referral Bonus!",
      preheader: `${data.referredName} joined using your referral code`,
      body: `
        <p>Great news! <strong>${data.referredName}</strong> signed up using your referral code.</p>
        <p><strong>Your Bonus:</strong> KES ${data.bonusAmount}</p>
        <p>The bonus has been added to your wallet. Keep sharing your referral code to earn more!</p>
      `,
      ctaText: "View Wallet",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/dashboard`,
    }),
  }),

  referral_purchase: (data: {
    referredName: string;
    bonusAmount: string;
  }) => ({
    subject: `🎁 Referral Reward Earned!`,
    html: getEmailTemplate({
      title: "Referral Reward!",
      preheader: `Earned KES ${data.bonusAmount} from referral`,
      body: `
        <p><strong>${data.referredName}</strong> (someone you referred) made their first purchase!</p>
        <p><strong>Your Reward:</strong> KES ${data.bonusAmount}</p>
        <p>The reward has been added to your wallet. Thanks for spreading the word!</p>
      `,
      ctaText: "View Wallet",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/dashboard`,
    }),
  }),

  // ==================== DISPUTES ====================

  dispute_opened: (data: {
    bookTitle: string;
    reason: string;
    disputeUrl: string;
  }) => ({
    subject: `⚠️ Dispute Opened for Order`,
    html: getEmailTemplate({
      title: "Dispute Opened",
      preheader: `A dispute has been opened for ${data.bookTitle}`,
      body: `
        <p>A dispute has been opened for your order.</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
        <p>Please provide evidence and communicate with the other party to resolve this issue.</p>
      `,
      ctaText: "View Dispute",
      ctaUrl: data.disputeUrl,
    }),
  }),

  dispute_resolved: (data: {
    bookTitle: string;
    resolution: string;
    disputeUrl: string;
  }) => ({
    subject: `✅ Dispute Resolved`,
    html: getEmailTemplate({
      title: "Dispute Resolved",
      preheader: `Dispute for ${data.bookTitle} has been resolved`,
      body: `
        <p>The dispute for your order has been resolved.</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Resolution:</strong> ${data.resolution}</p>
      `,
      ctaText: "View Details",
      ctaUrl: data.disputeUrl,
    }),
  }),

  // ==================== RATINGS & REVIEWS ====================

  new_rating: (data: {
    raterName: string;
    rating: number;
    bookTitle: string;
    comment?: string;
  }) => ({
    subject: `⭐ New ${data.rating}-Star Rating Received`,
    html: getEmailTemplate({
      title: "New Rating!",
      preheader: `${data.raterName} rated your transaction`,
      body: `
        <p><strong>${data.raterName}</strong> left you a rating!</p>
        <p><strong>Rating:</strong> ${'⭐'.repeat(data.rating)} (${data.rating}/5)</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        ${data.comment ? `<p style="padding: 15px; background-color: #f9fafb; border-left: 4px solid #667eea; margin: 20px 0;">"${data.comment}"</p>` : ''}
      `,
      ctaText: "View Your Profile",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/profile`,
    }),
  }),

  rating_reminder: (data: {
    sellerName: string;
    bookTitle: string;
    orderUrl: string;
  }) => ({
    subject: `⭐ Rate Your Transaction with ${data.sellerName}`,
    html: getEmailTemplate({
      title: "Rate Your Experience",
      preheader: `How was your transaction with ${data.sellerName}?`,
      body: `
        <p>You recently completed a transaction with <strong>${data.sellerName}</strong>.</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p>Help other buyers by rating your experience. Your feedback helps build trust in our community!</p>
      `,
      ctaText: "Leave a Rating",
      ctaUrl: data.orderUrl,
    }),
  }),

  // ==================== ESCROW & PAYMENTS ====================

  escrow_released: (data: {
    bookTitle: string;
    amount: string;
  }) => ({
    subject: `💰 Escrow Funds Released`,
    html: getEmailTemplate({
      title: "Funds Released!",
      preheader: `KES ${data.amount} released to your wallet`,
      body: `
        <p>The escrow period has ended and funds have been released to your wallet.</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p><strong>Amount:</strong> KES ${data.amount}</p>
        <p>You can now withdraw these funds to your M-PESA or bank account.</p>
      `,
      ctaText: "Withdraw Funds",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/dashboard`,
    }),
  }),

  // ==================== SYSTEM NOTIFICATIONS ====================

  welcome: (data: {
    userName: string;
    referralCode?: string;
  }) => ({
    subject: `🎉 Welcome to Kitabu Connect!`,
    html: getEmailTemplate({
      title: `Welcome, ${data.userName}!`,
      preheader: "Start buying and selling textbooks today",
      body: `
        <p>Welcome to Kitabu Connect - Kenya's premier marketplace for school textbooks!</p>
        <p>Here's what you can do:</p>
        <ul style="color: #555555;">
          <li>📚 Buy quality textbooks at affordable prices</li>
          <li>💰 Sell your used textbooks to other students</li>
          <li>🔄 Swap books directly with other users</li>
          <li>⭐ Build trust through ratings and reviews</li>
        </ul>
        ${data.referralCode ? `
          <p style="margin-top: 30px;">
            <strong>Your Referral Code:</strong> <code style="background-color: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-size: 16px;">${data.referralCode}</code>
          </p>
          <p>Share this code with friends and earn KES 50 for each signup, plus more when they make purchases!</p>
        ` : ''}
      `,
      ctaText: "Start Browsing Books",
      ctaUrl: `${EMAIL_CONFIG.frontendUrl}/browse`,
    }),
  }),
};

/**
 * Main function to send notification email
 */
export async function sendNotificationEmail(params: {
  userId: string;
  notificationType: string;
  templateData: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's email and preferences
    const userInfo = await getUserEmailInfo(params.userId);

    if (!userInfo.email) {
      console.log(`[EmailService] No email found for user ${params.userId}`);
      return { success: false, error: "User email not found" };
    }

    if (!userInfo.emailNotificationsEnabled) {
      console.log(`[EmailService] Email notifications disabled for user ${params.userId}`);
      return { success: false, error: "Email notifications disabled by user" };
    }

    // Get email template for notification type
    const templateFunction = (EmailTemplates as any)[params.notificationType];

    if (!templateFunction) {
      console.log(`[EmailService] No email template found for type: ${params.notificationType}`);
      return { success: false, error: "Email template not found" };
    }

    // Generate email content
    const emailContent = templateFunction(params.templateData);

    // Send email
    const result = await sendEmail({
      to: userInfo.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return result;
  } catch (error: any) {
    console.error("[EmailService] Send notification email error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send custom email (for admin broadcasts, etc.)
 */
export async function sendCustomEmail(params: {
  to: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const html = getEmailTemplate({
    title: params.title,
    body: params.body,
    ctaText: params.ctaText,
    ctaUrl: params.ctaUrl,
  });

  return sendEmail({
    to: params.to,
    subject: params.subject,
    html,
  });
}

// Export email service utilities
export const emailService = {
  sendNotificationEmail,
  sendCustomEmail,
  isEmailEnabled,
};
