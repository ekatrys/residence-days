export type TripType = 'personal' | 'business';

export const TRIP_TYPES: TripType[] = ['personal', 'business'];

export const tripTypeIcon: Record<TripType, string> = {
  personal: '🏖️',
  business: '💼',
};

export const tripTypeTitle: Record<TripType, string> = {
  personal: 'Personal',
  business: 'Business',
};

/**
 * Dates are stored as 'YYYY-MM-DD' strings (matches <input type="date">),
 * not Date objects — avoids timezone-shift bugs in serialization and keeps
 * IndexedDB records plain JSON.
 */
export interface Trip {
  id: string;
  destination: string; // ISO-3166 alpha-2 country code, '' if unset
  departureDate: string; // 'YYYY-MM-DD'
  returnDate: string | null; // null = still abroad
  tripType: TripType;
  note?: string;
  createdAt: string; // ISO timestamp
}

export type NewTrip = Omit<Trip, 'id' | 'createdAt'>;
