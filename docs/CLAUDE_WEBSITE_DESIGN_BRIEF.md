# Website Product and Design Requirements

Use this document as the product brief when asking Claude to create a visual design prompt, product design, or high-fidelity UI concepts for this project.

## 1. Product overview

Design a responsive streaming and discovery website for **MerDonghua** (the repository is named Huang-anime). The service is aimed primarily at Khmer-speaking viewers who watch Chinese donghua, anime, dramas, and movies. It combines a public content catalogue and video player with signed-in viewer features, VIP membership, and a staff/admin content-management area.

The existing product is a React and TypeScript single-page app with a FastAPI backend. It also runs in mobile browsers, as a Capacitor app, and inside Telegram Mini App. Create a cohesive design system that works across all of these contexts.

## 2. Product goals

1. Help viewers quickly discover a title and start watching an episode.
2. Make episode availability, subtitles, free/VIP access, and playback progress clear.
3. Make continuing a series, saving favourites, and finding new episodes effortless.
4. Explain VIP benefits and payment steps in a trustworthy, locally relevant way.
5. Give staff a clear, efficient workspace to manage the catalogue, episodes, users, and service settings.
6. Keep the experience legible and fast on small phones and inside Telegram's constrained webview.

## 3. Audience and access levels

- **Guest / viewer:** discovers titles, searches, views detail pages, watches eligible content, and can register or sign in.
- **Signed-in member:** manages their profile, favourites, watch history, downloads, notifications, and account settings.
- **VIP member:** receives VIP access according to the current membership and episode rules; the UI must explain access state clearly.
- **Staff / content manager:** manages titles, episodes, media links, downloads, and stream health.
- **Admin / owner:** also manages users, comments, banners, themes, backups, API keys, mobile app information, Telegram tools, and owner-only settings.

Design visible permission differences, but do not treat visual hiding as a security control. The server remains responsible for authorization.

## 4. Language, brand, and visual direction

- Support **Khmer and English** throughout navigation, labels, system messages, and forms. The design must accommodate Khmer glyph shapes and line lengths without clipping or awkward wrapping.
- Make Khmer the natural primary experience for the target audience; provide an obvious language switcher.
- Keep the existing MerDonghua identity recognizable. Do not invent a new product name or replace the logo without a clear reason.
- Use a cinematic dark interface suitable for video discovery and extended viewing. Use strong readable contrast, restrained accent colours, clear poster art, and intentional typography.
- Aim for polished, modern, energetic, premium entertainment—not a generic admin template and not a direct copy of another streaming service.
- Distinguish the consumer experience from the admin workspace while sharing the same underlying design tokens and brand.
- Avoid decorative motion that slows navigation, reduces readability, or causes discomfort. Respect reduced-motion preferences.

## 5. Responsive and platform requirements

- **Desktop:** spacious editorial layout, prominent discovery features, efficient search, and a useful content grid.
- **Tablet:** preserve browsing hierarchy while reducing columns and simplifying navigation.
- **Mobile browser / installed app:** prioritize one-handed use, compact controls, readable episode rows, touch-sized actions, and a persistent bottom navigation pattern where appropriate.
- **Telegram Mini App:** fit narrow viewports and safe areas, keep navigation compact, avoid desktop-only interactions, and support Telegram back-button conventions.
- Design around safe areas, notches, virtual keyboards, portrait and landscape playback, and scrolling content.
- Define sensible responsive behavior at narrow mobile, large mobile, tablet, laptop, and wide-desktop widths.

## 6. Viewer information architecture and screens

### Main navigation

Provide clear access to Home, Explore/catalogue, Donghua, Anime, Search, Shorts, Downloads, and Profile. Surface VIP and notifications without overwhelming the main navigation. Adapt the navigation pattern by device and Telegram context.

### Home (`/`)

- Editorial hero / featured-title spotlight with poster or banner art, title, concise synopsis, metadata, and clear **Watch** and **Details** actions.
- Sections for trending and ranked titles, new releases, latest episodes, schedules, curated categories, trailers, and continue watching where data is available.
- Make cards consistent and scannable, with useful title, category, episode/status, and free/VIP indicators.
- Include meaningful loading, empty, and failed-content states.

