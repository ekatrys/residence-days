import { getDB } from './db';
import type { NewTrip, Trip } from '../models/trip';

/** Persistence layer for trips, backed by IndexedDB. */
export const tripRepository = {
  async fetchAll(): Promise<Trip[]> {
    const db = await getDB();
    const trips = await db.getAllFromIndex('trips', 'departureDate');
    return trips.reverse(); // descending by departure date
  },

  async add(trip: NewTrip): Promise<Trip> {
    const db = await getDB();
    const full: Trip = {
      ...trip,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.add('trips', full);
    return full;
  },

  async update(trip: Trip): Promise<void> {
    const db = await getDB();
    await db.put('trips', trip);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('trips', id);
  },

  /** Bulk insert, used by CSV import. */
  async addMany(trips: NewTrip[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('trips', 'readwrite');
    const now = new Date().toISOString();
    await Promise.all([
      ...trips.map((trip) => tx.store.add({ ...trip, id: crypto.randomUUID(), createdAt: now })),
      tx.done,
    ]);
  },
};
