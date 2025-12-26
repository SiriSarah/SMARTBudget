/**
 * Secure Storage Utility.
 * Provides encrypted storage access for sensitive data.
 */

import { encryptData, decryptData, hasSessionKey } from '../crypto/encryption.ts';

const ENCRYPTED_PREFIX = 'enc_v1:';

/**
 * Stores data in browser storage with encryption.
 */
export const setSecureItem = async <T>(key: string, value: T): Promise<boolean> => {
    if (!hasSessionKey()) {
        console.warn('Key unavailable');
        return false;
    }

    try {
        const encrypted = await encryptData(value);
        localStorage.setItem(key, ENCRYPTED_PREFIX + encrypted);
        return true;
        } catch (_err) {
            void _err;
            console.error('Storage failed');
            return false;
        }
};

/**
 * Retrieves and decrypts data from browser storage.
 */
export const getSecureItem = async <T>(key: string): Promise<T | null> => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    if (raw.startsWith(ENCRYPTED_PREFIX)) {
        if (!hasSessionKey()) {
            console.warn('Key unavailable');
            return null;
        }

        try {
            const encryptedData = raw.slice(ENCRYPTED_PREFIX.length);
            return await decryptData(encryptedData) as T;
        } catch (_err) {
            void _err;
            console.error('Retrieval failed');
            return null;
        }
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const removeSecureItem = (key: string): void => {
    localStorage.removeItem(key);
};
