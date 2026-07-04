/**
 * Public surface of the security layer.
 *
 * Keep imports here to the pieces meant to be consumed from application/config
 * code. Server- and client-only internals are imported directly from their
 * submodules by the thin root integration files.
 */

export { securityConfig, SECURITY_COOKIE } from "./config";
export type { ReactionMode, CspMode } from "./config";
export {
  securityHeaders,
  buildStaticCsp,
  type HeaderEntry,
} from "./server/security-headers";
export { handleSecurity } from "./server/proxy-handler";
