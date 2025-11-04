# Supabase Debug Login Setup Guide

This guide explains how to configure Supabase to work with the debug login feature in development.

## The Problem

By default, Supabase requires users to confirm their email address before they can sign in. This is great for production security, but it makes development testing difficult because you have to:
1. Create an account
2. Check your email
3. Click the confirmation link
4. THEN you can sign in

For debug accounts (`user@user.com` and `admin@admin.com`), we want instant login without email confirmation.

## The Solution

Disable email confirmation in your Supabase project settings (for development only).

### Step-by-Step Instructions

1. **Go to your Supabase Dashboard**
   - Navigate to your project at https://app.supabase.com

2. **Open Authentication Settings**
   - In the left sidebar, click on "Authentication"
   - Then click on "Providers"

3. **Configure Email Provider**
   - Find and click on the "Email" provider in the list
   - Look for the setting "Enable email confirmations"
   - **Toggle it OFF** (disable it)
   - Click "Save" at the bottom

4. **Test the Debug Login**
   - Open your OneShirt app
   - Click "Sign In"
   - Enter `user@user.com` or `admin@admin.com`
   - The login should work immediately without needing email confirmation

## How It Works

When email confirmation is disabled:

1. `signUp()` creates a new user account
2. **AND** immediately returns an active session
3. The user is logged in right away
4. No email confirmation required

When email confirmation is enabled (default):

1. `signUp()` creates a new user account
2. But does NOT return a session
3. User must click email link to confirm
4. Only then can they sign in

## Debug Login Flow

The `LoginModal.tsx` component handles debug login like this:

```typescript
// Try to sign in first
signInWithPassword(email, password)

// If user doesn't exist:
if (error) {
  // Create the account
  signUp(email, password)

  // Check if we got a session immediately
  if (session exists) {
    // SUCCESS! Login complete (email confirmation disabled)
  } else {
    // Try to sign in again (will fail if email confirmation enabled)
    signInWithPassword(email, password)
  }
}
```

## Security Notes

**IMPORTANT:** This setup is for DEVELOPMENT ONLY!

- Debug emails (`user@user.com`, `admin@admin.com`) use hardcoded passwords
- Email confirmation is disabled
- Anyone can create accounts without verification

**For production:**
- Remove or disable debug login code
- Re-enable email confirmation
- Use proper authentication flows

## Troubleshooting

### Still getting "Email not confirmed" error?

1. Double-check that email confirmation is disabled in Supabase Dashboard
2. Delete the existing debug user from Supabase:
   - Go to Authentication > Users
   - Find `user@user.com` or `admin@admin.com`
   - Delete the user
   - Try logging in again (will create a fresh account)

### Session not being created?

Check the browser console logs:
- `[DEBUG LOGIN] Session created automatically` = Success!
- `[DEBUG LOGIN] No session from signUp` = Email confirmation is still enabled

### User profile not created in database?

Check:
1. The `users` table exists (run migrations)
2. The database user has INSERT permissions
3. The `id` field matches the auth user ID

## Alternative Approaches (Not Implemented)

Other ways to handle debug login:

1. **Admin API**: Use Supabase Admin SDK to create confirmed users programmatically
2. **Database Trigger**: Auto-confirm users matching debug emails via database trigger
3. **Custom Auth**: Build a separate dev-only auth endpoint
4. **Manual Confirmation**: Keep debug accounts pre-created and confirmed

We chose the "disable email confirmation" approach because:
- Simple to set up (just toggle a setting)
- Works with standard Supabase client
- No additional infrastructure needed
- Easy to re-enable for production
