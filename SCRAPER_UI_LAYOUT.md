# Scraper UI Layout

## Visual Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Download Icon] Import Shirts from Threadless                          │
│  Paste Threadless product URLs below to scrape and import...           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Product URLs                              [Upload .txt file] Button    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Paste Threadless product URLs here (one per line)                  ││
│  │                                                                     ││
│  │ Example:                                                            ││
│  │ https://www.threadless.com/shop/@artist/design/shirt-name/mens     ││
│  │ https://www.threadless.com/shop/@artist/design/another/mens        ││
│  │                                                                     ││
│  │ # Lines starting with # are ignored                                ││
│  │                                                                     ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  2 URLs ready to scrape          [Clear] [Start Scraping] Buttons      │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Progress                                                    2 / 10     │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   20%     ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Current: https://www.threadless.com/shop/@artist/design/shirt/mens    │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  Success     │  │   Skipped    │  │    Failed    │                 │
│  │     5        │  │      2       │  │      1       │                 │
│  │  (green)     │  │   (yellow)   │  │    (red)     │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Activity Log                                           [Clear logs]    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ [10:23:45] • Starting scraper with 2 URLs...                       ││
│  │ [10:23:46] • [1/2] Scraping: https://...                           ││
│  │ [10:23:48] ✓ Scraped: "Retail Trends" by tobefonseca              ││
│  │ [10:23:49] • Processing: "Retail Trends"...                        ││
│  │ [10:23:51] ✓ Successfully added: "Retail Trends"                  ││
│  │ [10:23:51] • Waiting 2 seconds before next request...              ││
│  │ [10:23:53] • [2/2] Scraping: https://...                           ││
│  │ [10:23:55] ✗ Failed to scrape: Invalid URL                         ││
│  │ [10:23:55] ✓ Scraping complete! Success: 1, Failed: 1, Skipped: 0 ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Results                                                                │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ [✓] [Image]  Retail Trends                               (GREEN)   ││
│  │             by tobefonseca                                          ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ [⚠] [Image]  Cool Design                                 (YELLOW)  ││
│  │             by artist123                                            ││
│  │             Already exists in inventory                             ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ [✗]         https://invalid-url.com                       (RED)    ││
│  │             Failed to scrape: Invalid Threadless product URL        ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Background Colors
- Main background: `bg-gray-900`
- Card backgrounds: `bg-gray-800`
- Input backgrounds: `bg-gray-900`
- Border colors: `border-gray-700`

### Status Colors
- **Success** (green):
  - Background: `bg-green-900/20`
  - Border: `border-green-700`
  - Text: `text-green-400`
  - Icon: CheckCircle (green)

- **Skipped** (yellow):
  - Background: `bg-yellow-900/20`
  - Border: `border-yellow-700`
  - Text: `text-yellow-400`
  - Icon: AlertCircle (yellow)

- **Failed** (red):
  - Background: `bg-red-900/20`
  - Border: `border-red-700`
  - Text: `text-red-400`
  - Icon: X (red)

### Buttons
- **Primary** (Start Scraping):
  - Background: `bg-blue-600 hover:bg-blue-700`
  - Text: `text-white`
  - Icon: Play

- **Secondary** (Clear):
  - Background: `bg-gray-700 hover:bg-gray-600`
  - Text: `text-white`
  - Icon: X

- **File Upload**:
  - Background: `bg-gray-700 hover:bg-gray-600`
  - Text: `text-white`
  - Icon: Upload

### Progress Bar
- Track: `bg-gray-700`
- Fill: `bg-gradient-to-r from-blue-500 to-purple-500`

## Component Hierarchy

```
ScraperPage
├── Header Section
│   ├── Download Icon
│   ├── Title
│   └── Description
│
├── URL Input Section (Card)
│   ├── Header
│   │   ├── Title: "Product URLs"
│   │   └── File Upload Button
│   ├── Textarea (large, monospace)
│   └── Footer
│       ├── URL Count
│       └── Action Buttons (Clear, Start)
│
├── Progress Section (Card) - conditional
│   ├── Header (Progress title + counter)
│   ├── Progress Bar (animated)
│   ├── Current URL (truncated)
│   └── Stats Grid (3 columns)
│       ├── Success Card (green)
│       ├── Skipped Card (yellow)
│       └── Failed Card (red)
│
├── Activity Log Section (Card) - conditional
│   ├── Header (title + clear button)
│   └── Log Display (scrollable, monospace)
│
└── Results Section (Card) - conditional
    ├── Header: "Results"
    └── Result Cards (list)
        ├── Success Result
        │   ├── Check Icon (green)
        │   ├── Thumbnail Image
        │   └── Shirt Info (title, designer)
        ├── Skipped Result
        │   ├── Warning Icon (yellow)
        │   ├── Thumbnail Image
        │   └── Shirt Info + "Already exists" message
        └── Failed Result
            ├── X Icon (red)
            ├── URL (no image)
            └── Error Message
```

## Responsive Behavior

### Desktop (lg and above)
- Progress stats: 3 columns grid
- Full width cards
- Textarea: 12 rows (h-48)
- Log display: 16 rows (h-64)

### Tablet (md)
- Progress stats: 3 columns grid (shrinks slightly)
- Full width cards
- Textarea: 10 rows
- Log display: 12 rows

### Mobile (sm and below)
- Progress stats: 1 column (stacked)
- Buttons stack vertically
- Textarea: 8 rows
- Log display: 8 rows
- Result cards stack (image above text)

## Animations

### Entry Animations (Framer Motion)
- Main container: `opacity 0→1, y 20→0` (0.3s)
- Progress section: `opacity 0→1, y 10→0` (instant)
- Log section: `opacity 0→1, y 10→0` (instant)
- Results section: `opacity 0→1, y 10→0` (instant)

### Active Animations
- Progress bar: `width` transition (300ms ease)
- Loading spinner: `animate-spin` (Loader icon)
- Hover effects: `scale 1.02` (buttons)

### Log Updates
- New logs append to bottom
- Auto-scroll to latest entry
- Monospace font for readability

## Icons Used (from lucide-react)

- **Download**: Page header icon
- **Upload**: File upload button
- **X**: Clear button, failed status
- **Play**: Start scraping button
- **Loader**: While scraping (spinning)
- **CheckCircle**: Success status
- **AlertCircle**: Skipped/warning status
- **RotateCcw**: Reset/refresh (if needed)

## Typography

- **Headers**: `text-3xl font-bold text-white`
- **Subheaders**: `text-xl font-bold text-white`
- **Body text**: `text-gray-400`
- **Log text**: `font-mono text-xs text-gray-300`
- **Stats numbers**: `text-2xl font-bold`
- **Button text**: `text-sm font-medium text-white`

## Spacing

- **Section gaps**: `mb-6` (24px)
- **Card padding**: `p-6` (24px)
- **Inner spacing**: `gap-4` (16px)
- **Button gaps**: `gap-2` (8px)
- **Icon-text gaps**: `gap-2` (8px)

## Border Radius

- Cards: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px)
- Inputs: `rounded-lg` (8px)
- Progress bar: `rounded-full`
- Result cards: `rounded-lg` (8px)
