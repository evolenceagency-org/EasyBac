# Design System Specification: The Liquid Intelligence Framework

## 1. Overview & Creative North Star: "The Obsidian Curator"
This design system is built upon the concept of **The Obsidian Curator**. We are moving away from the "boxy" SaaS aesthetic of the last decade and toward a fluid, editorial experience that feels like high-end hardware. 

The system rejects rigid, visible containers in favor of **Tonal Depth** and **Refractive Surfaces**. By utilizing "Liquid Glass" as a primary metaphor, we create a UI that feels deeply integrated into the background, where data doesn't just sit on a screen—it glows within a dark, premium ether. High-contrast typography scales (Manrope vs. Inter) provide an authoritative, editorial voice that demands attention while maintaining functional clarity.

---

## 2. Color & Atmospheric Theory

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Structural definition must be achieved through **Background Color Shifts** or **Tonal Transitions**.
*   **Surface Hierarchy:** Use `surface_container_lowest` (#0e0e0e) for the deep background and `surface_container` (#201f1f) for primary content areas. 
*   **The Transition:** To separate a sidebar from a main feed, transition from `surface_dim` (#131313) to `surface_bright` (#3a3939) using a subtle 45-degree gradient rather than a stroke.

### The "Glass & Gradient" Rule
Floating elements (modals, dropdowns, hover cards) must use **Glassmorphism**.
*   **Formula:** `surface_variant` (#353534) at 40% opacity + `backdrop-filter: blur(24px)`.
*   **Signature AI Glow:** For AI-driven insights, use a linear gradient: `secondary` (#ddb7ff) → `primary` (#adc6ff) → `tertiary` (#4ae176). This gradient should be applied as a 2px "Outer Glow" or a subtle "Mesh Gradient" behind the component.

### Color Tokens (Material Design Scale)
| Token | Hex | Role |
| :--- | :--- | :--- |
| `background` | #131313 | Deep canvas / Page root |
| `primary` | #adc6ff | Focus / Primary actions (Blue) |
| `secondary` | #ddb7ff | Analytics / Brand accents (Purple) |
| `tertiary` | #4ae176 | Success / Growth metrics (Green) |
| `surface_container`| #201f1f | Main card / Content block |
| `outline_variant` | #414755 | Ghost borders (use at 15% opacity) |

---

## 3. Typography: Editorial Authority
We pair the geometric confidence of **Manrope** for display with the functional precision of **Inter** for data.

*   **Display & Headline (Manrope):** Use `display-lg` (3.5rem) with `-0.04em` letter spacing for hero sections. Headlines should always be "Bold" to create a high-contrast hierarchy against the dark background.
*   **Body & Labels (Inter):** Use `body-md` (0.875rem) for general interface text. For data-heavy tables, use `label-md` (0.75rem) with `on_surface_variant` (#c1c6d7) to reduce visual noise.

---

## 4. Elevation & Depth: Tonal Layering

### The Layering Principle
Do not use shadows to create height; use **Surface Nesting**. 
1.  **Level 0 (Base):** `surface_dim` (#131313)
2.  **Level 1 (Section):** `surface_container_low` (#1c1b1b)
3.  **Level 2 (Component):** `surface_container` (#201f1f)
4.  **Level 3 (Interactive):** `surface_container_high` (#2a2a2a)

### Ambient Shadows
For floating elements (Tooltips, Popovers), use "Ambient Shadows":
*   **Blur:** 40px - 60px.
*   **Color:** `surface_container_lowest` at 60% opacity.
*   **Offset:** 0px Y, 10px Y for a natural "lift."

### The "Ghost Border" Fallback
If contrast testing requires a boundary, use a **Ghost Border**: `outline_variant` (#414755) at **15% opacity**. This creates a microscopic "shimmer" on the edge of glass components without breaking the liquid aesthetic.

---

## 5. Components: Liquid Glass Primitives

### Futuristic Buttons
*   **Primary:** A gradient fill (`primary_container` to `primary`). 
    *   *Interaction:* On hover, the button should trigger an "Inner Glow" (Box-shadow: inset 0 0 12px rgba(255,255,255,0.2)).
*   **Secondary/Ghost:** `none` background, `outline_variant` (20% opacity) border. 
    *   *Interaction:* On hover, background shifts to `surface_container_highest` (#353534).

### Glass Cards (The Signature Component)
*   **Background:** `surface_variant` at 30% opacity.
*   **Blur:** 20px.
*   **Border-radius:** `xl` (1.5rem).
*   **Hover State:** Apply a radial gradient glow that follows the cursor, using a mix of `primary` and `secondary` at 5% opacity.

### Navigation & Lists
*   **Forbid Dividers:** Never use a horizontal line to separate list items. Use `spacing-3` (1rem) and a background color change on hover (`surface_container_low`).
*   **Active State:** Use a "Pill" indicator (Radius: `full`) with a `tertiary` (Green) glow for active tracking status.

### AI Insight Panel
*   **Style:** A full-bleed `surface_container_lowest` panel with a `secondary` to `primary` blurred mesh gradient (20% opacity) in the top-right corner to signify intelligence.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. For example, a heavy `display-lg` headline aligned left with a high-detail `glass-card` offset to the right.
*   **Do** use `spacing-16` (5.5rem) and `spacing-20` (7rem) for vertical section breathing room.
*   **Do** use the "AI Glow" gradient sparingly—only for features that provide automated value.

### Don't:
*   **Don't** use pure #000000. It kills the depth of the "Liquid Glass" effect. Use `surface_container_lowest` (#0e0e0e).
*   **Don't** use 100% opaque borders. They create "visual traps" that stop the user's eye from flowing across the dashboard.
*   **Don't** use standard "Drop Shadows." They feel dated. Always prefer "Tonal Layering."
*   **Don't** crowd the interface. If a screen feels full, increase the `spacing` scale rather than shrinking the components.