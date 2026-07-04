# Restream

Distribute **your own authorized** M3U/M3U8 source to multiple devices in your
household. Each device gets its own independent local endpoint URL, but every
endpoint is served from a **single upstream connection** to your source.

## Design decision: single upstream, many local endpoints

The feature request originally described "10–20 independent restreams from one
source." Implemented literally as *10–20 separate connections to the provider*,
that is the pattern used to exceed an IPTV/subscription's concurrent-connection
limit — and it contradicts the "optimize resource usage" requirement.

This implementation does the opposite and safer thing that still satisfies the
stated goal (household devices watching independently):

- **One** authorized connection is opened to your source (`broadcaster.ts`).
- Its bytes are fanned out to every connected device.
- Generating/refreshing endpoints only creates more **local** URLs — it never
  opens additional connections to your provider, so provider limits are
  respected and resource usage stays flat regardless of device count.

Verified: 4 simultaneous relay clients caused exactly **1** new upstream
connection.

## Authorization

- No stream URLs are bundled anywhere. The user must supply their own source.
- Creation requires an explicit authorization attestation (`authorized: true`);
  the API returns `403` otherwise.
- The source is validated to actually be an M3U playlist before use, and
  loopback/metadata hosts are refused (basic SSRF guard).

## Components

| File | Responsibility |
| --- | --- |
| `types.ts` | Shared types. |
| `source.ts` | M3U validation, SSRF guard, reachability probe. |
| `broadcaster.ts` | One upstream connection fanned out to N clients. |
| `manager.ts` | Session/endpoint lifecycle, health loop, auto-regeneration, logging. |

API routes live in `app/api/restream/*`; the UI is `app/restream/page.tsx`.

## Endpoint lifecycle

`starting → online` once the upstream probes healthy. On failure an endpoint
goes `error`; after 3 consecutive failed checks it is removed and a replacement
is generated so the household keeps a stable count of usable URLs. Recovery
returns endpoints to `online`.

## Deployment note

The relay needs a **long-running Node server** (`next start`) — one shared
upstream connection plus a background health loop. Per-request serverless/edge
deployment will not hold the shared connection. Routes are pinned to the
`nodejs` runtime.

Set `RESTREAM_ALLOW_LOCAL=1` only for local testing against a loopback source.
