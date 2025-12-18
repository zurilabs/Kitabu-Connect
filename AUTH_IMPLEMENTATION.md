# Authentication & Onboarding Implementation

This document describes the authentication and onboarding system implemented for Kitabu Connect.

## Overview

The system uses **Phone Number + OTP authentication** with **JWT tokens stored in httpOnly cookies** for session management. New users are automatically directed to a **4-step onboarding workflow**.

---

## Core Components

### Backend

#### 1. Database Schema ([shared/schema.ts](shared/schema.ts))

**Users Table:**
- `id`: UUID primary key
- `phoneNumber`: Unique phone number (authentication identifier)
- `fullName`, `email`: Identity information
- `role`: 'PARENT' or 'ADMIN' (auto-assigned based on email domain)
- `schoolId`, `schoolName`: School affiliation
- `latitude`, `longitude`: Home radius coordinates
- `childGrade`: Grade 1-9 for personalized feed
- `onboardingCompleted`: Boolean flag
- `walletBalance`: Decimal for marketplace transactions
- Timestamps: `createdAt`, `updatedAt`

**OTP Codes Table:**
- Stores temporary OTP codes with 10-minute expiration
- Tracks verification status

**Schools Table:**
- Predefined list of Nigerian universities
- Searchable during onboarding

#### 2. Services

**AuthService** ([server/services/auth.service.ts](server/services/auth.service.ts)):
- `sendOTP(phoneNumber)`: Generates 6-digit code, logs to console (dev mode)
- `verifyOTP(phoneNumber, code)`: Validates OTP, creates/fetches user, returns JWT
- `getUserById(userId)`: Fetches user by ID
- `getUserByPhoneNumber(phoneNumber)`: Fetches user by phone

**OnboardingService** ([server/services/onboarding.service.ts](server/services/onboarding.service.ts)):
- `completeOnboarding(userId, data)`: Updates user with all onboarding data
- `checkOnboardingStatus(userId)`: Returns completion status
- **Role Assignment Logic**: Email ending in `@kitabu.admin` → 'ADMIN', otherwise 'PARENT'

#### 3. Middleware ([server/middleware/auth.middleware.ts](server/middleware/auth.middleware.ts))

- `authenticateToken`: Verifies JWT from cookie, attaches user to request
- `checkOnboardingStatus`: Redirects to /onboarding if incomplete
- `requireAdmin`: Restricts access to ADMIN role

#### 4. API Routes ([server/routes.ts](server/routes.ts))

**Auth Endpoints:**
- `POST /api/auth/send-otp` - Send OTP code
- `POST /api/auth/verify-otp` - Verify OTP, set cookie, return user
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Clear auth cookie

**Onboarding Endpoints:**
- `POST /api/onboarding/complete` - Submit all 4 steps at once
- `GET /api/onboarding/status` - Check completion status

**Schools Endpoint:**
- `GET /api/schools` - Get searchable school list

**Protected Routes Example:**
- `GET /api/dashboard` - Requires auth + onboarding completion

#### 5. JWT Utilities ([server/lib/jwt.ts](server/lib/jwt.ts))

- Uses `jose` library for ES256 signing
- 7-day token expiration
- Payload: `{ userId, phoneNumber, role }`

---

### Frontend

#### 1. Hooks

**useAuth** ([client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts)):
```typescript
const {
  user,                    // Current user or null
  isLoading,               // Auth state loading
  isAuthenticated,         // Boolean
  sendOTP,                 // (phoneNumber) => Promise
  verifyOTP,               // (phoneNumber, code) => Promise
  logout,                  // () => Promise
  isSendingOTP,            // Boolean
  isVerifyingOTP,          // Boolean
} = useAuth();
```

**useOnboarding** ([client/src/hooks/useOnboarding.ts](client/src/hooks/useOnboarding.ts)):
```typescript
const {
  completeOnboarding,         // (data) => Promise
  isCompletingOnboarding,     // Boolean
  error                       // Error | null
} = useOnboarding();
```

#### 2. State Machine ([client/src/lib/onboarding-state-machine.ts](client/src/lib/onboarding-state-machine.ts))

```typescript
const {
  currentStep,          // 'identity' | 'school' | 'location' | 'personalization'
  progress,             // 0-100 percentage
  data,                 // OnboardingData object
  goToNextStep,         // () => void
  goToPreviousStep,     // () => void
  updateData,           // (updates) => void
  canProceed,           // () => boolean
  isDataComplete,       // () => boolean
} = useOnboardingStateMachine();
```

#### 3. Pages

**Login Page** ([client/src/pages/login.tsx](client/src/pages/login.tsx)):
- Two-step form: Phone Number → OTP Verification
- Auto-redirects to dashboard/onboarding based on user state
- Dev mode shows OTP code in console/toast

