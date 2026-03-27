Design a modern mobile bottom navigation bar for a SaaS app.

GOAL:
Create a floating, animated navbar that feels integrated with the app and highlights the active page.

---

LAYOUT:

- Bottom floating navbar
- Centered horizontally
- Width: ~90% of screen
- Height: 64–72px
- Border-radius: 999px (pill shape)

---

BACKGROUND:

- Glass effect:

background: rgba(10,10,15,0.75);
backdrop blur: 20px

- Border:

1px solid rgba(255,255,255,0.08)

- Soft shadow:

0 10px 30px rgba(0,0,0,0.4)

---

NAV ITEMS:

- 4–5 items:
  Dashboard / Study / Tasks / Analytics

- Default state:
  - icon only
  - low opacity (0.6–0.7)

---

ACTIVE ITEM (VERY IMPORTANT):

- Selected item becomes:
  → bigger (scale 1.15–1.25)
  → moves slightly upward (-6px to -10px)
  → gets soft purple background:

background: rgba(139,92,246,0.15)

- Icon becomes fully visible (opacity 1)

- Optional:
  show label (small text under or beside)

---

ANIMATION:

- Smooth transition between items
- Use:
  → scale
  → translateY
  → opacity

- Duration: 0.25s–0.35s

---

INTERACTION:

- Tap:
  → animate selection smoothly
  → previous item returns to normal

---

SPACING:

- Evenly spaced icons
- Enough padding so it doesn’t feel tight

---

FEEL:

- Floating
- Smooth
- Premium (iOS / Linear style)
- Integrated with dark UI

---

IMPORTANT:

- No hard edges
- No heavy colors
- Keep everything soft and minimal