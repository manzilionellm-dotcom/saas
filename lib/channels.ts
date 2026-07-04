import { randomUUID } from "node:crypto";
import { store, type Channel } from "@/lib/store";

const HTTP_URL_PATTERN = /^https?:\/\/.+/i;

export interface ChannelInput {
  name: string;
  url: string;
  group?: string | null;
  logo?: string | null;
}

export function validateChannelInput(body: Record<string, unknown>): string | null {
  if (typeof body.name !== "string" || body.name.trim() === "") {
    return "A channel name is required.";
  }
  if (typeof body.url !== "string" || !HTTP_URL_PATTERN.test(body.url.trim())) {
    return "A valid http(s) channel URL is required.";
  }
  if (body.group !== undefined && body.group !== null && typeof body.group !== "string") {
    return "group must be a string.";
  }
  if (body.logo !== undefined && body.logo !== null && typeof body.logo !== "string") {
    return "logo must be a string.";
  }
  return null;
}

export function addChannel(userId: string, input: ChannelInput): Channel {
  const channel: Channel = {
    id: randomUUID(),
    userId,
    name: input.name.trim(),
    url: input.url.trim(),
    group: input.group?.trim() || null,
    logo: input.logo?.trim() || null,
    createdAt: Date.now(),
  };
  store.channelsById.set(channel.id, channel);
  return channel;
}

export function listChannels(userId: string): Channel[] {
  return [...store.channelsById.values()]
    .filter((channel) => channel.userId === userId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function getChannel(userId: string, channelId: string): Channel | null {
  const channel = store.channelsById.get(channelId);
  if (!channel || channel.userId !== userId) {
    return null;
  }
  return channel;
}

export function deleteChannel(userId: string, channelId: string): boolean {
  const channel = store.channelsById.get(channelId);
  if (!channel || channel.userId !== userId) {
    return false;
  }
  return store.channelsById.delete(channelId);
}

/**
 * Builds an M3U (EXTM3U) playlist for the user's channels.
 *
 * Each entry points at `{baseUrl}/api/stream/{channelId}`, so playback goes
 * through the authenticated stream endpoint rather than exposing source URLs
 * directly in the playlist.
 */
export function buildM3U(userId: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const lines = ["#EXTM3U"];
  for (const channel of listChannels(userId)) {
    const attrs: string[] = [];
    if (channel.logo) {
      attrs.push(`tvg-logo="${channel.logo}"`);
    }
    if (channel.group) {
      attrs.push(`group-title="${channel.group}"`);
    }
    const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
    lines.push(`#EXTINF:-1${attrString},${channel.name}`);
    lines.push(`${base}/api/stream/${channel.id}`);
  }
  return `${lines.join("\n")}\n`;
}
