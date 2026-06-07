/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: ['**/__tests__/test_*.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/', '__mocks__', 'helpers'],
    moduleNameMapper: {
        // Repositories no longer touch react-native directly (Supabase is mocked
        // per-test), but keep this stub so any transitive import stays harmless.
        '^react-native$': '<rootDir>/__tests__/__mocks__/react-native.ts',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: {
                module: 'commonjs',
                esModuleInterop: true,
                allowJs: true,
                strict: false,
            },
        }],
    },
};