**Onboarding Page** ([client/src/pages/onboarding-new.tsx](client/src/pages/onboarding-new.tsx)):
- 4-step wizard with progress indicator
- Redirects completed users to dashboard
- Submits all data on final step

#### 4. Onboarding Step Components

1. **IdentityStep** ([client/src/components/onboarding/IdentityStep.tsx](client/src/components/onboarding/IdentityStep.tsx))
   - Collects: Full Name, Email
   - Shows admin hint for @kitabu.admin emails

2. **SchoolStep** ([client/src/components/onboarding/SchoolStep.tsx](client/src/components/onboarding/SchoolStep.tsx))
   - Searchable dropdown with Command component
   - Fetches schools from /api/schools

3. **LocationStep** ([client/src/components/onboarding/LocationStep.tsx](client/src/components/onboarding/LocationStep.tsx))
   - Uses browser Geolocation API
   - Captures latitude/longitude for "Home Radius"
   - Error handling for permission denials

4. **PersonalizationStep** ([client/src/components/onboarding/PersonalizationStep.tsx](client/src/components/onboarding/PersonalizationStep.tsx))
   - Grade selector (1-9) as button grid
   - Final step triggers submission

---

## Authentication Flow

### 1. Login Flow
```
User enters phone number
  ↓
POST /api/auth/send-otp
  ↓
Server generates 6-digit OTP
  ↓
OTP logged to console (dev mode)
  ↓
User enters OTP code
  ↓
POST /api/auth/verify-otp
  ↓
Server validates OTP
  ↓
If new user: Create user record
  ↓
Generate JWT (7-day expiry)
  ↓
Set httpOnly cookie: auth_token
  ↓
Return { user, isNewUser }
  ↓
Redirect to /onboarding (if new) or /dashboard
```

### 2. Onboarding Flow
```
Step 1: Identity
  → Collect fullName, email
  ↓
Step 2: School Hub
  → Select school from searchable list
  ↓
Step 3: Location
  → Capture GPS coordinates
  ↓
Step 4: Personalization
  → Select child's grade (1-9)
  ↓
POST /api/onboarding/complete
  ↓
Update user record:
  - Set all collected data
  - Assign role based on email
  - Mark onboardingCompleted = true
  ↓
Redirect to /dashboard
```

### 3. Protected Route Access
```
Request to protected route
  ↓
authenticateToken middleware
  → Read auth_token cookie
  → Verify JWT
  → Attach user to req.user
  ↓
checkOnboardingStatus middleware
  → Check user.onboardingCompleted
  → If false: Return 403 + redirectTo: /onboarding
  ↓
Route handler executes
```

---

## Role Assignment Logic

```typescript
// In OnboardingService.completeOnboarding
const role = data.email.endsWith("@kitabu.admin") ? "ADMIN" : "PARENT";
```

**Examples:**
- `parent@gmail.com` → PARENT
- `john@kitabu.admin` → ADMIN

---

## Session Management

**JWT Token:**
- Algorithm: HS256 (via `jose` library)
- Expiration: 7 days
- Storage: httpOnly cookie
- Secure flag: Enabled in production
- SameSite: lax

**Cookie Name:** `auth_token`

**Cookie Options:**
```javascript
{
  httpOnly: true,              // Not accessible via JavaScript
  secure: NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'lax',            // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
```

---

## Database Setup

### 1. Install MySQL

Ensure MySQL server is running locally or configure remote connection.

### 2. Create Database

```sql
CREATE DATABASE kitabu_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=kitabu_connect
JWT_SECRET=your-secret-key
```

### 4. Run Migrations

```bash
# Option 1: Manual SQL import
mysql -u root -p kitabu_connect < server/migrations/001_initial_schema.sql

# Option 2: Using Drizzle Kit
npm run db:push
```

### 5. Seed Data

```bash
npx tsx server/scripts/seed.ts
```

This will populate the schools table with 8 Nigerian universities.

---

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

This starts the Express server with Vite dev server on port 5000.

### 2. Test Authentication

1. Navigate to http://localhost:5000/login
2. Enter phone number (e.g., `+2348012345678`)
3. Check console for OTP code
4. Enter OTP code to verify
5. Complete 4-step onboarding
6. Access dashboard

### 3. Test OTP Flow

In dev mode, OTP codes are logged:
```
[OTP] Code for +2348012345678: 123456
```

### 4. Test Admin Role

Use email ending in `@kitabu.admin` during onboarding:
```
john.doe@kitabu.admin → ADMIN role
```

---

## API Reference

### Authentication

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phoneNumber": "+2348012345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to +2348012345678. Code: 123456 (dev mode)"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+2348012345678",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ...userObject },
  "isNewUser": true
}
```

Sets `auth_token` cookie.

#### Get Current User
```http
GET /api/auth/me
Cookie: auth_token=<jwt>
```

**Response:**
```json
{
  "user": { ...userObject }
}
```

#### Logout
```http
POST /api/auth/logout
Cookie: auth_token=<jwt>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

