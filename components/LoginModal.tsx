
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDebugLogin, setIsDebugLogin] = useState(false);

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // ============================================================================
      // DEBUG LOGIN FEATURE - DEVELOPMENT ONLY
      // ============================================================================
      // Special debug emails that bypass magic link for easier testing
      // WARNING: This is INSECURE and should ONLY be used in development!
      // Remove or disable this in production!
      //
      // SETUP REQUIRED:
      // To use debug login without email confirmation issues, disable email
      // confirmation in your Supabase project:
      //   1. Go to Supabase Dashboard > Authentication > Providers
      //   2. Click on "Email" provider
      //   3. Toggle OFF "Enable email confirmations"
      //   4. Save changes
      //
      // This allows signUp to create a session immediately without requiring
      // the user to click an email confirmation link.
      // ============================================================================
      const DEBUG_EMAILS = {
        'user@user.com': { name: 'Test User', isAdmin: false },
        'admin@admin.com': { name: 'Admin User', isAdmin: true }
      };

      if (DEBUG_EMAILS.hasOwnProperty(trimmedEmail)) {
        console.log('[DEBUG LOGIN] Detected debug email:', trimmedEmail);

        const debugConfig = DEBUG_EMAILS[trimmedEmail as keyof typeof DEBUG_EMAILS];

        // For debug login, we'll use password auth with a hardcoded password
        // This is intentionally insecure - it's just for development!
        const DEBUG_PASSWORD = 'password';

        // Try to sign in with password
        let authResult = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: DEBUG_PASSWORD,
        });

        // If sign in fails (user doesn't exist), create the account
        if (authResult.error) {
          console.log('[DEBUG LOGIN] User does not exist, creating account...');

          // Sign up the debug user
          // IMPORTANT: We pass autoConfirm in the options to skip email verification for debug accounts
          const signUpResult = await supabase.auth.signUp({
            email: trimmedEmail,
            password: DEBUG_PASSWORD,
            options: {
              // This data gets stored in auth.users.raw_user_meta_data
              // and helps identify this as a debug account
              data: {
                name: debugConfig.name,
                is_debug_account: true,
              },
              // Attempt to bypass email confirmation (works if Supabase project has autoConfirm enabled)
              emailRedirectTo: window.location.origin,
            }
          });

          if (signUpResult.error) {
            throw new Error(`Failed to create debug user: ${signUpResult.error.message}`);
          }

          if (!signUpResult.data.user) {
            throw new Error('Failed to create debug user: No user data returned');
          }

          const userId = signUpResult.data.user.id;

          console.log('[DEBUG LOGIN] User created with ID:', userId);

          // Create user profile in database with appropriate admin flag
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              name: debugConfig.name,
              avatar_url: `https://i.pravatar.cc/150?u=${trimmedEmail}`,
              credit_balance: 1000, // Give debug users more credits
              is_admin: debugConfig.isAdmin,
            });

          if (createError) {
            console.error('[DEBUG LOGIN] Error creating user profile:', createError);
            throw new Error(`Failed to create user profile: ${createError.message}`);
          }

          console.log('[DEBUG LOGIN] Successfully created debug user profile');

          // Check if we got a session from signUp (happens if autoConfirm is enabled)
          if (signUpResult.data.session) {
            console.log('[DEBUG LOGIN] Session created automatically, user is logged in!');
            authResult = signUpResult;
          } else {
            // If no session, we need to sign in (but this may fail if email confirmation is required)
            console.log('[DEBUG LOGIN] No session from signUp, attempting sign in...');
            console.log('[DEBUG LOGIN] NOTE: If this fails, enable autoConfirm in Supabase Dashboard:');
            console.log('[DEBUG LOGIN] Authentication > Providers > Email > "Enable email confirmations" = OFF');

            authResult = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password: DEBUG_PASSWORD,
            });

            if (authResult.error) {
              throw new Error(
                `Debug login failed: ${authResult.error.message}\n\n` +
                `To fix this, disable email confirmation in Supabase:\n` +
                `1. Go to your Supabase Dashboard\n` +
                `2. Navigate to Authentication > Providers\n` +
                `3. Click on Email provider\n` +
                `4. Toggle OFF "Enable email confirmations"\n` +
                `5. Save and try again`
              );
            }
          }
        } else {
          console.log('[DEBUG LOGIN] User exists, checking/updating admin status...');

          // User exists - make sure their admin status is correct
          if (authResult.data.user) {
            const userId = authResult.data.user.id;

            // Update user to ensure correct admin status
            const { error: updateError } = await supabase
              .from('users')
              .update({ is_admin: debugConfig.isAdmin })
              .eq('id', userId);

            if (updateError) {
              console.warn('[DEBUG LOGIN] Could not update admin status:', updateError);
            }
          }
        }

        // Show success message with debug flag
        setIsDebugLogin(true);
        setSuccess(true);
        setEmail('');
        console.log('[DEBUG LOGIN] Login successful!');
        return;
      }

      // ============================================================================
      // NORMAL MAGIC LINK FLOW
      // ============================================================================
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (signInError) {
        throw signInError;
      }

      // Success!
      setSuccess(true);
      setEmail(''); // Clear email input after successful send
    } catch (err) {
      console.error('Error sending magic link:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to send magic link. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setSuccess(false);
    setError(null);
    setIsLoading(false);
    setIsDebugLogin(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !success) {
      handleSendMagicLink();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, y: -100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: -100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {!success ? (
              <>
                {/* Header */}
                <h2 className="text-3xl font-black text-white mb-2">
                  Welcome to OneShirt
                </h2>
                <p className="text-gray-300 mb-6">
                  Sign in with a magic link sent to your email. No password needed!
                </p>

                {/* Email input */}
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-2 text-left"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="your@email.com"
                    className="w-full bg-gray-700 text-white rounded-md border border-gray-600 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                {/* Error message */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mb-4"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Submit button */}
                <motion.button
                  whileHover={!isLoading ? { scale: 1.02 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  onClick={handleSendMagicLink}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </motion.button>

                <p className="text-gray-400 text-xs mt-4">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
              </>
            ) : (
              <>
                {/* Success state */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-4">
                    <svg
                      className="w-16 h-16 text-green-500 mx-auto mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>

                  {isDebugLogin ? (
                    <>
                      <div className="mb-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg inline-block">
                        <span className="text-yellow-400 text-xs font-semibold">DEBUG MODE</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Welcome back!
                      </h2>
                      <p className="text-gray-300 mb-6">
                        You've been logged in using debug credentials. This feature is for development only.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Check your email!
                      </h2>
                      <p className="text-gray-300 mb-6">
                        We've sent a magic link to your inbox. Click the link to sign in securely.
                      </p>
                    </>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClose}
                    className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    Got it!
                  </motion.button>

                  {!isDebugLogin && (
                    <p className="text-gray-400 text-xs mt-4">
                      Didn't receive an email? Check your spam folder or try again.
                    </p>
                  )}
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
