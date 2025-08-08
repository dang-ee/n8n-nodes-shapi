module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/nodes', '<rootDir>/test'],
	testMatch: [
		'**/__tests__/**/*.ts',
		'**/?(*.)+(spec|test).ts'
	],
	transform: {
		'^.+\\.ts$': 'ts-jest'
	},
	collectCoverageFrom: [
		'nodes/**/*.ts',
		'!nodes/**/*.node.ts',
		'!**/node_modules/**'
	],
	setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/nodes/$1'
	},
	globals: {
		'ts-jest': {
			tsconfig: {
				strict: false,
				skipLibCheck: true
			}
		}
	}
};