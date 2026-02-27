from playwright.sync_api import sync_playwright, expect
import os

def test_api_key_toggle():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # Add init script to mock chrome.storage.local
        page.add_init_script("""
            window.chrome = {
                storage: {
                    local: {
                        get: (keys) => {
                            const settings = {
                                provider: 'openrouter',
                                apiKey: 'test-api-key',
                                apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
                                models: ['google/gemini-2.0-flash-lite-preview-02-05:free'],
                                selectedModel: 'google/gemini-2.0-flash-lite-preview-02-05:free',
                                maxTokens: 1000,
                                toastPosition: 'bottom-right',
                                toastDuration: 10000,
                                toastIndefinite: false,
                                promptMode: 'auto',
                                customPrompt: '',
                                discreteMode: false,
                                discreteModeOpacity: 0.85
                            };
                            return Promise.resolve({ settings });
                        },
                        set: () => Promise.resolve(),
                        onChanged: { addListener: () => {} }
                    }
                },
                runtime: {
                    sendMessage: () => Promise.resolve(),
                    getURL: (path) => path
                }
            };
        """)

        # Navigate to the served options.html
        page.goto("http://localhost:8000/options.html")

        # Wait for the script to load and execute
        toggle_btn = page.locator("#toggleApiKeyBtn")
        api_key_input = page.locator("#apiKey")

        # Verify button contains an SVG
        expect(toggle_btn.locator("svg")).to_be_visible(timeout=5000)

        print("Initial state:")
        print(f"Input type: {api_key_input.get_attribute('type')}")
        print(f"Button aria-label: {toggle_btn.get_attribute('aria-label')}")

        # Click toggle button
        toggle_btn.click()

        # Verify state changes to text
        expect(api_key_input).to_have_attribute("type", "text")
        expect(toggle_btn).to_have_attribute("aria-label", "Hide API Key")

        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/api_key_shown.png")

        # Click toggle button again
        toggle_btn.click()

        # Verify state changes back to password
        expect(api_key_input).to_have_attribute("type", "password")
        expect(toggle_btn).to_have_attribute("aria-label", "Show API Key")

        page.screenshot(path="verification/api_key_hidden.png")

        browser.close()

if __name__ == "__main__":
    test_api_key_toggle()
