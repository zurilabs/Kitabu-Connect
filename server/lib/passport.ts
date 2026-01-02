import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { authService } from "../services/auth.service";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";

// Check if Google OAuth is configured
const isGoogleConfigured = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

console.log('[Google OAuth] Configuration status:', {
  clientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
  clientSecret: GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
  callbackURL: GOOGLE_CALLBACK_URL,
  isConfigured: isGoogleConfigured,
});

if (!isGoogleConfigured) {
  console.warn('[Google OAuth] NOT configured - missing credentials');
  console.warn('Get your credentials from: https://console.cloud.google.com/apis/credentials');
} else {
  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID!,
        clientSecret: GOOGLE_CLIENT_SECRET!,
        callbackURL: GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const fullName = profile.displayName;
          const profilePictureUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Authenticate or create user
          const result = await authService.authenticateWithGoogle(
            googleId,
            email,
            fullName,
            profilePictureUrl
          );

          if (!result.success || !result.user) {
            return done(new Error(result.message || 'Authentication failed'), undefined);
          }

          return done(null, result.user);
        } catch (error) {
          console.error('[Google OAuth] Strategy error:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await authService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export { passport, isGoogleConfigured };
