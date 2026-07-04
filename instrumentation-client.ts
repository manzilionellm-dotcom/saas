import { startClientGuard } from "@/security/client/guard";

// Anti-tamper / anti-debug / sandbox detection lives in the isolated
// `security/client` module and boots before the app becomes interactive.
startClientGuard();
