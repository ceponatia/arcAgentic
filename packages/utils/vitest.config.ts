import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
	test: {
		coverage: {
			thresholds: { statements: 45, branches: 30, functions: 55, lines: 50 },
		},
	},
});
