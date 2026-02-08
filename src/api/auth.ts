import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabaseClient } from '@/utils/supabase';

const auth = new Hono();

// Validation Schemas
const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  userType: z.enum(['tourist', 'host']),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register a new user
auth.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, fullName, userType } = SignupSchema.parse(body);
    const supabase = getSupabaseClient();

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_type: userType,
        },
      },
    });

    if (authError) {
      return c.json({ error: authError.message }, 400);
    }

    if (!authData.user) {
      return c.json({ error: 'User creation failed' }, 500);
    }

    // 2. Create entry in public.users table
    // Note: Ideally this should be handled by a Supabase Trigger for reliability.
    // If we do it here, we rely on the client having permission or using a service role.
    // We try to insert using the anon client.
    
    // Check if user already exists in public.users (idempotency)
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single();
    
    if (!existingUser) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            user_type: userType,
          });

        if (profileError) {
          // If profile creation fails, we might want to warn or retry,
          // but strictly speaking, the auth user exists now.
          console.error('Failed to create user profile:', profileError);
          return c.json({ 
              success: true, 
              message: 'User registered but profile creation failed. Please contact support.',
              data: authData 
          }, 201); 
        }
    }

    return c.json({ success: true, data: authData }, 201);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Login user
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = LoginSchema.parse(body);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    return c.json({ success: true, data });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export { auth as authRouter };