### Explore and category catalogues (`/explore`, `/free`, `/donghua`, `/anime`, `/drama`, `/movies`)

- Search/filter controls for title, type, genre/category, release status, and free/VIP availability where supported.
- Responsive title grid with sort/filter state that is easy to understand and clear.
- Distinguish anime, donghua, drama, and movie types while keeping shared card behavior consistent.

### Search (`/search`)

- Prominent search input with useful suggestions or recent query treatment where appropriate.
- Clear results count/state, filters, and responsive result cards.
- Explicit empty, no-match, loading, and error states.

### Title detail (`/anime/:slug`, `/donghua/:slug`, `/drama/:slug`, `/movie/:slug`)

- Present title artwork, Khmer and/or alternate title, synopsis, genres, year/status, and other available metadata.
- Put the primary **Watch now / Continue watching** action first.
- Show episode list with episode number/title, release or duration metadata if available, and an unmistakable free/VIP lock state.
- Include favourite/watchlist action, ratings/reviews/comments, related titles, and trailer where available.
- Keep a long episode list usable on mobile with season/group controls if supported by the data.

### Video player (`/watch/:slug`, `/watch/:slug/:episodeNumber`)

- Treat playback as a focused, low-distraction experience, with a visible route back to the title.
- Support HLS/video playback states: loading, playing, paused, buffering, unavailable/error, and retry.
- Provide episode navigation, quality/source selection when available, subtitles when available, theatre mode, and playback progress.
- Include danmaku/on-screen comments as an optional layer with a clear visibility control.
- Explain sign-in or VIP requirements with an actionable next step; never make a locked episode look like a playback failure.
- On mobile, use touch-friendly controls and account for portrait/landscape orientation and system safe areas.

### Viewer library and account

- **Favourites / library** (`/favorites`, `/library`): saved titles, useful empty state, and direct resume/details actions.
- **History** (`/history`): recently watched titles/episodes and progress with continue-watching actions.
- **Downloads** (`/downloads`): clear download progress, completion, failure, and offline/library states appropriate to the existing app capability.
- **Profile** (`/profile`, `/me`): identity, membership status, quick links, and account activity.
- **Account** (`/account`): personal data and account-related controls.
- **Settings** (`/settings`): language, theme/preferences, security, and sign-out controls that are actually available.
- **Notifications** (`/notifications`): episode, watchlist, and system updates; visually distinguish unread items.
- **Help** (`/help`): concise self-service help and contact path.
- **Referrals** (`/referrals`): referral information and share/copy actions if enabled.
- **QR scan** (`/scan`): a mobile-first scan interface with permission, scanning, success, and failure states.
- **Shorts** (`/shorts`): mobile-friendly short-video discovery with simple playback and navigation.

### Authentication (`/login`, `/register`)

- Design clear, trustworthy sign-in and registration forms with validation, loading, success, and error states.
- Support the existing Google, phone, and Telegram Mini App sign-in entry points where available.
- Keep password visibility, forgot/help affordances, and Khmer/English text comfortable on mobile.
- Make it clear why sign-in is needed when a viewer reaches a protected action, and return them to their intended destination after sign-in.

### VIP and payment (`/vip`)

- Explain benefits and access rules in plain language, show available plans and durations, and clearly distinguish current membership from upgrade options.
- Provide a transparent payment flow for configured methods, including KHQR/manual payment or payment link when enabled.
- Show payment instructions, amount/currency, reference submission, proof attachment/link if enabled, pending review, approved, rejected, and failed states.
- Never imply that a payment succeeded before the backend confirms it.
- Keep the interface locally understandable for Cambodian users and make the trust/safety information easy to find.

## 7. Staff and admin information architecture

Design an efficient, desktop-first admin console that remains usable on tablets and phones. Use a consistent sidebar/top-bar, clear page titles, search/filter patterns, readable tables, and confirmations for destructive actions.

