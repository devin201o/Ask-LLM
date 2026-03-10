## 2024-05-18 - Password Field Toggles and Custom Checkboxes
**Learning:** For interactive toggle buttons (like password visibility), `aria-label` must dynamically update based on state. Additionally, custom toggle switches that visually hide checkboxes require explicit `:focus-visible` styling on the visible elements to maintain keyboard accessibility.
**Action:** When creating toggle buttons or custom checkboxes, ensure dynamic ARIA labels and explicit focus styles are applied for a11y compliance.
