/**
 * Web Crypto API implementation for AES-GCM encryption.
 * Provides secure encryption/decryption utilities.
 */

let _sessionKey: CryptoKey | null = null;
const KEY_STORAGE_ABBR = 'enc_k';

/**
 * Generates a cryptographically secure random salt.
 */
export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Derives an AES-GCM key from a password and salt using PBKDF2.
 */
export const deriveKey = async (password: string, salt: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const saltBuffer = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

const IV_COUNTER_KEY = 'app_iv_counter';
let globalIVCounter = (() => {
  try {
    const stored = sessionStorage.getItem(IV_COUNTER_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? Date.now() : parsed;
    }
  } catch (_err) {
    void _err;
  }
  return Date.now();
})();
const usedIVs = new Set<string>();

const persistIVCounter = () => {
  try {
    sessionStorage.setItem(IV_COUNTER_KEY, globalIVCounter.toString());
  } catch (_err) {
    void _err;
  }
};

/**
 * Generates a unique 12-byte IV using a monotonic counter and random salt.
 */
const generateUniqueIV = (): Uint8Array => {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    const iv = new Uint8Array(12);
    const salt = window.crypto.getRandomValues(new Uint8Array(8));
    iv.set(salt, 0);

    const view = new DataView(iv.buffer);
    view.setUint32(8, globalIVCounter % 0xFFFFFFFF, false);

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

    if (usedIVs.has(ivHex)) {
      globalIVCounter++;
      persistIVCounter();
      retries++;
      continue;
    }

    usedIVs.add(ivHex);
    globalIVCounter++;
    persistIVCounter();
    return iv;
  }
  throw new Error("Unable to generate unique IV");
};

export const setSessionKey = (key: CryptoKey): void => {
  _sessionKey = key;
};

export const clearSessionKey = (): void => {
  _sessionKey = null;
};

export const hasSessionKey = (): boolean => {
  return _sessionKey !== null;
};

export const getSessionKey = (): CryptoKey | null => {
  return _sessionKey;
};

/**
 * Encrypts data using AES-GCM.
 */
export const encryptData = async (data: unknown, key?: CryptoKey): Promise<string> => {
  const keyToUse = key || _sessionKey;
  if (!keyToUse) throw new Error("Key unavailable");

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(JSON.stringify(data));
  const iv = generateUniqueIV();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    keyToUse,
    encodedData
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);

  let binary = '';
  const bytes = new Uint8Array(combined);
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

/**
 * Decrypts data using AES-GCM.
 */
export const decryptData = async (base64Data: string, key?: CryptoKey): Promise<any> => {
  const keyToUse = key || _sessionKey;
  if (!keyToUse) throw new Error("Key unavailable");

  try {
    const combined = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as any },
      keyToUse as CryptoKey,
      ciphertext as any
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedBuffer));
  } catch (_err) {
    void _err;
    console.error('Decryption failed');
    throw new Error("Invalid key or corrupted data");
  }
};

const encodeBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decodeBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

export const exportKeyToSession = async (key: CryptoKey): Promise<string> => {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return encodeBase64(raw);
};

export const importKeyFromSession = async (serialized: string): Promise<CryptoKey> => {
  const rawBytes = decodeBase64(serialized);
  return window.crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

export const persistSessionKey = async (key: CryptoKey, permanent: boolean): Promise<void> => {
  try {
    const exported = await exportKeyToSession(key);
    if (permanent) {
      sessionStorage.removeItem(KEY_STORAGE_ABBR);
      localStorage.setItem(KEY_STORAGE_ABBR, exported);
    } else {
      localStorage.removeItem(KEY_STORAGE_ABBR);
      sessionStorage.setItem(KEY_STORAGE_ABBR, exported);
    }
  } catch (_err) {
    void _err;
    console.error('Persistence failed');
  }
};

export const restoreSessionKey = async (): Promise<boolean> => {
  try {
    let stored = sessionStorage.getItem(KEY_STORAGE_ABBR);
    if (!stored) {
      stored = localStorage.getItem(KEY_STORAGE_ABBR);
    }
    if (!stored) return false;

    const key = await importKeyFromSession(stored);
    setSessionKey(key);
    return true;
  } catch (_err) {
    void _err;
    sessionStorage.removeItem(KEY_STORAGE_ABBR);
    return false;
  }
};

export const clearPersistedSessionKey = (): void => {
  sessionStorage.removeItem(KEY_STORAGE_ABBR);
  localStorage.removeItem(KEY_STORAGE_ABBR);
};
