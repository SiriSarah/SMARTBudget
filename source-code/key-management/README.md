# Key Management

This directory contains logic for recovery phrases and secure local storage.

## Security Claims Proven
1.  **BIP39 Standard**: Recovery phrases are generated following the industry-standard BIP39 mnemonic format.
2.  **Encrypted Browser Storage**: Sensitive configuration and session data are always encrypted before being stored.
3.  **Zero-Knowledge Recovery**: The recovery phrase can derive the master encryption key without server-side interaction.

## Files
- `mnemonic.ts`: BIP39 generation and validation logic.
- `secureStorage.ts`: Encrypted wrapper for browser storage APIs.
