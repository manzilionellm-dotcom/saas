import { randomUUID } from "node:crypto";
import { isSimultaneousLoginDetectionEnabled } from "@/lib/config";
import { store, type StreamConnection } from "@/lib/store";

/**
 * Registers an active stream (playback) connection.
 *
 * Concurrent-connection detection is DISABLED by default: any number of
 * devices/sessions for the same user can stream at the same time, and opening
 * a new stream never blocks, warns about, or closes existing ones. Only when
 * SIMULTANEOUS_LOGIN_DETECTION_ENABLED=true does opening a new stream close
 * the user's other active connections (single-connection enforcement).
 */
export function openStreamConnection(
  userId: string,
  sessionId: string,
  channelId: string
): StreamConnection {
  if (isSimultaneousLoginDetectionEnabled()) {
    closeUserConnections(userId);
  }

  const connection: StreamConnection = {
    id: randomUUID(),
    userId,
    sessionId,
    channelId,
    startedAt: Date.now(),
  };
  store.streamConnectionsById.set(connection.id, connection);
  return connection;
}

export function closeStreamConnection(connectionId: string): void {
  store.streamConnectionsById.delete(connectionId);
}

export function closeUserConnections(userId: string): void {
  for (const connection of store.streamConnectionsById.values()) {
    if (connection.userId === userId) {
      store.streamConnectionsById.delete(connection.id);
    }
  }
}

export function listUserConnections(userId: string): StreamConnection[] {
  return [...store.streamConnectionsById.values()]
    .filter((connection) => connection.userId === userId)
    .sort((a, b) => a.startedAt - b.startedAt);
}
