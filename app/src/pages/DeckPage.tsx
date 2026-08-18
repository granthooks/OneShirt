import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "../components/AppHeader";
import { TaglineStrip } from "../components/TaglineStrip";
import { SwipeDeck } from "../components/SwipeDeck";
import { Ticker } from "../components/Ticker";
import { LoginModal } from "../components/LoginModal";
import { BuyCreditsSheet } from "../components/BuyCreditsSheet";
import { ProfileModal } from "../components/ProfileModal";
import { WinOverlay } from "../components/WinOverlay";
import { OnboardingSplash, hasOnboarded } from "../components/OnboardingSplash";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function DeckPage() {
  const { isSignedIn, user } = useCurrentUser();
  const [showLogin, setShowLogin] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !hasOnboarded());
  const [dismissedWinNotificationId, setDismissedWinNotificationId] = useState<string | null>(null);

  const notifications = useQuery(
    api.notifications.list,
    isSignedIn ? { paginationOpts: { numItems: 10, cursor: null } } : "skip"
  );
  const markRead = useMutation(api.notifications.markRead);

  const winNotification = notifications?.page.find(
    (n) => n.kind === "draw_result_win" && !n.read && n._id !== dismissedWinNotificationId
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <AppHeader onLoginClick={() => setShowLogin(true)} />
      <TaglineStrip />
      <SwipeDeck
        onRequireLogin={() => setShowLogin(true)}
        onNoCredits={() => setShowBuyCredits(true)}
      />
      <Ticker />

      <AnimatePresence>
        {showSplash && (
          <OnboardingSplash
            onDone={() => setShowSplash(false)}
            onGetStarted={() => setShowLogin(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showBuyCredits && (
          <BuyCreditsSheet onClose={() => setShowBuyCredits(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && user && (
          <ProfileModal user={user} onClose={() => setShowProfile(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winNotification && (
          <WinOverlayForNotification
            notificationId={winNotification._id}
            shirtId={winNotification.shirtId ?? null}
            title={winNotification.title}
            onConfirmDetails={() => {
              void markRead({ notificationId: winNotification._id });
              setDismissedWinNotificationId(winNotification._id);
              setShowProfile(true);
            }}
            onDismiss={() => {
              void markRead({ notificationId: winNotification._id });
              setDismissedWinNotificationId(winNotification._id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WinOverlayForNotification({
  shirtId,
  title,
  onConfirmDetails,
  onDismiss,
}: {
  notificationId: string;
  shirtId: string | null;
  title: string;
  onConfirmDetails: () => void;
  onDismiss: () => void;
}) {
  const shirt = useQuery(
    api.shirts.getShirt,
    shirtId ? { shirtId: shirtId as never } : "skip"
  );

  return (
    <WinOverlay
      shirtName={shirt?.name ?? title}
      shirtImageUrl={shirt?.webImageUrl ?? null}
      shirtId={shirtId ?? ""}
      onConfirmDetails={onConfirmDetails}
      onDismiss={onDismiss}
    />
  );
}
