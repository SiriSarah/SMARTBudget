# Cryptography Layer

This directory contains the core encryption and key derivation logic for SMART Budget.

## Security Claims Proven
1.  **AES-256-GCM**: All data is encrypted using authenticated encryption with 256-bit keys.
2.  **PBKDF2**: Keys are derived from user passwords using 100,000 iterations of PBKDF2 with SHA-256.
3.  **Client-Side Only**: Keys are generated and stored only in the browser's memory or secure local storage (encrypted).
4.  **Unique IVs**: Every encryption operation uses a unique initialization vector (IV) generated from a random salt and a monotonic counter.

## Files
- `encryption.ts`: Low-level Web Crypto API wrappers.
- `cryptoService.ts`: High-level service for wrapping/unwrapping keys.
