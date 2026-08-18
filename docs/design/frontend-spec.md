# OneShirt.app — Functionality Spec for Frontend Design

**Purpose of this document:** give a web/UX designer everything needed to design a
**new frontend** for OneShirt without reading the code. It describes what the app
*does* — every screen, state, interaction, and piece of data the UI shows — but is
deliberately **agnostic about visual style**. You are free to reimagine the look;
the behaviors and data below are the contract the frontend must satisfy.

---

## 1. The Product in One Paragraph

OneShirt is a **gamified t-shirt bidding game** with a **Tinder-style swipe**
interface. Players swipe through a deck of t-shirt designs. Swiping **right places
a bid** (costs 1 credit); swiping **left skips**. Each shirt has a target number of
bids (its *threshold*, default 250). **The player whose bid crosses the threshold
wins that physical shirt for free.** New users get **100 free credits**. There is
also an **admin back-office** (desktop) for managing shirts, users, orders, and
generating/importing new designs.

Two distinct experiences share one app:
- **Player experience** — mobile-first, playful, fast, one card at a time.
- **Admin experience** — desktop, data-dense, utilitarian dashboard.

---

## 2. Primary User Types

| User type        | How they're identified            | What they can do                          |
|------------------|-----------------------------------|-------------------------------------------|
| Visitor (guest)  | Not logged in                     | Browse/swipe the deck, but **cannot bid** |
| Player           | Logged in, `is_admin = false`     | Swipe, bid, like, win, manage profile     |
| Admin            | Logged in, `is_admin = true`      | Everything a player can, **plus** the admin dashboard |

---

## 3. Player Experience — Screens & States

### 3.1 App Chrome (header)
Persistent top bar over the swipe view. Contents depend on auth state:

- **Left:** credit balance pill with a coin/credit icon and the number — **only
  shown when logged in**. The number animates when it changes (e.g. after a bid).
- **Center:** OneShirt logo + wordmark ("OneShirt.app").
- **Right:**
  - If **guest** → a **Login** button.
  - If **player** → a **profile icon** that opens a dropdown menu.
  - If **admin** → an **Admin** button **and** the profile icon.

### 3.2 Swipe Deck (the core screen)
- A **stack of cards**, showing the top ~3 with a subtle scaled/offset "deck" look.
- Each **card** is a large, full-bleed **design image** with a bottom gradient
  overlay for legibility, containing:
  - **Design name** (large title).
  - **Designer** attribution (label + name), when present.
  - **Like count** with a thumbs-up.
  - A floating **heart / like button** (toggles filled/unfilled; count updates instantly).
- **Card actions:**
  - **Drag the card**: past a horizontal threshold it flies off — right = bid, left = skip.
  - **Two big buttons** below the image: a red **✕ (skip/left)** and a green **✓ (bid/right)**.
- **Motion:** cards enter with a rise/scale, exit with a directional slide + rotate
  (left tilts one way, right the other). Everything should feel springy and tactile.
- **Empty state:** when the deck is exhausted, show an **"All Done!"** message
  ("Check back later for new shirts…"). The current app also loops back to the start
  of the deck; a redesign may keep looping or show a true empty state.
- **Ambient liveliness:** bid counts on cards tick upward on their own periodically
  (simulating other bidders) — the UI should make live bid counts feel dynamic.

### 3.3 Bidding feedback & guards
When a player swipes right, one of these happens:
- **Not logged in** → prompt to log in (currently an alert; redesign should use a
  nicer inline prompt/toast), then the card advances.
- **No credits** → "You're out of credits" message (a redesign should surface a
  **buy credits** call-to-action here — see roadmap).
- **Success** → credit balance decrements by 1; the card's bid count goes up.
- **Winning bid** → the **Winner modal** fires (see 3.7) and the shirt leaves the deck.

### 3.4 Login modal
- Triggered by the **Login** button or by trying to bid while logged out.
- **Passwordless / magic-link**: user enters an **email**, receives a link, and is
  logged in on return. There is **no password field**.
- Needs states for: idle, submitting, "check your email" confirmation, and error.

### 3.5 Profile dropdown (header menu)
Opened from the profile icon when logged in. Menu items:
- **Profile** (opens the profile modal).
- **Logout**.

### 3.6 Profile modal
Edit the player's details:
- **Name**, **avatar**, **email**, **shipping address**, **shirt size**, **gender**.
- Shipping address + size matter because winners receive a physical shirt.
- Needs save/cancel, loading, and success/error states.

### 3.7 Winner modal ("You won!")
- Celebratory moment when the player's bid crosses a shirt's threshold.
- Shows the **won shirt** (image + name) and congratulates the user.
- Dismissing it returns the player to the deck (which resets to the top).
- This is the app's emotional peak — design it to feel rewarding (confetti,
  animation, big type, etc.).

### 3.8 Splash / onboarding modal
- Shown to **first-time, logged-out visitors** (tracked so it only appears once).
- Communicates the core loop across a few panels. The app ships art for four ideas:
  - **Swipe** through designs,
  - spend/earn **credits**,
  - **win** shirts,
  - **magic-link** sign-in.
- Has a **"Get Started"** action (opens the login modal) and a way to dismiss.

---

## 4. Player Data Reference (what the UI displays)

**A design (shirt) shows:**
- `name` — title
- `imageUrl` — the design image
- `designer` — attribution (optional)
- `currentBidCount` / `bidThreshold` — progress toward winning (e.g. "150 / 250").
  *A progress indicator toward the threshold is a strong design opportunity the
  current UI under-uses.*
