# OneShirt — Visual Design Reference (authoritative)

Distilled from the approved Claude Design mock. The rebuilt UI must look "pretty much the same" as this.
Where this conflicts with docs/10-frontend.md behavior deltas, behavior follows the docs (e.g. NO fake ambient bids, real thresholds like 437/600), but look & feel follows this file.

## Design tokens

- Page background: `#111118`; app surfaces use radial gradient `radial-gradient(130% 70% at 50% 0%, #1a1a34 0%, #0a0a12 62%)`
- Panel/card surface: `#121222`; deep surface `#0a0a12`; sidebar `#0d0d18`; hover row `#1a1a30`
- Borders: `#26263a` (panels), `#33334f` (inputs/secondary), `#22223a` (dividers)
- Accent lime (primary CTA / progress / positive): `#c6ff4d` (hover `#e2ff8f`), paired text-on-lime `#0a0a12`
- Accent pink (brand accent / destructive / admin): `#ff2d78`
- Secondary accents: green `#00ffa3`, purple `#7b2ff7`, yellow `#f9c80e`, cyan `#00d4ff`
- Text: white `#ffffff`; muted `#9d9db8`; faint mono labels `#6c6c8f`; very faint `#44445f`
- Gold coin: `linear-gradient(135deg,#ffe14d,#c6a30e)`, border `#8f7408`, letter "C" in `#6b5606`
- Fonts (Google Fonts, self-host or link): display **Archivo Black**; body/UI **Space Grotesk** (400/500/700); labels/tickers **monospace**, letter-spacing 2–4px, uppercase, 9.5–11px
- Radii: phone frame 36px, panels 14–24px, cards 16–22px, pills/buttons `999px`, inputs 10–12px
- Shadows: `0 24px 64px rgba(0,0,0,.5)` frames; lime glow `0 0 22–44px rgba(198,255,77,.5)`; pink glow `0 6px 20px rgba(255,45,120,.45)`
- Shirt art placeholders: bold 135deg two-color gradients, e.g. `#ff2d78→#2d1b69`, `#00ffa3→#005f73`, `#f9c80e→#ea3546`, `#7b2ff7→#00d4ff`, `#ff6b35→#9b1d64`, `#00d4ff→#2d1b69`, `#c6ff4d→#005f73`

## Animations (CSS keyframes)

- `glowPulse`: pulsing lime box-shadow (bid button, primary CTAs), 2.4s infinite
- `shimmer`: loading bar gradient sweep 1.2s
- `spin`: loaders (coin spinner on splash)
- `fadeUp`: modal/sheet entrance (translateY 16px → 0, .18–.3s)
- `bounceIn`: winner screen elements (scale .3 → 1.08 → 1)
- `conf`: confetti strips falling + rotating 2.3–3.3s, staggered delays, colors lime/pink/green/yellow/purple
- `tick`: ticker translateX(-50%) 20s linear infinite (duplicate content for seamless loop)
- Buttons: `transform .12s`, active scale ~.86–.95

## Player app (mobile-first, ~390px column, dark)

**Layout**: full-height column: header → tagline strip → card stack (flex:1) → action buttons → live ticker.