- **Dashboard** (`/admin`): high-level service/content/user activity and direct management shortcuts.
- **Catalogue** (`/admin/donghua`, `/admin/anime`, `/admin/drama`, `/admin/movies`): create/edit/publish titles and manage artwork and metadata.
- **Episodes** (`/admin/episodes`): add/edit/reorder episodes, manage video/subtitle/thumbnail fields, and preview playback.
- **Downloads and stream health** (`/admin/downloads`, `/admin/stream-health`): operational queues, stream status, and actionable error states.
- **Users** (`/admin/users`, `/admin/telegram/users`): find accounts, inspect role/status/membership, and make clearly confirmed administrative changes.
- **Comments and moderation** (`/admin/comments`): review, filter, and moderate user-generated content.
- **Banners and theme** (`/admin/banners`, `/admin/theme`): manage promotional artwork and presentation settings.
- **Backups** (`/admin/backup`): show snapshot metadata and make restore actions explicit and confirmation-gated.
- **API keys** (`/admin/api-keys`): manage names, scopes, expiry, status, and the one-time display of a newly created key.
- **Mobile app tools** (`/admin/mobile` and its push/build/QR subroutes): make distribution actions and status easy to understand.
- **Telegram tools** (`/admin/telegram` and users/broadcast/miniapp subroutes): subscriber, Mini App, and broadcast management.
- **Owner settings** (`/admin/owner`): visibly restricted owner-only controls.

Use table patterns that collapse into mobile cards when necessary. Include empty, loading, saving, success, validation, and failure states. Do not make operational actions look like viewer-facing purchase or playback flows.

## 8. Shared interaction and component requirements

- Reusable title cards, badges, buttons, search/filter controls, forms, modals, toasts, tables, pagination/load-more, skeletons, and empty/error states.
- Clear visual hierarchy and a consistent spacing, typography, colour, radius, and elevation system.
- Accessible keyboard focus, semantic labels, contrast, touch target sizes, and screen-reader support.
- Use confirmation for destructive actions and clearly identify irreversible or high-impact admin actions.
- Avoid relying on colour alone for VIP, status, errors, or permission differences.
- Keep long Khmer/English content, missing poster art, and unusually long titles from breaking layouts.
- Provide graceful unavailable-artwork and unavailable-metadata fallbacks.

## 9. Data and product constraints

- Treat the current backend/API and route structure as the source of truth for existing capabilities.
- Do not invent unsupported payment methods, playback controls, account benefits, or analytics. If a concept is useful but not confirmed, label it as an optional design recommendation.
- Preserve the existing user journeys and data fields; improve clarity and presentation without requiring an API redesign.
- Do not display secrets, raw tokens, password data, or private user information in viewer-facing designs.
- Represent unknown/missing data honestly rather than fabricating counts, ratings, schedules, or payment status.

## 10. Expected design deliverable from Claude

When given this brief, produce a complete, implementation-ready design direction that includes:

1. A concise visual concept and rationale for the Khmer-first streaming brand.
2. Design tokens: colour palette, typography with Khmer font considerations, spacing, radii, elevation, icon style, and motion rules.
3. Navigation and information architecture for desktop, mobile, and Telegram Mini App.
4. High-fidelity page designs for Home, Explore, Title Detail, Video Player, Login/Register, VIP/Payment, Profile/Library, and the Admin Dashboard, plus patterns for the remaining listed screens.
5. Responsive behavior for mobile, tablet, and desktop.
6. Reusable component specifications and key interaction states, including loading, empty, error, locked/VIP, and success states.
7. Any assumptions or optional recommendations clearly separated from confirmed project requirements.

The design should be specific to MerDonghua and this product's Khmer-speaking audience. Avoid generic template output, placeholder-only screens, and mock functionality that contradicts the constraints above.

---

## Copy-ready prompt for Claude

> You are a senior product designer. Use the requirements in this document to create a complete visual design direction for the MerDonghua streaming website and mobile experience. First define a cohesive Khmer-first design system, then design the core viewer flows (Home → Explore/Search → Title Detail → Watch, plus sign-in and VIP payment) and the Admin Dashboard. Cover desktop, mobile, and Telegram Mini App behavior. Include responsive navigation, reusable components, and loading, empty, error, locked/VIP, and success states. Preserve the existing product capabilities and route structure; do not invent unsupported functionality. Make the result cinematic, polished, accessible, locally readable, and implementation-ready. Clearly separate confirmed requirements from optional suggestions.

