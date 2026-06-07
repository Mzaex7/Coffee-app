// Mock for react-native — provides Platform.OS for any transitive import
// during tests (the Supabase client itself is mocked per test file).
export const Platform = {
    OS: 'web' as string,
};
