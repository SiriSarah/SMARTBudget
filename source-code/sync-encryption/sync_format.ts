import { SyncConfig, SyncManifest } from '../types.ts';

export class SyncConflictError extends Error {
  remoteManifest: SyncManifest;

  constructor(message: string, remoteManifest: SyncManifest) {
    super(message);
    this.name = 'SyncConflictError';
    this.remoteManifest = remoteManifest;
  }
}

const ensureResponse = (
  response: Response | null | undefined,
  stage: 'PUT' | 'POST' | 'GET'
): Response => {
  if (!response) {
    throw new Error(`Sync Failed: No response received for ${stage}`);
  }
  return response;
};

interface SyncPayload {
  data: string;
  timestamp: number;
  version: string;
}

export const RemoteStorage = {
  /**
   * Upload encrypted data to the configured endpoint
   */
  async push(data: string, config: SyncConfig): Promise<void> {
    if (!config.endpointUrl) throw new Error("No endpoint URL configured");
    if (!config.apiKey) throw new Error("Sync Failed: Missing API Key");

    const payload: SyncPayload = {
      data,
      timestamp: Date.now(),
      version: '1.0'
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.apiKey) {
        const headerMatch = config.apiKey.match(/^([A-Za-z0-9-]+)\s*:\s*(.+)$/);
        if (headerMatch) {
          headers[headerMatch[1]] = headerMatch[2];
        } else {
          const auth = config.apiKey.startsWith('Bearer ') ? config.apiKey : `Bearer ${config.apiKey}`;
          headers['Authorization'] = auth;
        }
      }

      const response = ensureResponse(
        await fetch(config.endpointUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        }),
        'PUT'
      );

      if (!response.ok) {
        // Fallback for providers that prefer POST
        const postResponse = ensureResponse(
          await fetch(config.endpointUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          }),
          'POST'
        );

        if (!postResponse.ok) {
          throw new Error(`Sync Failed: ${postResponse.statusText || 'Unknown error'}`);
        }
      }
    } catch (e) {
      console.error('Push failed');
      throw e;
    }
  },

  /**
   * Download encrypted data from the configured endpoint
   */
  async pull(config: SyncConfig): Promise<SyncPayload | null> {
    if (!config.endpointUrl) throw new Error("No endpoint URL configured");
    if (!config.apiKey) throw new Error("Sync Failed: Missing API Key");

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.apiKey) {
        const headerMatch = config.apiKey.match(/^([A-Za-z0-9-]+)\s*:\s*(.+)$/);
        if (headerMatch) {
          headers[headerMatch[1]] = headerMatch[2];
        } else {
          const auth = config.apiKey.startsWith('Bearer ') ? config.apiKey : `Bearer ${config.apiKey}`;
          headers['Authorization'] = auth;
        }
      }

      const response = ensureResponse(
        await fetch(config.endpointUrl, {
          method: 'GET',
          headers
        }),
        'GET'
      );

      if (!response.ok) throw new Error(`Sync Failed: ${response.statusText}`);

      const json = await response.json();
      const payload = json.record || json;

      if (payload && typeof payload.data === 'string' && typeof payload.timestamp === 'number') {
        return payload as SyncPayload;
      }

      return null;
    } catch (e) {
      console.error('Pull failed');
      throw e;
    }
  }
};
