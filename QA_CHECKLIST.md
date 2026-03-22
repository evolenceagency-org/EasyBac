# BacTracker Manual QA Checklist

## Landing & Public Pages
1. Open `/` and verify hero, CTA buttons, and footer render.
2. Click "Start Free Trial", "Login", "Register" CTAs and confirm navigation.
3. Open `/pricing`, `/contact`, `/donate`, `/payment` directly (no auth).
4. Confirm no layout clipping on short screens and no horizontal scroll.

## Auth & Routing
1. Login with a valid account.
2. Verify redirect to `/dashboard`.
3. Try visiting `/login` and `/register` when authenticated (should redirect to `/dashboard`).

## Sidebar & Navigation
1. Sidebar stays fixed on desktop.
2. Sidebar scrolls internally if content exceeds viewport height.
3. Bottom section (email + logout) remains visible.
4. Mobile: tap Menu button to open/close sidebar.

## Dashboard & Analytics
1. Charts render without errors.
2. No UI clipping at 100% zoom.
3. Cards align in grid and wrap correctly on smaller screens.

## Tasks & Timer
1. Create, edit, complete, and delete tasks.
2. Start timer (free + pomodoro) and save session.
3. Trial restriction blocks actions and redirects to `/payment`.

## Payment Flow
1. "Get Premium" CTA navigates to `/payment`.
2. RIB is visible (from env) and copy works.
3. WhatsApp CTA opens with pre-filled message.
4. If env missing, UI shows fallback text without breaking.

## Trial Expiry Behavior
1. Manually set `trial_start` older than 3 days.
2. Ensure dashboard access is blocked.
3. Confirm data operations are blocked by RLS (read/write).
