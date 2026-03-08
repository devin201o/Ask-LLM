## 2024-05-15 - Add focus-visible states to custom toggle switches
**Learning:** Custom toggle switches implemented with visually hidden (`opacity: 0`) checkboxes require explicit `:focus-visible` styling on their adjacent visible elements (e.g., `input:focus-visible + .slider`) to maintain keyboard accessibility and comply with WCAG 2.4.7.
**Action:** When creating or modifying custom toggle components, always ensure that a `:focus-visible` state is defined to provide a clear visual indicator for keyboard users.
