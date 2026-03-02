
## 2025-03-02 - Dynamic ARIA labels on Toggle Buttons
**Learning:** For interactive toggle buttons like password visibility switchers, static `aria-label` attributes aren't sufficient. A screen reader needs to know the *current actionable state* (e.g., if the key is hidden, the button should say "Show API Key"; if visible, "Hide API Key").
**Action:** When creating toggle buttons, add event listeners that dynamically update the `aria-label` and `title` attributes to reflect the immediate action the button will perform, ensuring accurate context for assistive technologies.
