import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english';

/**
 * Generate a 12-word BIP39 mnemonic recovery phrase.
 */
export const generateRecoveryPhrase = (): string => {
    return generateMnemonic(englishWordlist, 128); // 128 bits = 12 words
};

/**
 * Validate a recovery phrase.
 */
export const validateRecoveryPhrase = (phrase: string): boolean => {
    return validateMnemonic(phrase, englishWordlist);
};

/**
 * Derive an encryption key from a recovery phrase using PBKDF2.
 */
export const deriveKeyFromPhrase = async (
    phrase: string,
    salt: string
): Promise<CryptoKey> => {
    if (!validateMnemonic(phrase, englishWordlist)) {
        throw new Error('Invalid phrase');
    }

    const seed = mnemonicToSeedSync(phrase);
    const seedArray = new Uint8Array(seed);

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        seedArray,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const saltBuffer = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * Create a verification hash for a recovery phrase.
 */
export const hashRecoveryPhrase = async (phrase: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(phrase);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const phraseToWords = (phrase: string): string[] => {
    return phrase.trim().toLowerCase().split(/\s+/);
};

export const wordsToPhrase = (words: string[]): string => {
    return words.join(' ');
};

/**
 * Get indices of words to verify.
 */
export const getVerificationIndices = (): number[] => {
    const indices: number[] = [];
    while (indices.length < 3) {
        const random = Math.floor(Math.random() * 12);
        if (!indices.includes(random)) {
            indices.push(random);
        }
    }
    return indices.sort((a, b) => a - b);
};
