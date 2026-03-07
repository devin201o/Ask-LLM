
## 2025-03-07 - Custom Toggle Focus Rings
**Learning:** Custom toggle switches using visually hidden (`opacity: 0`) checkboxes lose default browser focus indicators, breaking keyboard accessibility (WCAG 2.4.7). The hidden input receives focus, but since it's transparent, nothing is shown to the user.
**Action:** Always add an adjacent sibling selector (e.g., `input:focus-visible + .slider`) to apply an explicit focus ring (`outline: 2px solid`) to the visible part of the custom control when the hidden input is focused via keyboard.
