// API Types matching backend

export interface User {
    id: string;
    email: string;
    fullName: string;
    userType: 'tourist' | 'host';
    country?: string;
    createdAt: string;
}

export interface Listing {
    id: string;
    hostId: string;
    title: string;
    description?: string;
    inventoryType: 'slot' | 'date';
    location: string;
    localPrice: number;
    foreignPrice: number;
    capacity: number;
    createdAt: string;
}

export interface Booking {
    id: string;
    listingId: string;
    touristId: string;
    bookingDate: string;
    timeSlot?: string;
    quantity: number;
    totalPrice: number;
    currency: 'LKR' | 'USD';
    status: 'pending' | 'confirmed' | 'cancelled';
    createdAt: string;
    listing?: Listing;
}

export interface AuthResponse {
    success: boolean;
    data?: {
        user: {
            id: string;
            email: string;
        };
        session: {
            access_token: string;
            refresh_token: string;
        };
    };
    error?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
