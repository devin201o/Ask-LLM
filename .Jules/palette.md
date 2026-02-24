## 2025-02-23 - Testing Options Page with Playwright
**Learning:** Testing an extension's options page in Playwright requires mocking `window.chrome` before the page loads. Since `options.ts` executes immediately, `page.add_init_script` is essential to inject the mock early. Also, verifying the built output (`dist/`) via a local HTTP server is more reliable than `file://` or serving `src/` directly due to TypeScript modules.
**Action:** When verifying extension pages, always build the project, serve `dist/`, and use `page.add_init_script` to mock `chrome` APIs.
