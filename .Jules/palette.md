## 2024-05-23 - [API Key Visibility Toggle]
**Learning:** Users often need to verify complex inputs like API keys without resetting them. Adding a show/hide toggle inside the input field is a standard pattern that improves usability and reduces errors.
**Action:** When implementing password or API key fields, always consider adding a visibility toggle. Ensure it is accessible by using `aria-label` that updates dynamically (Show/Hide) and use semantic HTML (button type="button").
