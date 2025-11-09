
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Heart } from 'lucide-react';
import { Shirt, User, AppView } from './types';
import WinnerModal from './components/WinnerModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import ProfileDropdown from './components/ProfileDropdown';
import ImageGenerator from './components/ImageGenerator';
import AdminDashboard from './components/AdminDashboard';
import SplashScreenModal from './components/SplashScreenModal';
import { OneShirtLogo, CreditIcon, AdminIcon, SwipeIcon, ProfileIcon } from './components/icons';
import {
  createUser,
  getUserByName,
  getActiveShirts,
  placeBid,
  createShirt,
  markShirtAsWon,
  updateShirt,
  subscribeToShirtUpdates,
  subscribeToBidUpdates,
  unsubscribeAll
} from './services/databaseService';
import type { User as DbUser, Shirt as DbShirt } from './services/supabaseClient';
import { supabase, reinitializeSupabaseClient } from './services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

const INITIAL_SHIRTS: Shirt[] = [
  { id: '1', name: 'Synthwave Sunset', imageUrl: 'https://picsum.photos/id/1015/500/500', currentBidCount: 150, bidThreshold: 250, designer: 'Alex Chen', likes: 42 },
  { id: '2', name: 'Glitch Fox', imageUrl: 'https://picsum.photos/id/1025/500/500', currentBidCount: 20, bidThreshold: 250, designer: 'Sam Rivera', likes: 18 },
  { id: '3', name: 'Pixel Peaks', imageUrl: 'https://picsum.photos/id/1043/500/500', currentBidCount: 248, bidThreshold: 250, designer: 'Jordan Kim', likes: 89 },
  { id: '4', name: 'Astro Arcade', imageUrl: 'https://picsum.photos/id/237/500/500', currentBidCount: 112, bidThreshold: 250, designer: 'Taylor Swift', likes: 156 },
];

const BID_THRESHOLD = 250;

// Helper function to convert database shirt to app shirt
const dbShirtToAppShirt = (dbShirt: DbShirt): Shirt => ({
  id: dbShirt.id,
  name: dbShirt.name,
  imageUrl: dbShirt.image_url,
  currentBidCount: dbShirt.current_bid_count,
  bidThreshold: dbShirt.bid_threshold,
  designer: dbShirt.designer || undefined,
  likes: dbShirt.like_count || 0,
});

// Helper function to convert database user to app user
const dbUserToAppUser = (dbUser: DbUser): User => ({
  name: dbUser.name,
  avatarUrl: dbUser.avatar_url || 'https://i.pravatar.cc/150?u=default',
  creditBalance: dbUser.credit_balance,
  isAdmin: dbUser.is_admin || false,
  email: dbUser.email || undefined,
  shippingAddress: dbUser.shipping_address || undefined,
  shirtSize: dbUser.shirt_size || undefined,
  gender: dbUser.gender || undefined,
});

