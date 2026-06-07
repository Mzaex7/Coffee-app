// Cloud auth identity (Supabase). The id is the auth.users uuid.
export interface User {
    id: string;
    email?: string;
    username?: string;
    createdAt?: string; // ISO 8601
}
