import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
  globals: true,            // Enable global test functions like describe, it, expect
    environment: "jsdom",      // Use jsdom for DOM-related tests
    setupFiles: "./src/setupTests.ts", // Optional: Path to a setup file if needed
    typecheck: {
      tsconfig: "./tsconfig.test.json", // Specify the test-specific tsconfig
    },
  },
}));
