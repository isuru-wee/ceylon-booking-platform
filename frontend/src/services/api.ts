import type { AuthResponse, ApiResponse, Listing, Booking } from '../types';

const API_BASE = '/api';

// Helper to get auth headers
const getHeaders = (token?: string | null): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Auth API
export const authApi = {
    signup: async (data: {
        email: string;
        password: string;
        fullName: string;
        userType: 'tourist' | 'host';
    }): Promise<AuthResponse> => {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return res.json();
    },
};

// Helper to map snake_case API response to camelCase
const mapListing = (item: any): Listing => ({
    id: item.id,
    hostId: item.host_id || item.hostId,
    title: item.title,
    description: item.description,
    inventoryType: item.inventory_type || item.inventoryType,
    location: item.location,
    localPrice: item.local_price ?? item.localPrice ?? 0,
    foreignPrice: item.foreign_price ?? item.foreignPrice ?? 0,
    capacity: item.capacity,
    createdAt: item.created_at || item.createdAt,
});

// Listings API
export const listingsApi = {
    getAll: async (filters?: { location?: string; inventoryType?: string }): Promise<ApiResponse<Listing[]>> => {
        const params = new URLSearchParams();
        if (filters?.location) params.set('location', filters.location);
        if (filters?.inventoryType) params.set('inventoryType', filters.inventoryType);

        const res = await fetch(`${API_BASE}/listings?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapListing),
            };
        }
        return json;
    },

    getById: async (id: string): Promise<ApiResponse<Listing>> => {
        const res = await fetch(`${API_BASE}/listings/${id}`);
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: mapListing(json.data),
            };
        }
        return json;
    },

    create: async (data: Partial<Listing>, token: string): Promise<ApiResponse<Listing>> => {
        const res = await fetch(`${API_BASE}/listings`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        return res.json();
    },
};

// Helper to map snake_case Booking to camelCase
const mapBooking = (item: any): Booking => ({
    id: item.id,
    listingId: item.listing_id || item.listingId,
    touristId: item.tourist_id || item.touristId,
    bookingDate: item.booking_date || item.bookingDate,
    timeSlot: item.time_slot || item.timeSlot,
    quantity: item.quantity,
    totalPrice: item.total_price ?? item.totalPrice ?? 0,
    currency: item.currency,
    status: item.status,
    createdAt: item.created_at || item.createdAt,
    listing: item.listing ? mapListing(item.listing) : undefined,
});

// Bookings API
export const bookingsApi = {
    checkAvailability: async (data: {
        listingId: string;
        bookingDate: string;
        timeSlot?: string;
        quantity: number;
    }): Promise<ApiResponse<{ available: boolean; remainingCapacity: number }>> => {
        const res = await fetch(`${API_BASE}/bookings/check-availability`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    create: async (
        data: {
            listingId: string;
            bookingDate: string;
            timeSlot?: string;
            quantity: number;
        },
        token: string
    ): Promise<ApiResponse<{ bookingId: string }>> => {
        const res = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    getById: async (id: string, token: string): Promise<ApiResponse<Booking>> => {
        const res = await fetch(`${API_BASE}/bookings/${id}`, {
            headers: getHeaders(token),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: mapBooking(json.data),
            };
        }
        return json;
    },

    getByTourist: async (touristId: string, token: string): Promise<ApiResponse<Booking[]>> => {
        const res = await fetch(`${API_BASE}/tourists/${touristId}/bookings`, {
            headers: getHeaders(token),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapBooking),
            };
        }
        return json;
    },

    getByListing: async (listingId: string, token: string): Promise<ApiResponse<Booking[]>> => {
        const res = await fetch(`${API_BASE}/listings/${listingId}/bookings`, {
            headers: getHeaders(token),
        });
        const json = await res.json();

        if (json.success && json.data) {
            return {
                success: true,
                data: json.data.map(mapBooking),
            };
        }
        return json;
    },
};