Clears `auth_token` cookie.

### Onboarding

#### Complete Onboarding
```http
POST /api/onboarding/complete
Cookie: auth_token=<jwt>
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "schoolId": "uuid",
  "schoolName": "University of Lagos",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "childGrade": 5
}
```

**Response:**
```json
{
  "success": true,
  "user": { ...updatedUserObject }
}
```

#### Get Onboarding Status
```http
GET /api/onboarding/status
Cookie: auth_token=<jwt>
```

**Response:**
```json
{
  "completed": true,
  "user": { ...userObject }
}
```

### Schools

#### Get All Schools
```http
GET /api/schools
```

**Response:**
```json
{
  "schools": [
    {
      "id": "uuid",
      "name": "University of Lagos (UNILAG)",
      "location": "Lagos, Nigeria",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    ...
  ]
}
```

---

## Security Considerations

### Implemented
✅ httpOnly cookies (XSS protection)
✅ JWT with 7-day expiration
✅ OTP expiration (10 minutes)
✅ Phone number uniqueness
✅ Password-less authentication
✅ Secure cookie flag in production
✅ SameSite cookie attribute

### Production Recommendations
- [ ] Integrate real SMS provider (Twilio, Africa's Talking)
- [ ] Add rate limiting on OTP endpoints (max 3 requests/hour)
- [ ] Implement HTTPS enforcement
- [ ] Add CSRF tokens for state-changing operations
- [ ] Hash/encrypt sensitive data at rest
- [ ] Add account lockout after failed OTP attempts
- [ ] Implement refresh token rotation
- [ ] Add email verification for admin accounts
- [ ] Monitor for suspicious login patterns

---

## Troubleshooting

### "Invalid or expired token"
- Check JWT_SECRET in .env matches server
- Clear cookies and re-login
- Verify cookie is being sent with credentials: 'include'

### "Onboarding not completed" error
- User must complete all 4 onboarding steps
- Check `onboardingCompleted` flag in database
- Frontend should redirect to /onboarding automatically

### OTP not received
- In dev mode, check server console logs
- For production, verify SMS provider credentials
- Check OTP expiration (10 minutes)

### Geolocation permission denied
- Browser must support Geolocation API
- User must grant location permission
- HTTPS required in production
- Fallback: Manual lat/lng input (not implemented)

---

## Files Created

### Backend
- `shared/schema.ts` - Database schema with MySQL
- `server/db.ts` - Drizzle ORM connection
- `server/lib/jwt.ts` - JWT utilities
- `server/services/auth.service.ts` - Auth logic
- `server/services/onboarding.service.ts` - Onboarding logic
- `server/middleware/auth.middleware.ts` - Auth middleware
- `server/routes.ts` - API endpoints
- `server/migrations/001_initial_schema.sql` - SQL migrations
- `server/scripts/seed.ts` - Database seeding

### Frontend
- `client/src/hooks/useAuth.ts` - Auth hook
- `client/src/hooks/useOnboarding.ts` - Onboarding hook
- `client/src/lib/onboarding-state-machine.ts` - State machine
- `client/src/pages/login.tsx` - Login page
- `client/src/pages/onboarding-new.tsx` - Onboarding page
- `client/src/components/onboarding/IdentityStep.tsx`
- `client/src/components/onboarding/SchoolStep.tsx`
- `client/src/components/onboarding/LocationStep.tsx`
- `client/src/components/onboarding/PersonalizationStep.tsx`

### Configuration
- `.env.example` - Environment variables template
- `AUTH_IMPLEMENTATION.md` - This documentation

---

## Next Steps

1. **Integrate SMS Provider** (Production)
   - Sign up for Twilio or Africa's Talking
   - Update `authService.sendOTP()` to use real SMS API
   - Add environment variables for API credentials

2. **Update Routes**
   - Replace `/onboarding` route to use `onboarding-new.tsx`
   - Add `/login` route to main app router

3. **Add Protected Routes**
   - Wrap existing pages with `checkOnboardingStatus` middleware
   - Add redirect logic for unauthenticated users

4. **Testing**
   - Run database migrations
   - Seed schools data
   - Test complete auth flow
   - Verify role assignment
   - Test middleware protection

5. **UI/UX Enhancements**
   - Add loading states
   - Improve error messages
   - Add OTP resend countdown timer
   - Add skip option for location step (with warning)

---

## Support

For questions or issues, refer to:
- Drizzle ORM docs: https://orm.drizzle.team/
- Jose JWT library: https://github.com/panva/jose
- React Query: https://tanstack.com/query/latest
