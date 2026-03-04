export interface User {
    id?: number;
    username: string;
    passwordHash: string;
    createdAt: string; // ISO 8601
}
