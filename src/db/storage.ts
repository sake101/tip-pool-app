import { get, set, del } from 'idb-keyval';
import type { PayPeriod } from '../types';

const STORE_PREFIX = 'pay_period_';

export const savePayPeriod = async (payPeriod: PayPeriod): Promise<void> => {
    await set(`${STORE_PREFIX}${payPeriod.id}`, payPeriod);
};

export const getPayPeriods = async (): Promise<PayPeriod[]> => {
    // const allValues = await values();
    // Filter only our pay periods in case other stuff is in there (unlikely with this lib default store, but safety first)
    // Actually idb-keyval uses a default 'keyval-store'. 
    // We should rely on our prefix if we want to be safe, but 'values' returns all values.
    // Helper to filter:
    // Since 'values()' returns content, we can't easily filter by key prefix unless we use 'entries()'.
    // Let's use entries.

    // Wait, idb-keyval 'entries' is what we want.
    const importEntries = await import('idb-keyval').then(m => m.entries);
    const allEntries = await importEntries();

    return allEntries
        .filter(([key]) => String(key).startsWith(STORE_PREFIX))
        .map(([, val]) => val as PayPeriod)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)); // Newest first
};

export const getPayPeriod = async (id: string): Promise<PayPeriod | undefined> => {
    return await get<PayPeriod>(`${STORE_PREFIX}${id}`);
};

export const deletePayPeriod = async (id: string): Promise<void> => {
    await del(`${STORE_PREFIX}${id}`);
};
