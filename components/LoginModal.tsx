import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      if (mode === 'signup') {
        // Sign up flow
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              name: trimmedName,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!authData.user) {
          throw new Error('Failed to create account. Please try again.');
        }

        // Create user profile in database
        const userId = authData.user.id;
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: userId,
            name: trimmedName,
            email: trimmedEmail,
            avatar_url: `https://i.pravatar.cc/150?u=${trimmedEmail}`,
            credit_balance: 100,
            is_admin: false,
          });

        if (createError) {
          console.error('Error creating user profile:', createError);
          // Don't throw here - the user is created in auth, profile can be created later
          // But log it for debugging
        }

        // Check if we got a session (happens if email confirmation is disabled)
        if (authData.session) {
          // User is automatically signed in
          // Don't reload - the auth state change listener in App.tsx will handle the session update
          handleClose();
        } else {
          // Email confirmation required
          setError(null);
          // Show success message that email confirmation is needed
          alert('Account created! Please check your email to confirm your account before signing in.');
          // Switch to sign in mode
          setMode('signin');
          setPassword('');
          setName('');
        }
      } else {
        // Sign in flow
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password,
        });

        if (signInError) {
          throw signInError;
        }

        if (!authData.user) {
          throw new Error('Failed to sign in. Please try again.');
        }

        // Check if user profile exists in database
        const userId = authData.user.id;
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is fine
          console.error('Error fetching user profile:', fetchError);
        }

        if (!existingUser) {
          // User exists in Auth but not in database - create profile
          const userMetadata = authData.user.user_metadata;
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              name: userMetadata?.name || trimmedEmail.split('@')[0],
              email: trimmedEmail,
              avatar_url: `https://i.pravatar.cc/150?u=${trimmedEmail}`,
              credit_balance: 100,
              is_admin: false,
            });

          if (createError) {
            console.error('Error creating user profile:', createError);
            // Don't throw - user can still sign in, profile can be created later
          }
        }

        // Successfully signed in
        // Don't reload - the auth state change listener in App.tsx will handle the session update
        // Give a small delay to ensure the session is fully set before closing
        await new Promise(resolve => setTimeout(resolve, 100));
        handleClose();
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(
        err instanceof Error
          ? err.message
          : mode === 'signup'
          ? 'Failed to create account. Please try again.'
          : 'Failed to sign in. Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
    setIsLoading(false);
    setMode('signin');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setPassword('');
    if (mode === 'signin') {
      setName('');
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

            {/* Header */}
            <h2 className="text-3xl font-black text-white mb-2">
              {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-300 mb-6">
              {mode === 'signup'
                ? 'Sign up to start bidding on amazing t-shirts!'
                : 'Sign in to continue bidding on amazing t-shirts!'}
            </p>

            {/* Name input (only for sign up) */}
            {mode === 'signup' && (
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-300 mb-2 text-left"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Your name"
                  className="w-full bg-gray-700 text-white rounded-md border border-gray-600 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}

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
                autoFocus={mode === 'signin'}
              />
            </div>

            {/* Password input */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2 text-left"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                className="w-full bg-gray-700 text-white rounded-md border border-gray-600 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                disabled={isLoading}
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
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 mb-4"
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
              {isLoading
                ? mode === 'signup'
                  ? 'Creating Account...'
                  : 'Signing In...'
                : mode === 'signup'
                ? 'Sign Up'
                : 'Sign In'}
            </motion.button>

            {/* Toggle mode */}
            <p className="text-gray-400 text-sm">
              {mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={toggleMode}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={toggleMode}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </p>

            <p className="text-gray-400 text-xs mt-4">
              By {mode === 'signup' ? 'signing up' : 'signing in'}, you agree to our Terms of
              Service and Privacy Policy.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
