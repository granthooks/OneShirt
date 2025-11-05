
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Heart } from 'lucide-react';
import { Shirt, User, AppView } from './types';
import WinnerModal from './components/WinnerModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import ProfileDropdown from './components/ProfileDropdown';
import ImageGenerator from './components/ImageGenerator';
import AdminDashboard from './components/AdminDashboard';
import { OneShirtLogo, CreditIcon, AdminIcon, SwipeIcon, ProfileIcon } from './components/icons';
import {
  createUser,
  getUserByName,
  getActiveShirts,
  placeBid,
  createShirt,
  markShirtAsWon,
  subscribeToShirtUpdates,
  subscribeToBidUpdates,
  unsubscribeAll
} from './services/databaseService';
import type { User as DbUser, Shirt as DbShirt } from './services/supabaseClient';
import { supabase } from './services/supabaseClient';
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
  const [view, setView] = useState<AppView>(AppView.SWIPE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth and data from Supabase on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        setIsAuthLoading(true);
        setError(null);

        // Step 1: Check authentication session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw new Error(`Auth error: ${sessionError.message}`);
        }

        setSession(currentSession);
        setIsAuthLoading(false);

        // Step 2: Load user data ONLY if authenticated
        if (currentSession?.user) {
          const supabaseUserId = currentSession.user.id;

          // Try to load user from database using their Supabase auth ID
          const { data: existingUsers, error: getUserError } = await supabase
            .from('users')
            .select('*')
            .eq('id', supabaseUserId)
            .single();

          if (getUserError && getUserError.code !== 'PGRST116') {
            // PGRST116 is "not found" error, which is okay
            console.error('Error loading user:', getUserError);
            throw new Error(`Failed to load user: ${getUserError.message}`);
          }

          if (existingUsers) {
            // User exists in database
            setDbUser(existingUsers);
            setUser(dbUserToAppUser(existingUsers));
            setUserId(existingUsers.id);
          } else {
            // User is authenticated but doesn't have a profile yet
            // This is expected for first-time login via magic link
            console.log('Authenticated user without profile - profile will be created on first login flow');
            setUser(null);
            setUserId(supabaseUserId);
          }
        } else {
          // Not authenticated - clear user data
          setUser(null);
          setUserId(null);
        }

        // Step 3: Load active shirts (public data, always load)
        const shirtsResponse = await getActiveShirts();
        if (shirtsResponse.error) {
          throw new Error(`Failed to load shirts: ${shirtsResponse.error}`);
        }

        const dbShirts = shirtsResponse.data || [];

        // If no shirts exist, create initial shirts
        if (dbShirts.length === 0) {
          console.log('No shirts in database, creating initial shirts...');
          const initialShirtPromises = INITIAL_SHIRTS.map(shirt =>
            createShirt(shirt.name, shirt.imageUrl, shirt.bidThreshold, shirt.designer, shirt.likes)
          );
          const createdShirts = await Promise.all(initialShirtPromises);
          const validShirts = createdShirts
            .filter(response => response.data !== null)
            .map(response => response.data!);
          setShirts(validShirts.map(dbShirtToAppShirt));
        } else {
          setShirts(dbShirts.map(dbShirtToAppShirt));
        }

        setIsLoading(false);

        // Step 4: Set up realtime subscriptions after data is loaded
        console.log('Setting up realtime subscriptions...');

        // Subscribe to shirt updates (INSERT, UPDATE)
        const shirtSubscription = subscribeToShirtUpdates((payload) => {
          console.log('Shirt update received:', payload);

          if (payload.eventType === 'INSERT') {
            // New shirt added to database
            const newShirt = payload.new as DbShirt;
            setShirts(prevShirts => {
              // Check if shirt already exists to avoid duplicates
              if (prevShirts.some(s => s.id === newShirt.id)) {
                return prevShirts;
              }
              return [dbShirtToAppShirt(newShirt), ...prevShirts];
            });
          } else if (payload.eventType === 'UPDATE') {
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
          console.log('Bid update received:', payload);

          if (payload.eventType === 'INSERT') {
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

        console.log('Realtime subscriptions active');
      } catch (err) {
        console.error('Error initializing app:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setIsLoading(false);
        setIsAuthLoading(false);
      }
    };

    initializeApp();

    // Cleanup function: unsubscribe from all channels when component unmounts
    return () => {
      console.log('Cleaning up realtime subscriptions...');
      unsubscribeAll();
    };
  }, []);

  // Listen for auth state changes (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession);

      setSession(currentSession);

      if (event === 'SIGNED_IN' && currentSession?.user) {
        // User logged in - load their profile
        const supabaseUserId = currentSession.user.id;
        const userEmail = currentSession.user.email;

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
          setDbUser(existingUser);
          setUser(dbUserToAppUser(existingUser));
          setUserId(existingUser.id);
        } else {
          // User authenticated but no profile - create new profile
          console.log('Creating new user profile for:', userEmail);

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
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating user profile:', createError);
            alert('Failed to create user profile. Please try again.');
            return;
          }

          if (newUser) {
            console.log('User profile created successfully:', newUser);
            setDbUser(newUser);
            setUser(dbUserToAppUser(newUser));
            setUserId(newUser.id);
          }
        }
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
        setCurrentIndex(prev => prev + 1);
        return;
      }

      if (!user) {
        alert('Please complete your profile setup to place bids.');
        setCurrentIndex(prev => prev + 1);
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
    setCurrentIndex(prev => prev + 1);
  }, [user, userId, session]);

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

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
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

  const activeShirts = shirts.slice(currentIndex, currentIndex + 3).reverse();

  // Show loading state
  if (isLoading) {
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
              onClick={onProfileClick}
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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
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
