```markdown
# Design System Specification: The Ethereal Academic

## 1. Overview & Creative North Star
**The Creative North Star: "The Focused Nebula"**

This design system is built to transform the sterile nature of study apps into a high-end, immersive sanctuary for deep work. We are moving away from the "grid of boxes" typical of SaaS and toward an editorial, layered experience. 

The system utilizes **Organic Asymmetry** and **Tonal Depth**. By breaking the rigid 12-column expectations with overlapping elements and shifting containers, we create a sense of fluidity. We don't just "display" information; we curate it using high-contrast typography scales and "breathing" white space that mimics a premium physical journal, reimagined for a digital space.

---

## 2. Colors & Surface Architecture

The palette is rooted in deep, nocturnal tones, punctuated by high-vibrancy light sources. 

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. To separate the "Library" from the "Focus Timer," do not draw a line. Instead, use a background shift from `surface` (#0b1326) to `surface_container_low` (#131b2e). Boundaries are felt through tonal transitions, not seen through strokes.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested, frosted layers.
*   **Base Layer:** `surface_dim` (#0b1326) – The infinite background.
*   **Structural Sections:** `surface_container_low` (#131b2e) – Large layout areas.
*   **Interactive Cards:** `surface_container` (#171f33) – The primary canvas for content.
*   **Elevated Details:** `surface_container_highest` (#2d3449) – To be used for popovers or active selection states.

### The "Glass & Gradient" Rule
To achieve the signature "Linear" aesthetic:
*   **Glassmorphism:** For floating navigation or sidebars, use `surface_container` at 70% opacity with a `24px` backdrop-blur.
*   **Signature Textures:** Main CTAs must use a linear gradient: `primary` (#d0bcff) to `primary_container` (#a078ff) at a 135-degree angle. This adds a "soul" to the button that flat hex codes cannot replicate.

---

## 3. Typography: Editorial Authority

We use **Inter** as a variable font to create a sophisticated hierarchy.

*   **Display (lg/md):** Used sparingly for "Flow States" or "Daily Goals." Set these with -0.04em letter spacing and "SemiBold" weight. They should feel authoritative and cinematic.
*   **Headline & Title:** The "workhorse" of the system. Use `title-lg` for card headers to ensure clear scannability.
*   **Body (md/sm):** Optimized for long-form reading of study notes. Use `on_surface_variant` (#cbc3d7) for body text to reduce eye strain against the dark background.
*   **Labels:** Always uppercase with +0.05em tracking when used in small caps for metadata (e.g., "TIME REMAINING").

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved by "stacking" the surface-container tiers. Place a `surface_container_highest` card on top of a `surface_container_low` background to create a soft, natural lift.

### Ambient Shadows
Shadows must never be black. Use a tinted shadow based on the primary or secondary glow.
*   **Focus Shadow:** `box-shadow: 0 20px 40px rgba(139, 92, 246, 0.15);` (A subtle purple bloom).
*   **Standard Lift:** Large blur (32px+), low opacity (6%).

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., input fields), use the **Ghost Border**:
*   `outline_variant` (#494454) at **15% opacity**. It should be a suggestion of a container, not a cage.

---

## 5. Components

### Buttons & Interaction
*   **Primary:** Gradient fill (`primary` to `primary_container`) with a 1px inner "light leak" border (top-weighted) at 20% white.
*   **Secondary:** No background. Only a `Ghost Border` and `primary` text.
*   **Tertiary:** Ghosted buttons that reveal a `surface_container_high` background only on hover.

### Study-Specific Components
*   **The Focus Card:** A `surface_container` element with a `primary` subtle glow (`box-shadow`) emanating from the top-left corner only.
*   **Progress Rings:** Use `secondary` (#adc6ff) with a glow effect (`drop-shadow`) to signify active energy.
*   **Floating Navigation:** A glassmorphic bar at the bottom of the screen, using `xl` rounding (0.75rem) and a 10% `outline_variant` stroke.

### Input Fields
*   Never use a box. Use a `surface_container_lowest` background with a bottom-only 1px stroke that animates to `primary` width on focus.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetric Padding:** Use `spacing.16` (4rem) for top margins and `spacing.8` (2rem) for side margins to create an editorial feel.
*   **Embrace the Glow:** Use subtle, large-scale radial gradients in the background (e.g., a 400px wide 5% opacity purple circle) to break up the "flatness" of the dark mode.
*   **Layer Surfaces:** Think of the UI as a physical desk with stacked papers.

### Don't:
*   **No Hard Lines:** Never use a 100% opaque border to separate content.
*   **No Pure Black:** Avoid #000000. Use `surface_dim` (#0b1326) to maintain the "premium charcoal" depth.
*   **No Standard Grids:** Avoid perfectly symmetrical 4-column layouts. Try a 2/3 and 1/3 split to create visual interest.
*   **No Default Shadows:** Never use the default browser/Figma "Drop Shadow." If it's not diffused and tinted, it's not part of this system.