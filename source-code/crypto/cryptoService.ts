import { deriveKey, encryptData, decryptData, generateSalt, exportKeyToSession, importKeyFromSession } from './encryption.ts';
import { deriveKeyFromPhrase as deriveKeyFromRecoveryPhrase } from '../key-management/mnemonic.ts';

export const derivePasswordKey = (password: string, salt: string) => {
  return deriveKey(password, salt);
};

export const deriveRecoveryKey = (phrase: string, salt: string) => {
  return deriveKeyFromRecoveryPhrase(phrase, salt);
};

export const generateUserSalt = () => generateSalt();

export const wrapKeyWithPhrase = async (key: CryptoKey, phraseKey: CryptoKey) => {
  const serializedKey = await exportKeyToSession(key);
  return encryptData(serializedKey, phraseKey);
};

export const unwrapKeyWithPhrase = async (wrappedKey: string, phraseKey: CryptoKey) => {
  const serializedKey = await decryptData(wrappedKey, phraseKey);
  if (!serializedKey || typeof serializedKey !== 'string') {
    return null;
  }
  return importKeyFromSession(serializedKey);
};
