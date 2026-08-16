import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Trip } from '../models/trip';

interface ResidenceDaysDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
    indexes: { departureDate: string };
  };
}

const DB_NAME = 'residence-days';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ResidenceDaysDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ResidenceDaysDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ResidenceDaysDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('trips', { keyPath: 'id' });
        store.createIndex('departureDate', 'departureDate');
      },
    });
  }
  return dbPromise;
}
