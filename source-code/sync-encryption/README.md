# Sync Encryption Format

This directory defines how data is prepared for cloud synchronization.

## Security Claims Proven
1.  **Encryption-Before-Upload**: Data is encrypted on the client using the master key before being sent to any remote endpoint.
2.  **Provider Agnostic Security**: The security of the data does not depend on the security of the storage provider (e.g., Google Drive, manual endpoint).
3.  **Integrity Checks**: The sync payload includes a structure that allows verifying integrity upon retrieval.

## Files
- `sync_format.ts`: Logic for pushing and pulling encrypted blobs to remote storage.
