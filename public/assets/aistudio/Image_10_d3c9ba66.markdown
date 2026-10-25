---
name: Academic Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444651'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#00311f'
  on-tertiary: '#ffffff'
  tertiary-container: '#004a31'
  on-tertiary-container: '#27c38a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-timer:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0.04em
  code-meta:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an environment of academic integrity, focus, and structural clarity tailored for secondary school students (grades 6–9), invigilators, and academic administrators. 

The visual narrative bridges authoritative institutional structure with approachable, modern interaction design. For students in early-to-mid adolescence, the interface minimizes cognitive overload, suppresses test anxiety, and provides unmistakable clarity regarding time, status, and navigation. For educators and proctors, it communicates administrative rigor, non-distracting telemetry, and precise telemetry for anti-cheat verification.

The design movement is **Corporate / Modern** inflected with **Tonal Minimalism**:
- Pristine, content-first architectural planes that prioritize readability under timed conditions.
- Functional visual feedback designed to prevent test anxiety while maintaining unambiguous alerts for proctoring notifications, tab-switching penalties, and countdown thresholds.
- Structured data views and card surfaces engineered for high legibility across Chromebooks, desktop monitors, and school-issued tablets.

## Colors

The palette balances institutional trust, focused student engagement, and immediate state recognition.

### Palette Architecture
- **Primary (`#1E3A8A`)**: Deep Academic Blue serves as the core anchor. Used for primary navigation, critical headers, formal examination banners, and dominant interactive actions. An active shade variant (`#2563EB`) handles interactive hover/selection states.
- **Secondary (`#4F46E5`)**: Vibrant Indigo delivers modern visual energy. Used for student-facing navigation accents, active question indicators, progress trackers, and interactive quiz controls.
- **Tertiary / Success (`#10B981`)**: Emerald Green denotes positive scoring states, completed modules, secure verification indicators, and correct responses in review modes.
- **Warning (`#F59E0B`)**: Amber Orange signifies pending submissions, low-time alerts (under 5 minutes remaining), and unattempted question flags.
- **Danger (`#DC2626` / `#EF4444`)**: Alert Red is strictly reserved for high-stakes test events: cheating detection triggers, tab-switch penalty notices, webcam disruption flags, and irreversible action dialogs.
- **Neutrals (`#0F172A`, `#F8FAFC`, `#F1F5F9`)**: Deep slate creates contrast-compliant, readable typography. Surfaces utilize ultra-light cool slates to reduce glare during prolonged testing sessions.

### Application Guidelines
- Backgrounds remain strictly neutral (`#F8FAFC` base canvas; `#FFFFFF` component cards) to maximize text contrast and readability during extended reading and problem-solving.
- High-salience colors (Warning and Danger) must never appear purely decoratively. Their presence must correlate directly with actionable academic alerts or invigilator infractions.

## Typography

Typography prioritizes reading comprehension, scannability, and numeric legibility for students navigating multi-part examination items and administrators parsing performance matrices.

### Font Hierarchy
- **Headline Font (`Space Grotesk`)**: Provides structured, academic geometry without clinical stiffness. Delivers authoritative framing for test sections, assessment categories, and report dashboard KPIs.
- **Body Font (`Plus Jakarta Sans`)**: Delivers friendly, open counters and distinct letterforms tailored for secondary school reading speeds. Eliminates ambiguity between glyphs (e.g., `l`, `1`, `I`), critical for standardized comprehension questions.
- **Label & Numeric Font (`JetBrains Mono`)**: Applied to test timers, question index IDs, system telemetry, student candidate IDs, and proctoring log timestamps. Monospaced tabular alignment ensures countdown clocks and score counters do not visually jitter as numbers increment or decrement.

## Layout & Spacing

The layout model implements a structured 12-column responsive fluid grid designed to keep focus centered on the examination surface while keeping supportive controls accessible.

### Layout Philosophy & Screen Adaptation
- **Desktop (1024px and above)**: 
  - Standard Exam Environment: 12 columns with 1.5rem gutters. The assessment viewport uses a dual-region split layout: a fixed 3-column navigation rail (question matrix, student info, lock status) and an 8-column centralized test vessel (question prompts, stimulus texts, answer forms).
  - Admin Dashboards: 12-column layout balancing wide data tables with 4-column metric distribution cards.
- **Tablet (768px – 1023px)**:
  - Collapses side rails into top utility bars with docked bottom question pagers. Margins adjust to `1.5rem`. Question prompts retain central focus to accommodate on-screen soft keyboards.
- **Mobile (Below 768px)**:
  - Single-column flow with a strict full-bleed pinned test header (Timer + Flag Toggle) and a fixed bottom response bar (Next / Previous / Review). Outer margins compress to `margin-sm` (`1rem`).

### Rhythm Rules
- Question text blocks must maintain vertical spacing using `space-lg` to clearly delineate prompts from multi-choice response targets.
- Touch/click target spacing requires at least `space-sm` separation between choice selectors to prevent accidental selection errors under exam pressure.

## Elevation & Depth

Visual hierarchy uses a refined combination of **tonal layers** and **ambient shadows** to create an uncluttered, distraction-free environment.

