import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
	test: {
		coverage: {
			thresholds: { statements: 75, branches: 70, functions: 60, lines: 75 },
		},
	},
});
