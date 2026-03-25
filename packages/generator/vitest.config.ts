import { mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base.ts';

export default mergeConfig(baseConfig, {
	test: {
		coverage: {
			thresholds: { statements: 90, branches: 70, functions: 90, lines: 90 },
		},
	},
});
