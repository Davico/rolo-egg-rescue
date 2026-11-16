import { defineConfig } from 'vite';

// Relative base so the same build runs on portals, GitHub Pages and inside a Capacitor shell.
export default defineConfig({ base: './', build: { target: 'es2020', assetsInlineLimit: 0 } });