## 11. Visual concept and rationale

Use **Cinematic Obsidian**: a quiet near-black canvas, layered graphite surfaces, emerald as the MerDonghua action colour, and muted gold reserved for VIP. Poster art and video stills provide most of the colour and energy. This keeps the product immersive while allowing status, access, and actions to stay legible. Use restrained gradients only for featured content and important membership surfaces. The Admin Dashboard uses the same palette and typography, with denser spacing and more structured panels so it reads as a work tool.

## 12. Shared design tokens

The live token definitions are in `frontend/src/styles/design-tokens.css`. Use them for new viewer and admin UI instead of adding unrelated one-off colours.

| Token | Value | Use |
|---|---|---|
| `--md-bg` | `#0b0d10` | Main app canvas |
| `--md-bg-raised` | `#11151a` | Header and raised container |
| `--md-surface` | `#171c22` | Cards and panels |
| `--md-surface-raised` | `#20272f` | Nested panels and menus |
| `--md-surface-hover` | `#29333d` | Hover/pressed surface |
| `--md-brand` | `#63d89a` | Primary brand emphasis |
| `--md-brand-strong` | `#2fc47b` | Primary action and focus accents |
| `--md-vip` | `#f1c779` | VIP label and membership emphasis |
| `--md-danger` | `#ff7770` | Errors and destructive actions |
| `--md-info` | `#78c9f4` | Informational state |
| `--md-text` | `#f6f7f5` | Main text |
| `--md-text-secondary` | `#b4bbc1` | Supporting text |
| `--md-text-muted` | `#8d969e` | Secondary metadata |
| `--md-border` | `rgba(255,255,255,.09)` | Default separators |
| `--md-border-strong` | `rgba(255,255,255,.16)` | Emphasized boundaries |
| `--md-focus` | `#8ce6b4` | Keyboard focus ring |

- **Typography:** Kantumruy Pro for body/UI text, with system sans-serif fallback; Outfit for Latin display headings, with Kantumruy Pro fallback for Khmer. Khmer body line-height is 1.7; Khmer headings should use at least 1.6 and normal letter spacing.
- **Spacing:** 4, 8, 12, 16, 24, and 32 px base increments.
- **Radii:** 8 px small controls, 12 px inputs, 18 px cards, 24 px hero panels.
- **Elevation:** subtle card shadow, stronger overlay/modal shadow; use borders before glow.
- **Icons:** Lucide outline icons, 1.8–2.2 px stroke; always pair state icons with a text label.
- **Motion:** 140 ms quick state change, 220 ms standard transition, ease-out; disable nonessential animation under `prefers-reduced-motion`.
- **Touch/accessibility:** 44 px minimum interactive target, visible keyboard focus, no hover-only affordance, never use colour as the only status signal.

## 13. Navigation and information architecture

| Context | Primary navigation | Secondary access |
|---|---|---|
| Telegram Mini App | Home, Explore, Search, Library, Profile | VIP, Notifications in the compact header; Shorts, Downloads, History, Account, and Settings through their viewer destinations |
| Mobile browser | Same five-item bottom navigation; collapse the desktop catalogue links | VIP and notifications in the header; preserve the same routes |
| Desktop viewer | Brand, catalogue links, Search, VIP, Notifications, Language, Profile | Favourites, History, Downloads, Help, Account, Settings |
| Desktop admin | Fixed sidebar grouped by content, mobile, Telegram, and owner areas; contextual top bar | Search/filter on data-heavy pages, role badge, language switcher, return-to-viewer action |

On Telegram, use the platform BackButton for in-app navigation, theme parameters for host chrome/accent values, expand behavior for the Mini App, and the platform MainButton only for a page's single primary action. Hide competing in-page navigation when a native MainButton is active. Use Telegram initData login already wired in `frontend/src/App.tsx`; the backend remains responsible for validation.

## 14. High-fidelity screen direction

These are design descriptions for the current route-backed screens, not new product features.

