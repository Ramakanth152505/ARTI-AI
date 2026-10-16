import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Dedicated Vitest configuration.
 *
 * Kept separate from `vite.config.ts` so the SvelteKit plugin (which expects an
 * adapter and a full app build) does not run for the pure-logic unit tests. The
 * `#lib` alias mirrors the one in `tsconfig.json` and `package.json` so test
 * imports resolve exactly as application imports do.
 */
export default defineConfig({
	resolve: {
		alias: {
			'#lib': fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	// The application tsconfig extends SvelteKit's generated `$app/tsconfig`, which
	// only resolves inside a full SvelteKit build. Supplying `tsconfigRaw` keeps
	// esbuild's TypeScript transform independent of it, so pure-logic tests run
	// without the SvelteKit plugin or adapter.
	esbuild: { tsconfigRaw: '{}' },
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
