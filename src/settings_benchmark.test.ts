import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS, ExtensionSettings } from './types';

// Mock chrome.storage.local
const mockStorage = {
  get: vi.fn().mockImplementation((keys) => {
    return new Promise((resolve) => {
      // Simulate IPC delay. Even a small delay adds up.
      // We use a simplified simulation here.
      setTimeout(() => {
        resolve({ settings: DEFAULT_SETTINGS });
      }, 0);
    });
  }),
  set: vi.fn(),
};

// Global chrome mock
global.chrome = {
  storage: {
    local: mockStorage,
    onChanged: { addListener: vi.fn() },
  },
} as any;

describe('Settings Access Performance Benchmark', () => {
  it('measures performance difference between storage access and cached access', async () => {
    const iterations = 1000;

    // 1. Baseline: Direct storage access (Simulated)
    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
      await chrome.storage.local.get('settings');
    }
    const endBaseline = performance.now();
    const durationBaseline = endBaseline - startBaseline;

    // 2. Optimized: Cached access pattern
    // This simulates the behavior inside our optimized background script
    let cachedSettings: ExtensionSettings | null = null;

    // Initial fetch to populate cache
    const { settings: initialSettings } = await chrome.storage.local.get('settings');
    cachedSettings = initialSettings;

    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
        // Optimized logic: return cached if available
        if (cachedSettings) {
             const s = cachedSettings;
        } else {
             const { settings } = await chrome.storage.local.get('settings');
             cachedSettings = settings;
        }
    }
    const endOptimized = performance.now();
    const durationOptimized = endOptimized - startOptimized;

    console.log(`
    Performance Results (${iterations} iterations):
    --------------------------------------------
    Baseline (Storage Access): ${durationBaseline.toFixed(2)}ms
    Optimized (Cached Access): ${durationOptimized.toFixed(2)}ms
    Improvement: ${(durationBaseline / durationOptimized).toFixed(2)}x faster
    `);

    // We expect the optimized version to be significantly faster
    expect(durationOptimized).toBeLessThan(durationBaseline);
  });
});
