import { Context, Next } from 'hono';
import { getSupabaseClient } from '@/utils/supabase';

// Define the type for the user object in context
export type AuthUser = {
    id: string;
    email?: string;
};

// Extend Hono Context to include user
declare module 'hono' {
    interface ContextVariableMap {
        user: AuthUser;
    }
}

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
        return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient();

    // Verify token using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Attach user to context
    c.set('user', {
        id: user.id,
        email: user.email,
    });

    await next();
};