// Main App Component
const App: React.FC = () => {
  const [shirts, setShirts] = useState<Shirt[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
  const [winningShirt, setWinningShirt] = useState<Shirt | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSplashScreenOpen, setIsSplashScreenOpen] = useState(false);
  const [view, setView] = useState<AppView>(AppView.SWIPE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryShirtLoadRef = useRef(false);

  // Debug: Log when isLoading changes
  useEffect(() => {
    console.log('[App] isLoading state changed to:', isLoading);
  }, [isLoading]);

  // Check if splash screen should be shown
  useEffect(() => {
    // Only check after auth is loaded to avoid flash
    if (!isAuthLoading && !session) {
      // User is not authenticated - check if they've seen the splash
      const hasSeenSplash = localStorage.getItem('hasSeenSplash');
      if (!hasSeenSplash) {
        setIsSplashScreenOpen(true);
      }
    }
  }, [isAuthLoading, session]);

  // Initialize auth and data from Supabase on mount
  useEffect(() => {
    // Safety net: Force loading to complete after 20 seconds maximum
    const maxTimeout = setTimeout(() => {
      console.warn('[App] Maximum initialization timeout reached (20s), forcing app to show');
      setIsLoading(false);
      setIsAuthLoading(false);
    }, 20000);

    const initializeApp = async () => {
      try {
        console.log('[App] Starting initialization...');
        // Use functional update to avoid stale closure issues
        setIsLoading(prev => {
          console.log('[App] Setting isLoading to true, previous value:', prev);
          return true;
        });
        setIsAuthLoading(true);
        setError(null);

        // Wait for session to be restored from localStorage
        // This is critical after page refresh when user is logged in
        // Supabase restores the session asynchronously, and queries might hang if executed too early
        console.log('[App] Waiting for session to be restored...');
        
        // Step 3: Different approach - Wait for session using a more reliable method
        // Instead of relying solely on events, we'll check localStorage directly and wait for the event
        let sessionReceived = false;
        let restoredSession: Session | null = null;
        let sessionEvent: string | null = null;
        
        // First, check if there's a session in localStorage
        const checkLocalStorageSession = () => {
          try {
            const sessionKey = Object.keys(localStorage).find(k => 
              k.includes('supabase') && k.includes('auth-token')
            );
            if (sessionKey) {
              const sessionData = localStorage.getItem(sessionKey);
              if (sessionData) {
                try {
                  const parsed = JSON.parse(sessionData);
                  if (parsed && parsed.access_token) {
                    console.log('[App] Found session in localStorage');
                    return true;
                  }
                } catch (e) {
                  console.log('[App] Could not parse session from localStorage');
                }
              }
            }
          } catch (e) {
            console.log('[App] Error checking localStorage:', e);
          }
          return false;
        };
        
        const hasLocalStorageSession = checkLocalStorageSession();
        console.log('[App] Has session in localStorage:', hasLocalStorageSession);
        
        const sessionCheckPromise = new Promise<void>((resolve) => {
          // Set up listener for session events
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[App] Auth state change event:', event, 'session:', session ? 'present' : 'null');
            
            // On page refresh, INITIAL_SESSION should fire first
            // On new login, SIGNED_IN fires
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              console.log('[App] Session event received:', event, 'session:', session ? 'present' : 'null');
              // Store the session from the event - this is reliable
              restoredSession = session;
              sessionEvent = event;
              
              // Ensure session is set in Supabase client before resolving
              if (session) {
                console.log('[App] Session present, waiting for client initialization...');
                // Wait longer for INITIAL_SESSION (page refresh) to ensure session is fully set
                const waitTime = event === 'INITIAL_SESSION' ? 1000 : 100;
                setTimeout(() => {
                  sessionReceived = true;
                  subscription.unsubscribe();
                  resolve();
                }, waitTime);
              } else {
                sessionReceived = true;
                subscription.unsubscribe();
                resolve();
              }
            }
          });
          
          // If we have a session in localStorage but no event fires quickly, wait a bit longer
          const timeoutDuration = hasLocalStorageSession ? 3000 : 2000;
          setTimeout(() => {
            if (!sessionReceived) {
              console.log(`[App] Session check timeout after ${timeoutDuration}ms, proceeding anyway`);
              subscription.unsubscribe();
              resolve();
            }
          }, timeoutDuration);
        });
        
        await sessionCheckPromise;
        console.log('[App] Session restoration check complete, restoredSession:', restoredSession ? 'present' : 'null');
        
        // Step 1: Removed re-initialization - it creates multiple GoTrueClient instances
        // which causes conflicts and undefined behavior. Use the existing client instead.
        
        // CRITICAL FIX: After session restoration, Supabase's getSession() hangs
        // This is because autoRefreshToken tries to refresh the token proactively
        // Instead of calling getSession(), we'll use the session from onAuthStateChange directly
        // The session is already set internally by Supabase, we just need to wait for it to be ready
        
        // Add a delay to ensure Supabase client has fully initialized the session internally
        // This is critical after page refresh when session needs to be restored
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[App] Proceeding with queries after session initialization delay');
        
        // Step 2: If we have a session, explicitly set it in the Supabase client
        // Step 4: Different approach - Instead of waiting, try to use the session directly from localStorage
        if (restoredSession) {
          // Wait longer for INITIAL_SESSION (page refresh) to ensure session is fully initialized
          // INITIAL_SESSION needs more time because the client is restoring from localStorage
          const waitTime = sessionEvent === 'INITIAL_SESSION' ? 2000 : 1000;
          console.log('[App] Waiting', waitTime, 'ms for session to be fully initialized (event:', sessionEvent, ')');
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Step 1: Skip manual setSession - it hangs, and the session should already be set from onAuthStateChange
          // The session from the event should already be in the client, we just need to wait for it to be ready
          console.log('[App] Skipping manual setSession (it hangs). Session should already be set from onAuthStateChange.');
          
          // Wait a bit more to ensure the session is fully propagated
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('[App] Session verified, proceeding with queries');
        }
        
        setIsAuthLoading(false);
        
        // Don't try to load user data here - the auth state change listener will handle it
        // when the session is ready. This prevents hanging on getSession().

        // Step 3: Load active shirts (public data, always load)
        console.log('[App] Step 3: Loading active shirts...');
        let dbShirts: any[] = [];
        let hadError = false;
        
        try {
          // Step 4: Test with a minimal query first to isolate the issue
          console.log('[App] Testing minimal query to isolate issue...');
          try {
            const minimalTest = await Promise.race([
              supabase.from('shirts').select('id').limit(1),
              new Promise<{ data: null; error: string }>((resolve) => {
                setTimeout(() => {
                  console.error('[App] Minimal query timed out after 5 seconds');
                  resolve({ data: null, error: 'Minimal query timeout' });
                }, 5000);
              }),
            ]);
            console.log('[App] Minimal query result:', minimalTest);
            if (minimalTest && 'error' in minimalTest && minimalTest.error) {
              console.error('[App] Minimal query failed:', minimalTest.error);
            }
          } catch (minimalError) {
            console.error('[App] Minimal query exception:', minimalError);
          }
          
          console.log('[App] Calling getActiveShirts()...');
          // getActiveShirts() already has a timeout built in (8 seconds), so just await it directly
          // Add a timeout wrapper to prevent infinite hanging
          const shirtsResponse = await Promise.race([
            getActiveShirts(),
            new Promise<{ data: null; error: string }>((resolve) => {
              setTimeout(() => {
                console.error('[App] getActiveShirts() timed out after 10 seconds');
                resolve({ data: null, error: 'Request timeout' });
              }, 10000);
            }),
          ]);
          console.log('[App] getActiveShirts() response received:', shirtsResponse);
          console.log('[App] Response structure:', JSON.stringify(shirtsResponse));
          console.log('[App] shirtsResponse.error value:', shirtsResponse.error);
          console.log('[App] shirtsResponse.error type:', typeof shirtsResponse.error);
          console.log('[App] shirtsResponse.error truthy:', !!shirtsResponse.error);
          
          if (shirtsResponse.error) {
            console.error('[App] Error loading shirts:', shirtsResponse.error);
            // Set error state so user knows there's a connection issue
            hadError = true;
            dbShirts = [];
            // Show error message instead of empty state
            setError('Unable to connect to server. Please check your connection and refresh the page.');
            retryShirtLoadRef.current = true; // Mark for retry when session is ready
          } else {
            dbShirts = shirtsResponse.data || [];
            console.log('[App] Loaded', dbShirts.length, 'shirts from database');
          }
        } catch (error) {
          console.error('[App] Exception loading shirts:', error);
          // Set error state
          hadError = true;
          dbShirts = [];
          setError('Failed to load shirts. Please refresh the page.');
          console.warn('[App] Continuing with error state due to exception');
        }

        // If no shirts exist, create initial shirts (but skip if we had a timeout/error)
        if (dbShirts.length === 0) {
          // Only try to create initial shirts if we successfully connected to the database
          // If there was a timeout/error, show error state instead of empty state
          
          if (!hadError) {
            console.log('[App] No shirts in database, creating initial shirts...');
            try {
              const initialShirtPromises = INITIAL_SHIRTS.map(shirt =>
                createShirt(shirt.name, shirt.imageUrl, shirt.bidThreshold, shirt.designer, shirt.likes)
              );
              const createdShirts = await Promise.all(initialShirtPromises);
              const validShirts = createdShirts
                .filter(response => response.data !== null)
                .map(response => response.data!);
              console.log('[App] Created', validShirts.length, 'initial shirts');
              setShirts(validShirts.map(dbShirtToAppShirt));
            } catch (createError) {
              console.error('[App] Error creating initial shirts:', createError);
              // Continue with empty array
              setShirts([]);
            }
          } else {
            console.log('[App] Skipping initial shirt creation due to connection error, showing error state');
            setShirts([]);
            // Error already set above
          }
        } else {
          setShirts(dbShirts.map(dbShirtToAppShirt));
        }

        console.log('[App] Step 3 complete, setting isLoading to false');
        clearTimeout(maxTimeout); // Clear the safety timeout
        // Use functional update to ensure state updates correctly
        setIsLoading(prev => {
          console.log('[App] Setting isLoading to false, previous value:', prev);
          return false;
        });
        console.log('[App] setIsLoading(false) called');

        // Step 4: Set up realtime subscriptions after data is loaded
        console.log('[App] Step 4: Setting up realtime subscriptions...');

        // Subscribe to shirt updates (INSERT, UPDATE)
        // Note: Supabase realtime payload structure uses 'eventType' property
        const shirtSubscription = subscribeToShirtUpdates((payload) => {
          console.log('[App] Shirt update received:', payload);
          
          // Handle different payload structures (eventType or event)
          const eventType = payload.eventType || payload.event;
          
          if (eventType === 'INSERT') {
            // New shirt added to database
            const newShirt = payload.new as DbShirt;
            setShirts(prevShirts => {
              // Check if shirt already exists to avoid duplicates
              if (prevShirts.some(s => s.id === newShirt.id)) {
                return prevShirts;
              }
              return [dbShirtToAppShirt(newShirt), ...prevShirts];
            });
          } else if (eventType === 'UPDATE') {
            // Shirt updated in database
            const updatedShirt = payload.new as DbShirt;
            setShirts(prevShirts => {
              const shirtIndex = prevShirts.findIndex(s => s.id === updatedShirt.id);
              if (shirtIndex === -1) {
                // Shirt not in local state, add it if active
                if (updatedShirt.status === 'active') {
                  return [dbShirtToAppShirt(updatedShirt), ...prevShirts];
                }
                return prevShirts;
              }

              // Update existing shirt
              const newShirts = [...prevShirts];
              newShirts[shirtIndex] = dbShirtToAppShirt(updatedShirt);

              // Remove if status changed to won
              if (updatedShirt.status === 'won') {
                return newShirts.filter(s => s.id !== updatedShirt.id);
              }

              return newShirts;
            });
          }
        });

        // Subscribe to bid updates (INSERT only)
        const bidSubscription = subscribeToBidUpdates((payload) => {
          console.log('[App] Bid update received:', payload);
          
          // Handle different payload structures (eventType or event)
          const eventType = payload.eventType || payload.event;

          if (eventType === 'INSERT') {
            const newBid = payload.new as { shirt_id: string; user_id: string };

            // Update the shirt's bid count in local state
            // This simulates real-time multiplayer bidding
            setShirts(prevShirts => {
              const shirtIndex = prevShirts.findIndex(s => s.id === newBid.shirt_id);
              if (shirtIndex === -1) {
                return prevShirts; // Shirt not in local state
              }

              const newShirts = [...prevShirts];
              // Note: We don't manually increment here because shirt updates
              // will come through the shirt subscription with the correct count
              // This is just a backup to ensure we catch bid events
              return newShirts;
            });
          }
        });

        console.log('[App] Initialization complete! Realtime subscriptions active');
        clearTimeout(maxTimeout); // Clear the safety timeout
      } catch (err) {
        console.error('[App] Error initializing app:', err);
        clearTimeout(maxTimeout); // Clear the safety timeout
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setIsLoading(false);
        setIsAuthLoading(false);
      }
    };

    initializeApp();

    // Cleanup function: unsubscribe from all channels when component unmounts
    return () => {
      clearTimeout(maxTimeout);
      console.log('Cleaning up realtime subscriptions...');
      unsubscribeAll();
    };
  }, []);

  // Listen for auth state changes (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[App] Auth state changed:', event, currentSession);

      setSession(currentSession);

      // If we have an error and session becomes available, retry loading shirts
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && currentSession && retryShirtLoadRef.current) {
        console.log('[App] Session available and we have an error, retrying shirt load...');
        retryShirtLoadRef.current = false; // Reset flag
        try {
          const shirtsResponse = await getActiveShirts();
          if (!shirtsResponse.error && shirtsResponse.data) {
            console.log('[App] Retry successful, loaded', shirtsResponse.data.length, 'shirts');
            setShirts(shirtsResponse.data.map(dbShirtToAppShirt));
            setError(null); // Clear error on success
          }
        } catch (retryError) {
          console.error('[App] Retry failed:', retryError);
        }
      }

      // Handle both initial session and sign-in events
      // CRITICAL: Don't make queries in the auth state change handler - it can cause deadlocks
      // The client might be waiting for this handler to complete before allowing other queries
      // Instead, defer the query to avoid blocking
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && currentSession?.user) {
        // User logged in - load their profile
        // Defer the query to avoid blocking the auth state change handler
        const supabaseUserId = currentSession.user.id;
        const userEmail = currentSession.user.email;

        // Use setTimeout to defer the query and avoid blocking
        setTimeout(async () => {
          try {
            const { data: existingUser, error: getUserError } = await supabase
              .from('users')
              .select('*')
              .eq('id', supabaseUserId)
              .single();

            if (getUserError && getUserError.code !== 'PGRST116') {
              console.error('Error loading user after sign in:', getUserError);
              return;
            }

            if (existingUser) {
              console.log('[App] User loaded from database via auth state change');
              const user = existingUser as DbUser;
              setDbUser(user);
              setUser(dbUserToAppUser(user));
              setUserId(user.id);
            } else {
              // User authenticated but no profile - create new profile
              console.log('[App] Creating new user profile for:', userEmail);

              // Extract name from email (part before @)
              const nameFromEmail = userEmail?.split('@')[0] || 'User';

              // Create user profile in database
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                  id: supabaseUserId,
                  name: nameFromEmail,
                  avatar_url: `https://i.pravatar.cc/150?u=${supabaseUserId}`,
                  credit_balance: 100,
                  is_admin: false,
                } as any)
                .select()
                .single();

              if (createError) {
                console.error('Error creating user profile:', createError);
                alert('Failed to create user profile. Please try again.');
                return;
              }

              if (newUser) {
                console.log('User profile created successfully:', newUser);
                const user = newUser as DbUser;
                setDbUser(user);
                setUser(dbUserToAppUser(user));
                setUserId(user.id);
              }
            }
          } catch (profileError) {
            console.error('[App] Error loading/creating user profile in deferred handler:', profileError);
          }
        }, 100); // Defer by 100ms to avoid blocking
      } else if (event === 'SIGNED_OUT') {
        // User logged out - clear user data
        setUser(null);
        setDbUser(null);
        setUserId(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Keyboard shortcut: Shift+A to toggle admin view (admin users only)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'A') {
        e.preventDefault();

        // Only allow admin users to access admin dashboard
        if (!user?.isAdmin) {
          console.log('Admin access denied: User is not an admin');
          return;
        }

        setView(prevView => prevView === AppView.ADMIN ? AppView.SWIPE : AppView.ADMIN);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [user]);

  const handleSwipe = useCallback(async (shirtId: string, direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Check if user is authenticated
      if (!session) {
        alert('Please log in to place bids.');
        setCurrentIndex(prev => {
          const nextIndex = prev + 1;
          return nextIndex >= shirts.length ? 0 : nextIndex;
        });
        return;
      }

      if (!user) {
        alert('Please complete your profile setup to place bids.');
        setCurrentIndex(prev => {
          const nextIndex = prev + 1;
          return nextIndex >= shirts.length ? 0 : nextIndex;
        });
        return;
      }

      if (user.creditBalance > 0 && userId) {
        try {
          // Call database function to place bid
          const bidResult = await placeBid(userId, shirtId, 1);

          if (bidResult.error) {
            console.error('Error placing bid:', bidResult.error);
            alert(`Failed to place bid: ${bidResult.error}`);
            return;
          }

          if (bidResult.data) {
            // Update local user state
            setUser(prevUser => prevUser ? { ...prevUser, creditBalance: prevUser.creditBalance - 1 } : null);

            // Update local shirt state
            setShirts(prevShirts => {
              const newShirts = [...prevShirts];
              const shirtIndex = newShirts.findIndex(s => s.id === shirtId);

              if (shirtIndex !== -1) {
                newShirts[shirtIndex].currentBidCount = bidResult.data.new_bid_count || newShirts[shirtIndex].currentBidCount + 1;

                // Check if this bid won the shirt
                if (bidResult.data.winner) {
                  setWinningShirt(newShirts[shirtIndex]);
                  setIsWinnerModalOpen(true);
                  // Remove the won shirt from the active list
                  return newShirts.filter(s => s.id !== shirtId);
                }
              }
              return newShirts;
            });
          }
        } catch (err) {
          console.error('Exception placing bid:', err);
          alert('Failed to place bid. Please try again.');
        }
      } else if (!userId) {
        alert('User not loaded. Please refresh the page.');
      } else {
        alert("You're out of credits! Please buy more.");
      }
    }
    // Cycle back to beginning when all shirts have been swiped
    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      // If we've reached the end, cycle back to the beginning
      return nextIndex >= shirts.length ? 0 : nextIndex;
    });
  }, [user, userId, session, shirts.length]);

  // Simulate other users bidding (visual only, not persisted to database)
  useEffect(() => {
    // Only run simulation if we have shirts loaded
    if (isLoading || shirts.length === 0) return;

    const interval = setInterval(() => {
      setShirts(prevShirts => {
        if (prevShirts.length === 0) return prevShirts;
        const randomShirtIndex = Math.floor(Math.random() * prevShirts.length);
        const shirtToUpdate = prevShirts[randomShirtIndex];

        if (shirtToUpdate.currentBidCount < BID_THRESHOLD - 1) {
            const newShirts = [...prevShirts];
            newShirts[randomShirtIndex] = {
                ...shirtToUpdate,
                currentBidCount: shirtToUpdate.currentBidCount + Math.floor(Math.random() * 3) + 1,
            };
            return newShirts;
        }
        return prevShirts;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading, shirts.length]);

  const closeWinnerModal = () => {
    setIsWinnerModalOpen(false);
    setWinningShirt(null);
    setCurrentIndex(0); // Reset index after a win
  };

  const addGeneratedShirt = async (newShirt: Shirt) => {
    try {
      // Save to database
      const response = await createShirt(newShirt.name, newShirt.imageUrl, newShirt.bidThreshold, newShirt.designer, newShirt.likes);

      if (response.error) {
        console.error('Error creating shirt:', response.error);
        alert(`Failed to add shirt: ${response.error}`);
        return;
      }

      if (response.data) {
        // Update local state with the database shirt
        const appShirt = dbShirtToAppShirt(response.data);
        setShirts(prevShirts => [appShirt, ...prevShirts]);
        alert(`Shirt "${appShirt.name}" added to inventory!`);
        setView(AppView.SWIPE);
      }
    } catch (err) {
      console.error('Exception creating shirt:', err);
      alert('Failed to add shirt. Please try again.');
    }
  };

  const handleProfileIconClick = () => {
    // Toggle dropdown instead of opening modal directly
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleProfileClick = () => {
    // Open profile modal (called from dropdown menu)
    setIsProfileModalOpen(true);
    setIsProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDbUser(null);
    setUserId(null);
    setIsProfileDropdownOpen(false);
  };

  const handleProfileUpdated = async () => {
    // Reload user data after profile update
    if (userId) {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && updatedUser) {
        setDbUser(updatedUser);
        setUser(dbUserToAppUser(updatedUser));
      }
    }
  };

  const handleSplashGetStarted = () => {
    // Close splash and open login modal
    setIsSplashScreenOpen(false);
    setIsLoginModalOpen(true);
  };

  const handleSplashClose = () => {
    // Just close the splash screen
    setIsSplashScreenOpen(false);
  };

  const activeShirts = shirts.slice(currentIndex, currentIndex + 3).reverse();

  // Debug: Log render state
  console.log('[App] Render check - isLoading:', isLoading, 'error:', error, 'shirts.length:', shirts.length);

  // Show loading state
  if (isLoading) {
    console.log('[App] Rendering loading screen because isLoading is:', isLoading);
    return (
      <div className="w-full h-screen bg-gray-900 text-white flex flex-col items-center justify-center overflow-hidden antialiased p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-xl">Loading OneShirt...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-screen bg-gray-900 text-white flex flex-col items-center justify-center overflow-hidden antialiased p-4">
        <div className="text-center max-w-md">
          <p className="text-2xl font-bold text-red-400 mb-4">Error Loading App</p>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  // Derive isAuthenticated from session
  const isAuthenticated = session !== null;

  // If admin view, render AdminDashboard in fullscreen (no header)
  if (view === AppView.ADMIN) {
    return (
      <>
        <AdminDashboard
          user={user}
          onAddShirt={addGeneratedShirt}
          onLogout={async () => {
            await supabase.auth.signOut();
            setView(AppView.SWIPE);
          }}
          onBackToSwipe={() => setView(AppView.SWIPE)}
        />
        <WinnerModal isOpen={isWinnerModalOpen} onClose={closeWinnerModal} winningShirt={winningShirt} />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        <SplashScreenModal
          isOpen={isSplashScreenOpen}
          onClose={handleSplashClose}
          onGetStarted={handleSplashGetStarted}
        />
      </>
    );
  }

  // Otherwise render normal swipe view with header
  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col items-center justify-center overflow-hidden antialiased p-4">
      <Header
        user={user}
        setView={setView}
        currentView={view}
        isAuthenticated={isAuthenticated}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onProfileIconClick={handleProfileIconClick}
        onProfileClick={handleProfileClick}
        isProfileDropdownOpen={isProfileDropdownOpen}
        onCloseProfileDropdown={() => setIsProfileDropdownOpen(false)}
        onLogout={handleLogout}
      />

      <SwipeView activeShirts={activeShirts} handleSwipe={handleSwipe} />

      <WinnerModal isOpen={isWinnerModalOpen} onClose={closeWinnerModal} winningShirt={winningShirt} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={dbUser}
        userId={userId}
        userEmail={session?.user?.email || null}
        onProfileUpdated={handleProfileUpdated}
      />
      <SplashScreenModal
        isOpen={isSplashScreenOpen}
        onClose={handleSplashClose}
        onGetStarted={handleSplashGetStarted}
      />
    </div>
  );
};


// Header Component
interface HeaderProps {
  user: User | null;
  setView: (view: AppView) => void;
  currentView: AppView;
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onProfileIconClick: () => void;
  onProfileClick: () => void;
  isProfileDropdownOpen: boolean;
  onCloseProfileDropdown: () => void;
  onLogout: () => void;
}
const Header: React.FC<HeaderProps> = ({ 
  user, 
  setView, 
  currentView,
  isAuthenticated,
  onLoginClick,
  onProfileIconClick,
  onProfileClick,
  isProfileDropdownOpen,
  onCloseProfileDropdown,
  onLogout,
}) => {
  return (
    <motion.header
      className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-white/5 backdrop-blur-sm"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-2">
        {isAuthenticated && user ? (
          <motion.div
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
          >
            <CreditIcon className="w-5 h-5 text-yellow-400" />
            <motion.span
              className="font-bold text-lg text-white"
              key={user.creditBalance}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
            >
              {user.creditBalance}
            </motion.span>
          </motion.div>
        ) : (
          <div className="w-20"></div>
        )}
      </div>
      <motion.div
        className="flex items-center gap-2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <OneShirtLogo className="w-10 h-10" />
        <span className="text-xl font-bold tracking-tighter text-white">OneShirt.app</span>
      </motion.div>
      <div className="flex items-center gap-2 relative">
        {user?.isAdmin && (
          <motion.button
            onClick={() => setView(AppView.ADMIN)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white font-semibold transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <AdminIcon className="w-5 h-5" />
            <span>Admin</span>
          </motion.button>
        )}
        {isAuthenticated ? (
          <div className="relative">
            <motion.button
              onClick={onProfileIconClick}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ProfileIcon className="h-6 w-6 text-gray-300" />
            </motion.button>
            <ProfileDropdown
              isOpen={isProfileDropdownOpen}
              onClose={onCloseProfileDropdown}
              onProfileClick={onProfileClick}
              onLogoutClick={onLogout}
            />
          </div>
        ) : (
          <motion.button
            onClick={onLoginClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-semibold transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Login
          </motion.button>
        )}
      </div>
    </motion.header>
  );
};

// Swipe View Component
interface SwipeViewProps {
  activeShirts: Shirt[];
  handleSwipe: (shirtId: string, direction: 'left' | 'right') => void;
}
const SwipeView: React.FC<SwipeViewProps> = ({ activeShirts, handleSwipe }) => (
  <main className="flex-grow flex items-center justify-center relative w-full max-w-sm h-full pt-16 pb-6">
    <AnimatePresence mode="wait">
      {activeShirts.length > 0 ? (
        activeShirts.map((shirt, index) => (
          <SwipeCard
            key={shirt.id}
            shirt={shirt}
            onSwipe={(dir) => handleSwipe(shirt.id, dir)}
            isActive={index === activeShirts.length - 1}
            style={{
              zIndex: index,
              transform: `scale(${1 - (activeShirts.length - 1 - index) * 0.05}) translateY(${(activeShirts.length - 1 - index) * -10}px)`,
            }}
          />
        ))
      ) : (
        <motion.div 
          className="text-center text-gray-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-2xl font-bold">All Done!</p>
          <p>Check back later for new shirts, or add one in the Admin Panel.</p>
        </motion.div>
      )}
    </AnimatePresence>
  </main>
);

// Note: AdminView has been replaced by AdminDashboard component
// ImageGenerator is now integrated into admin/GeneratePage.tsx

// Swipe Card Component
interface SwipeCardProps {
    shirt: Shirt;
    onSwipe: (direction: 'left' | 'right') => void;
    isActive: boolean;
    style: React.CSSProperties;
}
const SwipeCard: React.FC<SwipeCardProps> = ({ shirt, onSwipe, isActive, style }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(shirt.likes || 0);
  // Use state instead of ref to trigger re-renders for exit animation
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('right');

  // Sync like count when shirt prop changes (e.g., from realtime updates)
  useEffect(() => {
    setLikeCount(shirt.likes || 0);
  }, [shirt.likes]);


  // Define animation variants - these are evaluated when the animation plays, not at render time
  const cardVariants = {
    enter: {
      y: 50,
      opacity: 0,
      scale: 0.9
    },
    center: {
      y: 0,
      opacity: 1,
      scale: 1
    },
    exitLeft: {
      x: -300,
      opacity: 0,
      scale: 0.8,
      rotate: -15
    },
    exitRight: {
      x: 300,
      opacity: 0,
      scale: 0.8,
      rotate: 15
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    const { offset } = info;
    if (Math.abs(offset.x) > 100) {
      const direction = offset.x > 0 ? 'right' : 'left';
      setExitDirection(direction);
      // Defer onSwipe to let React process state update first
      setTimeout(() => onSwipe(direction), 0);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIsLiked = !isLiked;
    const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;
    
    // Update local state immediately for responsive UI
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);
    
    // Save to database
    try {
      const { error } = await updateShirt(shirt.id, {
        like_count: newLikeCount
      });
      
      if (error) {
        console.error('Error updating like count:', error);
        // Revert local state on error
        setIsLiked(isLiked);
        setLikeCount(likeCount);
      }
    } catch (err) {
      console.error('Exception updating like count:', err);
      // Revert local state on error
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    }
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    setExitDirection(direction);
    // Defer onSwipe to let React process state update first
    setTimeout(() => onSwipe(direction), 0);
  };

  // Determine which exit variant to use based on the state value
  // This is recalculated when state updates, ensuring correct animation direction
  const exitVariant = exitDirection === 'left' ? 'exitLeft' : 'exitRight';

  return (
    <motion.div
      drag={isActive}
      onDragEnd={handleDragEnd}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit={exitVariant}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileTap={{ scale: isActive ? 0.95 : 1 }}
      whileHover={isActive ? { scale: 1.02 } : {}}
      className="absolute bg-gray-800 rounded-2xl w-full h-[85vh] max-h-[700px] shadow-2xl flex flex-col overflow-hidden select-none"
      style={style}
    >
      {/* Full-screen image with overlay */}
      <div className="flex-grow relative min-h-0">
        <motion.img 
          src={shirt.imageUrl} 
          alt={shirt.name} 
          className="w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6 }}
        />
        
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* Text overlay on image */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 p-6 pb-20 text-white"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h3 className="text-4xl font-bold mb-3 drop-shadow-lg">{shirt.name}</h3>
          
          {shirt.designer && (
            <motion.div 
              className="flex items-center gap-2 mb-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-sm text-white/70 uppercase tracking-wider">Designer</span>
              <span className="text-lg font-semibold drop-shadow-md">{shirt.designer}</span>
            </motion.div>
          )}
          
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ThumbsUp className="w-5 h-5 text-white drop-shadow-md" />
            <span className="text-lg font-semibold drop-shadow-md">{likeCount}</span>
          </motion.div>
        </motion.div>

        {/* Like button */}
        <motion.button 
          onClick={handleLike}
          className="absolute bottom-20 right-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart 
              className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
              strokeWidth={2}
            />
          </motion.div>
        </motion.button>
      </div>

      {/* Action buttons at bottom */}
      <motion.div
        className="flex-shrink-0 flex justify-center items-center gap-4 p-6 bg-white/5 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          onClick={() => handleButtonSwipe('left')}
          className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
        <motion.button
          onClick={() => handleButtonSwipe('right')}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default App;
