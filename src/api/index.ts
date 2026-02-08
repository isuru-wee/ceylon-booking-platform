import 'dotenv/config';
import { Hono } from 'hono';
import { getSupabaseClient, getAuthenticatedClient } from '@/utils/supabase';
import { SchedulingService } from '@/services/SchedulingService';
import { ListingSchema } from '@/domain/Listing';
import { BookingSchema } from '@/domain/Booking';
import { PricingService } from '@/services/PricingService';
import { User } from '@/domain/User';
import { authMiddleware } from '@/middleware/auth';
import { Listing } from '@/domain/Listing';
import { authRouter } from '@/api/auth';

const app = new Hono();

// Get initialized services
const supabase = getSupabaseClient();
const schedulingService = new SchedulingService(supabase);
const pricingService = new PricingService();

// Health check endpoint
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Auth Routes
app.route('/api/auth', authRouter);

// ===== LISTINGS ENDPOINTS =====

// Create a new listing
app.post('/api/listings', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);

        // Validate the listing data
        const validatedData = ListingSchema.omit({ id: true, createdAt: true }).parse({
            ...body,
        });

        // Ensure hostId matches authenticated user (Security check)
        const user = c.get('user');
        if (validatedData.hostId !== user.id) {
            return c.json({ error: 'You can only create listings for yourself' }, 403);
        }

        const { data, error } = await authSupabase
            .from('listings')
            .insert({
                host_id: validatedData.hostId,
                title: validatedData.title,
                description: validatedData.description,
                inventory_type: validatedData.inventoryType,
                location: validatedData.location,
                local_price: validatedData.localPrice,
                foreign_price: validatedData.foreignPrice,
                capacity: validatedData.capacity,
            })
            .select()
            .single();

        if (error) {
            return c.json({ error: error.message }, 400);
        }

        return c.json({ success: true, data }, 201);
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Get all listings
app.get('/api/listings', async (c) => {
    const location = c.req.query('location');
    const inventoryType = c.req.query('inventoryType');

    let query = supabase.from('listings').select('*');

    if (location) {
        query = query.ilike('location', `%${location}%`);
    }

    if (inventoryType) {
        query = query.eq('inventory_type', inventoryType);
    }

    const { data, error } = await query;

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
});

// Get a single listing by ID
app.get('/api/listings/:id', async (c) => {
    const id = c.req.param('id');

    const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return c.json({ error: 'Listing not found' }, 404);
    }

    return c.json({ success: true, data });
});

// ===== BOOKINGS ENDPOINTS =====

// Check availability for a listing
app.post('/api/bookings/check-availability', async (c) => {
    try {
        const { listingId, bookingDate, timeSlot, quantity } = await c.req.json();

        const date = new Date(bookingDate);
        const result = await schedulingService.checkAvailability(
            listingId,
            date,
            timeSlot || null,
            quantity
        );

        return c.json({
            success: true,
            available: result.available,
            remainingCapacity: result.remainingCapacity,
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Create a new booking with dual pricing
// Create a new booking with dual pricing (Protected)
app.post('/api/bookings', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { listingId, bookingDate, quantity, timeSlot } = body;
        const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
        const authSupabase = getAuthenticatedClient(token);

        // Security: Get authenticated user ID
        const authContext = c.get('user');
        const touristId = authContext.id;

        // Use authenticated service
        const authSchedulingService = new SchedulingService(authSupabase);

        // 1. Fetch User (Tourist)
        const { data: user, error: userError } = await authSupabase
            .from('users')
            .select('*')
            .eq('id', touristId)
            .single();

        if (userError || !user) {
            return c.json({ error: 'Tourist not found' }, 404);
        }

        // 2. Fetch Listing
        const { data: listing, error: listingError } = await authSupabase
            .from('listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (listingError || !listing) {
            return c.json({ error: 'Listing not found' }, 404);
        }

        // 3. Calculate Price
        // Map DB fields (snake_case) to Domain model (camelCase)
        const domainListing: Listing = {
            ...listing,
            hostId: listing.host_id,
            inventoryType: listing.inventory_type,
            localPrice: listing.local_price,
            foreignPrice: listing.foreign_price,
            createdAt: new Date(listing.created_at),
        };

        const domainUser: User = {
            id: user.id,
            email: user.email,
            userType: user.user_type,
            fullName: user.full_name, // Map snake_case to camelCase
            country: user.country,
            createdAt: new Date(user.created_at),
        };

        const priceResult = pricingService.calculatePrice(
            domainListing,
            domainUser,
            quantity
        );

        // 4. Create Booking
        const result = await authSchedulingService.createBooking(
            listingId,
            touristId,
            new Date(bookingDate),
            quantity,
            priceResult.totalPrice, // Use calculated price
            priceResult.currency,   // Use calculated currency
            timeSlot || null
        );

        if (!result.success) {
            return c.json({ error: result.error }, 409);
        }

        return c.json({
            success: true,
            bookingId: result.bookingId,
            price: priceResult // Return pricing details
        }, 201);
    } catch (error: any) {
        return c.json({ error: error.message || 'Invalid request' }, 400);
    }
});

// Get a booking by ID
// Get a booking by ID (Protected)
app.get('/api/bookings/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const authSupabase = getAuthenticatedClient(token);

    const { data, error } = await authSupabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return c.json({ error: 'Booking not found' }, 404);
    }

    return c.json({ success: true, data });
});

// Get all bookings for a tourist
// Get all bookings for a tourist (Protected)
app.get('/api/tourists/:touristId/bookings', authMiddleware, async (c) => {
    const touristId = c.req.param('touristId');
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const authSupabase = getAuthenticatedClient(token);

    const { data, error } = await authSupabase
        .from('bookings')
        .select(`
      *,
      listing:listings(*)
    `)
        .eq('tourist_id', touristId)
        .order('created_at', { ascending: false });

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
});

// Get all bookings for a listing
// Get all bookings for a listing (Protected)
app.get('/api/listings/:listingId/bookings', authMiddleware, async (c) => {
    const listingId = c.req.param('listingId');
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const authSupabase = getAuthenticatedClient(token);

    const { data, error } = await authSupabase
        .from('bookings')
        .select('*')
        .eq('listing_id', listingId)
        .order('booking_date', { ascending: true });

    if (error) {
        return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
});

// Start the server
import { serve } from '@hono/node-server';

const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 CeylonBooking API starting on port ${port}...`);

serve({
    fetch: app.fetch,
    port
});

export { app };