1. **Mini App Home:** compact brand header; image-led featured title; one clear Watch/Details pair; horizontal shelves for existing catalogue sections; five-item bottom navigation. Use real catalogue data and graceful image fallbacks.
2. **Explore and Search:** a compact search/filter control row followed by a poster grid. On narrow screens, use two columns with readable Khmer title wrapping; expose filter state and provide a clear no-results action.
3. **Title Detail:** large but bounded poster/hero art, title and available metadata, a strong episode-start action, explicit free/VIP access label, favourite/review actions, then a filterable episode list. In Telegram, use native MainButton for Watch when episodes exist.
4. **Player:** video is the visual focus; controls are touch-first and safe-area aware. Show loading, buffering, unavailable, and retry states distinctly. Show a clear login/VIP gate when access is denied. Keep quality/subtitle controls conditional on real episode data; danmaku has an explicit toggle.
5. **Login:** Telegram is the first Mini App path and should auto-resolve the signed Telegram session. Keep Google and phone as secondary options, show progress/error states, and return to the requested route after authentication.
6. **VIP/Payment:** load plan facts from `/payment/plans` and payment configuration from `/payment/settings`. Show no checkout action when payment is disabled or unconfigured. Use available KHQR/manual or configured link paths only. Show confirmation only after an API response, label manual submission as pending review, and display account payment history/status from the existing payment-history API.
7. **Profile/Library:** profile identity and membership summary first, then obvious shortcuts to favourites, history, downloads, notifications, settings, and help. Library cards use real user data; empty states explain how to add a title.
8. **Admin Dashboard:** dense but calm workspace with page title, real dashboard data, and direct catalogue/episode/user tasks. Preserve role labels and make owner-only affordances distinct.
9. **Admin Episodes:** dense episode-management workbench with a clear selected series, search/filter, episode rows/cards, link/status metadata, and visible preview/edit actions. Keep long Khmer titles readable and avoid horizontal page overflow.
10. **Admin Users:** clear account search and filters, readable role/status/VIP indicators with text labels, and mobile card layout. Destructive or access-changing controls require clear confirmation.

## 15. Responsive behavior

- **Narrow mobile (≤380 px):** 5 equally sized navigation targets, short labels, icon-first header actions, single-column forms, two-column poster grid only where titles remain readable, no clipped Khmer text.
- **Large mobile (381–767 px):** full Khmer/English labels, two-column poster shelves, compact filters, bottom navigation above the safe area.
- **Tablet (768–1023 px):** keep Mini App bottom navigation when inside Telegram; mobile-browser pages may use a wider header; admin sidebar becomes a drawer with comfortable touch targets.
- **Laptop (1024–1439 px):** desktop viewer header and admin fixed sidebar; content uses a centered readable max width; admin data tables retain enough width for key columns.
- **Wide desktop (≥1440 px):** keep viewer shelves and admin content centered rather than stretching text across the viewport; use spare space for denser catalogue grids or secondary metadata.
- Respect virtual keyboards on search/login, safe-area insets, orientation changes, and dynamic viewport height. Avoid fixed overlays that cover the primary action or input.

## 16. Shared component and state specifications

- **Shells:** `Layout`, `MiniAppHeader`, `MobileNav`, `TopNav`, and `AdminLayout` own platform navigation, safe areas, brand, language, and role context.
- **Content:** reusable poster card, title metadata, episode row, filter chip, access badge, and related-title shelf.
- **Controls:** 44 px minimum button/icon action; text-labelled status badge; labelled input; language switcher; confirm dialog for destructive admin actions.
- **Loading:** preserve layout dimensions with skeletons/spinners and expose `role="status"`/accessible label.
- **Empty:** explain what is empty and show one relevant next action; do not insert invented titles/counts.
- **Error:** use plain language, keep entered values where safe, provide retry where supported, and never style a VIP lock as an error.
- **Locked/VIP:** icon plus explicit “Sign in” or “VIP required” text and an action to Login/VIP.
- **Payment:** pending, paid/approved, failed/rejected, expired, or unavailable labels from real API states; no optimistic success.
- **Admin:** loading, empty, saving, validation, success, and failure treatment; preserve task context when an action fails.

## 17. Existing capability boundaries