- **Loading screen**: centered spinning gold coin (52px), logo `ONE`+`SHIRT` (SHIRT in pink) in Archivo Black 26px, 160px shimmer progress bar, mono caption `LOADING THE DROP…`
- **Error screen**: pink-circled ✕ (74px), `CONNECTION LOST`, muted copy, lime pill RELOAD button with glowPulse
- **Header**: left = credit pill (dark `#121222`, lime border + glow, gold coin icon + lime bold count; count "pops" scale 1→1.55→1 on change). Center = logo Archivo Black 17px. Right = guest: outlined lime LOGIN pill; admin: pink ADMIN button; player: 38px avatar circle `linear-gradient(135deg,#ff2d78,#7b2ff7)` toggling a dropdown menu (Profile / divider / Logout in pink), `#121222` panel, fadeUp
- **Tagline**: mono 9.5px, letter-spacing 4px, `SWIPE · WIN · WEAR`
- **Card stack**: top 3 cards; card i offset `translateY(i*14px) scale(1 - i*.045)`; drag = translate(dx, dy*0.15) rotate(dx*0.05deg), no transition while dragging; swipe-out flies 640px sideways with 26deg rotation, .43s cubic-bezier(.45,0,.8,1); release threshold |dx| > 90px
- **Card anatomy**: rounded 22px, gradient art fill; top-right like button pill (♡/♥ + count, pink when liked, backdrop-blur); bottom gradient scrim `linear-gradient(transparent, rgba(5,5,15,.94))` containing: name (Archivo Black 23px uppercase), `by DESIGNER` (mono-ish 10.5px letter-spacing 2px muted), progress row (mono 10px lime: label left, `count / threshold` right), 8px progress bar `linear-gradient(90deg,#c6ff4d,#00ffa3)` on `rgba(255,255,255,.14)`, width transition .4s
- **Empty deck**: dashed `#33334f` border box, lime `ALL DONE!` Archivo Black, muted caption
- **Toast**: pink pill top-center of deck area, white bold 12px, pink glow shadow
- **Action buttons**: centered row — skip: 62px outlined pink circle ✕; bid: 74px solid lime circle ✓ (dark glyph) with glowPulse
- **Ticker** (bottom, real events only): top border `#22223a`, mono 9.5px lime, `▲ MAYA JUST BID ON …` items, 20s loop
- **Winner overlay**: near-black overlay `rgba(5,5,15,.94)`, falling confetti strips, `JACKPOT!` Archivo Black 44px lime with glow + bounceIn, 150×180 shirt art card, shirt name, caption, pink pill `BACK TO THE DECK`
- **Onboarding splash** (4 steps): centered `#121222` card, 84px circular glyph badge (lime glyph, subtle glow), Archivo Black title, muted copy, step dots, full-width lime pill NEXT / `START SWIPING`, underlined muted "skip for now". Steps: swipe the deck / every bid is a credit / cross the line win the shirt / no passwords magic link
- **Buy-credits bottom sheet**: slides from bottom, `#121222`, lime top border, 26px top radii; title `OUT OF CREDITS?`; three row buttons (credits in lime left, price right); middle pack highlighted lime border + glow + pink POPULAR badge; mono footnote
- **Login modal**: centered `#121222` card; `LOG IN WITH` + lime `MAGIC LINK` Archivo Black; copy mentions 100 free credits (rebuild: use config welcome credits); email input (dark, `#33334f` border, lime border on focus); lime pill submit. Sent state: ✉ badge in lime-bordered circle, `CHECK YOUR EMAIL`, bold email echo
- **Profile modal**: centered scrollable card: avatar + CHANGE AVATAR outline pill; mono field labels (NAME/EMAIL/SHIPPING ADDRESS/SIZE/GENDER); dark inputs; CANCEL outline + lime SAVE pills; mono footnote "winners get shirts shipped — keep this current"

## Admin back-office (desktop ≥1280, route /admin, admin-only)

- **Shell**: left sidebar 212px (`#0d0d18`, right border): logo + mono pink `ADMIN CONSOLE`; nav buttons (icon + label; active = lime text on `#1a1a30` rounded); footer version note. Main: header bar (Archivo Black uppercase tab title, mono live date right), scrollable content 24px padding
- **Dashboard**: 4-col stat cards (`#121222`, mono label, Archivo Black 28px lime value); two panels TOP SHIRTS (thumb, name, mini progress bar, `bids/thr` mono lime) and TOP USERS (rank, avatar circle, name, `N bids`); RECENT ACTIVITY list (avatar, "**User** bid on *Shirt*", mono time)
- **Inventory**: add-shirt input + lime `+ ADD SHIRT`; table-like rows grid `56px 1fr 160px 150px 110px 120px`: thumbnail, name/designer, mono lime `bids / thr`, progress bar, status pill, outline action button (hover pink)
- **Generate Designs**: prompt textarea, pink pill `✦ GENERATE DESIGN`; loading = dashed box + lime spinner; result = 260×300 art + name input + lime `ADD TO INVENTORY` + outline `↺ REGENERATE`; error = pink-bordered translucent alert
- **Users**: grid rows `52px 1fr 150px 130px 130px 60px`: avatar, name/email, lime credits + `+100` outline grant button, admin toggle pill, mono joined date, ✕ delete (hover pink)
- **Orders**: 2-col cards: art thumb 74×90, shirt name, "won by **X** · date · N bids", mono lime address, SIZE pill + dashed "shipping status" pill

## Interaction notes

- style-active ≈ `:active { transform: scale(...) }`; style-hover ≈ `:hover`; style-focus on inputs = lime border
- Modals/full overlays: `position:absolute; inset:0` within app frame, layered z-index (menu 65, winner 60, splash 70, buy 75, login/profile 80, loading/error 90)
- Player never sees other users' raw bid identities; per docs, threshold + count ARE visible (do not blur — the mock's blur predates the sweepstakes spec)
