import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
	test: {
		coverage: {
			thresholds: { statements: 50, branches: 30, functions: 50, lines: 50 },
		},
	},
});