### Surface Tiers
- **Canvas Base (`#F8FAFC`)**: Lowest surface; hosts global screen layouts, dashboard canvas, and baseline backdrop.
- **Surface Container Base (`#FFFFFF`)**: Primary examination cards, reading panels, and administrative tables. Bound by a crisp, low-contrast outline (`1px solid #E2E8F0`).
- **Surface Container Elevated**: Question pagination drawers, contextual formula references, and floating time panels. Elevated using an ambient shadow: `0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Surface Overlay / Modal**: Critical infraction alerts (tab switch warnings, network drops, final submission confirmation). Floats above an institutional backdrop dim (`rgba(15, 23, 42, 0.6)`) with a deep ambient shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 10px 10px -5px rgba(15, 23, 42, 0.04)`.

### Border Integrity
- Heavy elevation shifts and drop shadows are deliberately avoided during active exams to prevent screen glare and distraction. Structural boundaries rely on clean `1px` borders tinted with cool slates (`#E2E8F0` resting, `#CBD5E1` active).

## Shapes

The design system adopts a balanced roundedness model (`roundedness: 2`), anchoring component structure with approachable, modern geometry that avoids harsh institutional sharpness without appearing casual or juvenile.

### Shape Language Specifications
- **Base Components (`rounded`, 0.5rem / 8px)**: Text inputs, selection checkboxes, radio choice wrappers, code badges, and inline status pills.
- **Containers & Modules (`rounded-lg`, 1rem / 16px)**: Floating timers, analytics metric blocks, admin data cards, and interactive stimulus panels.
- **Primary Exam Cards (`rounded-xl`, 1.5rem / 24px)**: Core test vessels, main question prompt wrappers, review overview modals, and proctor notification drawers.
- **Circular Elements (`rounded-full`)**: Question navigation grid bubbles (answered/unanswered/flagged), avatar containers, and audio-prompt playback triggers.

## Components

### Buttons
- **Primary Exam Actions (Submit, Save & Continue)**: High-contrast `#1E3A8A` background, white text, `rounded` (8px), padding `12px 24px`. On hover: `#2563EB`. Focus state displays an outer ring `3px solid #93C5FD`.
- **Secondary Controls (Previous, Bookmark, Clear)**: Pure white background, `1px solid #CBD5E1`, `#0F172A` text. Hover shifts to `#F1F5F9`.
- **Critical / Destructive Actions (End Exam Early, Acknowledge Penalty)**: Deep `#DC2626` background with high-contrast text and a non-dismissible confirmation delay.

### Checkboxes & Radio Buttons (Quiz Multiple Choice & Multiple Select)
- Formatted as full-width interactive response cards rather than unadorned native inputs.
- Each choice container uses a minimum touch target height of `56px`, `rounded` (8px), with an interior `1px solid #E2E8F0` border.
- **Selected State**: Border shifts to `2px solid #4F46E5`, paired with an indigo tint fill (`#EEF2FF`). The radio icon or checkbox interior fills with `#4F46E5` displaying a white checkmark/dot.
- **Keyboard Navigation**: Active tab index creates a visible `2px` focus ring offset by `2px`.

### Badges & Status Chips
- Height `24px` to `28px`, `rounded` (8px), padding `2px 10px`, typography set to `label-md`.
- **Answered**: `#ECFDF5` background, `#065F46` text, `#A7F3D0` border.
- **Flagged for Review**: `#FFFBEB` background, `#92400E` text, `#FDE68A` border.
- **Unattempted**: `#F8FAFC` background, `#475569` text, `#E2E8F0` border.
- **Cheating / Tab Switch Penalty**: `#FEF2F2` background, `#991B1B` text, `#FECACA` border.

### Input Fields
- Fill-in-the-blank and short answer fields feature a `#FFFFFF` background, `1px solid #CBD5E1` border, `rounded` (8px), and `12px 16px` padding.
- Error states swap border to `#DC2626` with an inline error message accompanied by a warning icon.

### Cards
- Exam card surfaces utilize `rounded-xl` (24px) styling, `#FFFFFF` fill, and a subtle border (`1px solid #E2E8F0`).
- Padding defaults to `space-xl` (40px) on desktop and `space-md` (16px) on mobile viewports.

### Domain-Specific Components
- **Test Countdown Timer**: Centered or docked container with `rounded-lg` (16px) borders. Displays tabular numbers via `code-timer` typography. When the timer crosses the critical threshold (e.g., < 5 minutes), the card background pulses smoothly from `#F8FAFC` to `#FEF2F2` with digits turning `#DC2626`.
- **Question Matrix Navigator**: A floating or sidebar drawer containing circular numeric badges for every question. Badges update reactively to reflect states: Completed (Solid Emerald), Current (Indigo outline), Flagged (Amber pill notch), and Unvisited (Slate ring).
- **Proctor Anti-Cheat Banner**: A high-priority banner spanning the screen top upon unauthorized tab change or window blur. Displays a countdown suspension warning, logs the infraction count, and requires deliberate student acknowledgement to return to the active test canvas.
- **Analytics Dashboards (Admin & Teacher)**: Modular analytical tiles built using `rounded-lg` (16px) containers. Employs `headline-md` for high-level aggregate score figures, paired with tabular charts for percentile distribution, time-per-question metrics, and infraction heatmaps.