## 2025-10-27 - [Reusable Password Toggle Pattern]
**Learning:** In options pages where icon libraries are unavailable, inline SVGs in a `.input-wrapper` provide a lightweight, accessible solution for password visibility toggles.
**Action:** When adding sensitive inputs, wrap them in `.input-wrapper` with `position: relative`, add `padding-right: 40px` to the input, and use an absolute positioned button with dynamic `aria-label` and inline SVG.