- `/api/admin/telegram/status` returns bot status, bot identity, and subscriber count. Render the count only when the API returns it; do not expose the returned subscriber identities in the UI.
- `/api/admin/telegram/test` supports a test notification. The current API does **not** provide a generic editable broadcast endpoint or a Mini App launch URL/status field. Do not represent either as implemented. The current bot identity link can be shown; label launch URL verification as unavailable from the API.
- `/api/payment/plans`, `/api/payment/settings`, `/api/payment/manual/submit`, and `/api/payment/history` are the source for plan options, checkout configuration, manual submissions, and payment state.
- Keep route and auth behavior in `frontend/src/App.tsx`; keep role authorization on the server. UI role hiding is only presentation.
- Any further feature that would require an API field or endpoint is an **Optional recommendation**, not a confirmed design requirement.

## 18. Implementation plan for this repository

The lowest-risk order is shared shell first, then reusable states, then individual route surfaces. Do not rename routes or change backend payloads.

1. **Shared tokens and accessibility — completed:** `frontend/src/styles/design-tokens.css`, `frontend/src/index.css`, and `frontend/src/App.css`. Define shared palette/spacing/type/radii/motion, preserve Khmer line-height, show focus, allow text selection, and respect reduced motion.
2. **Platform shell/navigation — completed:** `frontend/src/components/layout/Layout.tsx`, `MiniAppHeader.tsx`, `MobileNav.tsx`, `TopNav.tsx`, `frontend/src/App.tsx`, and `frontend/src/utils/telegram.ts`. Use one brand, five Mini App tabs, notification/VIP header actions, theme/safe-area handling, BackButton cleanup, and a native detail-page MainButton.
3. **Role workspace shell — started:** `frontend/src/pages/admin/AdminLayout.tsx` now shares the tokens and brand and exposes language switching. Retain its grouped route model and server-side role guards. Continue with Dashboard, Episodes, and Users layouts after shell review.
4. **Truthful Telegram management — started:** `frontend/src/pages/admin/AdminTelegramPage.tsx` now reflects API-backed bot status/count and does not fabricate a zero count or online status. Keep test dispatch clearly labelled; do not add fake broadcast or Mini App URL controls.
5. **VIP/payment — completed for the viewer route:** `frontend/src/pages/VIPPage.tsx` loads plans and settings from the current API, hides checkout when not enabled/configured, uses the existing manual payment modal, and displays actual payment states/history. Do not use hardcoded pricing or optimistic payment success.
6. **Viewer screens:** refine `HomePage.tsx`, `ExplorePage.tsx`, `SearchPage.tsx`, `DetailPage.tsx`, `WatchPage.tsx`, `LoginPage.tsx`, `ProfilePage.tsx`, and `FavoritesPage.tsx` using the shared components/states above. Keep the existing API service and preserve paths.
7. **Admin screens:** refine `AdminDashboardPage.tsx`, `AdminEpisodesPage.tsx`, and `AdminUsersPage.tsx` with responsive card/table treatment and consistent loading/empty/error/confirmation patterns. Keep all existing endpoint payloads.
8. **Review pass:** inspect each route in Telegram, mobile browser, tablet, and desktop; confirm no content is hidden by the bottom/native navigation and Khmer text does not clip. Validate the actual payment and Telegram states against backend responses.

## 19. Assumptions and optional recommendations

### Confirmed assumptions

- The current React routes, FastAPI endpoints, auth behavior, catalogue fields, and payment settings remain the product source of truth.
- Existing `/logo.png` is the brand asset and should remain in use; wordmark text should read MerDonghua.
- Telegram is the preferred viewer host, but every viewer route still works as a normal browser route.
- An unavailable endpoint or missing field means “not available”; it does not authorize a demo count, invented plan, fake payment state, or assumed Mini App link.

### Optional recommendations

- Add a server-backed editable Telegram broadcast endpoint if staff need arbitrary announcement text; until then keep the current test dispatch only.
- Add a server-managed Mini App launch URL/status field if Admin must verify the configured Telegram deep link; until then show the bot identity link and the API limitation.
- Consider paging/filtering for very large admin user/episode collections if existing response sizes become a usability problem.