- `likes` — like count

**A player (user) shows:**
- `name`, `avatarUrl`
- `creditBalance` (starts at 100)
- profile fields: `email`, `shippingAddress`, `shirtSize`, `gender`
- `isAdmin` (controls admin access)

**Core rules to reflect in the UI:**
- 1 bid = 1 credit (swipe right).
- Threshold-crossing bid wins the shirt.
- Credits can hit 0 → bidding blocked until more are obtained.

---

## 5. Admin Experience — Screens & States

The admin dashboard is a **separate, full-screen desktop view** (no player header).
Entered via the header **Admin** button or the **`Shift + A`** shortcut, and only
for admins. It has a **sidebar/nav** with six sections:

### 5.1 Dashboard (overview)
- **Stat cards:** total active shirts, total users, bids today, total revenue (credits spent).
- **Top shirts** leaderboard (by bid count, with progress toward threshold).
- **Top users** leaderboard (by bids placed / credits spent).
- **Recent activity** feed: latest bids with the bidder's name/avatar and the shirt.

### 5.2 Inventory (shirt management)
- **Table/grid of all shirts** (active + won; inactive hidden).
- **Create** a new shirt (name, image URL, designer, threshold).
- **Edit** any field (name, image, designer, threshold, status).
- **Delete** = soft delete (status → `inactive`; not destroyed).
- Shows each shirt's status (`active` / `won` / `inactive`) and bid progress.

### 5.3 Generate (AI design creation)
- **Text prompt** input → generate a t-shirt design image via an AI model.
- Shows a **loading/generating** state, then a **preview** of the result.
- Option to **name it and add it to inventory**.
- Needs error handling (generation can fail).

### 5.4 Users (user management)
- **List of all users** with name, avatar, credits, admin flag, join date.
- **Edit credit balance** (grant/adjust credits).
- **Toggle admin** status.
- **Delete** user.

### 5.5 Orders / Winners
- **List of won shirts** = orders to fulfill. Each entry shows:
  - the **shirt** (image, name),
  - the **winner** (name, avatar, and — importantly — shipping address, size),
  - the **win date**,
  - how many bids the winner placed on that shirt.
- This is the fulfillment queue; shipping status/tracking is on the roadmap (not
  yet in the data), so leave room for it.

### 5.6 Scraper (import designs)
- Tool to **import real designs from Threadless** product pages by URL.
- Paste one or more product URLs → the system fetches, parses, downloads the image,
  and adds them to inventory (with duplicate detection).
- Needs progress/log output and per-URL success/skip/fail states.

---

## 6. Global States the Frontend Must Handle

- **Loading (initial):** a full-screen loading state while auth + shirts load
  (there can be a noticeable delay; design a pleasant loading screen, not a blank).
- **Error (initial load):** a full-screen error with a **Reload** action (e.g. when
  the backend can't be reached).
- **Auth transitions:** guest ↔ logged-in must swap header contents and gate bidding.
- **Real-time updates:** bid counts and new shirts can change without a page
  refresh; the UI should update smoothly.
- **Optimistic updates:** likes and credit decrements update instantly, then
  reconcile with the server (and revert on error).

---

## 7. Interaction & Motion Notes

The current app leans heavily on motion (Framer Motion). A redesign doesn't have to
copy it, but these moments benefit from animation:
- Card **enter / exit** (directional, springy).
- **Drag** feedback (card follows the finger/pointer, tilts, and flings off).
- **Credit counter** pop when it changes.
- **Like heart** pulse on toggle.
- **Winner modal** celebration.
- Header/element **entrance** stagger on load.

Mobile is the primary target for the player experience — design for **touch,
single-column, thumb-reachable controls**. Admin is **desktop-first**.

---

## 8. Content / Copy Inventory (for reference)

- Brand tagline: **"Swipe. Bid. Win. Wear."**
- Product name: **OneShirt.app**
- Empty deck: **"All Done!" / "Check back later for new shirts, or add one in the Admin Panel."**
- Out of credits: **"You're out of credits! Please buy more."**
- Login is **email magic-link** (no passwords).
- Default new-user credits: **100**. Default win threshold: **250**.

---

## 9. What's NOT Built Yet (design with room for it)

These are planned but absent — a new frontend should anticipate them:
- **Buy / top-up credits** flow (payments). Currently there's only a dead-end
  "out of credits" message.
- **Notifications** (email/in-app) for wins and shipping.
- **Shipping status & tracking** on orders.
- A richer **guest → sign-up** conversion moment (beyond an alert).

---

## 10. Quick Screen Checklist

Player:
- [ ] Loading screen
- [ ] Error screen (with reload)
- [ ] Splash / onboarding (first visit)
- [ ] Header (guest / player / admin variants)
- [ ] Swipe deck + card (drag + buttons + like)
- [ ] Empty deck state
- [ ] Login modal (magic link)
- [ ] Profile dropdown
- [ ] Profile modal
- [ ] Winner modal
- [ ] Out-of-credits / not-logged-in prompts

Admin:
- [ ] Dashboard (stats + leaderboards + activity)
- [ ] Inventory (CRUD)
- [ ] Generate (AI)
- [ ] Users (management)
- [ ] Orders / Winners (fulfillment)
- [ ] Scraper (import)
