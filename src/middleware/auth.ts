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
    console.log('Auth check token:', token.substring(0, 10) + '...');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
        console.error('Auth verify error:', error);
        return c.json({ error: 'Unauthorized: ' + error.message }, 401);
    }

    if (!user) {
        console.warn('Auth verify: User not found for token');
        return c.json({ error: 'Unauthorized: User not found' }, 401);
    }

    console.log('Auth success for user:', user.id);

    // Attach user to context
    c.set('user', {
        id: user.id,
        email: user.email,
    });

    await next();
};
