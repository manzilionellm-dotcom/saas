// Single-upstream fan-out.
//
// The whole point of this module: no matter how many local endpoints/devices
// are pulling, we hold exactly ONE live connection to the authorized source and
// broadcast its bytes to every subscriber. This is what makes the feature
// "optimize resource usage" honestly — the provider sees one connection, not N.
//
// A Broadcaster is created lazily on the first client and torn down when the
// last client disconnects. Late joiners get the live tail (this is a live
// relay, not a DVR), which is the correct behaviour for simultaneous viewing.

type Subscriber = {
  id: number;
  enqueue: (chunk: Uint8Array) => void;
  close: () => void;
};

export class Broadcaster {
  readonly sourceUrl: string;
  private subs = new Map<number, Subscriber>();
  private nextSubId = 1;
  private abort: AbortController | null = null;
  private running = false;
  private onEmpty: () => void;
  private onError: (err: string) => void;

  constructor(sourceUrl: string, opts: { onEmpty: () => void; onError: (err: string) => void }) {
    this.sourceUrl = sourceUrl;
    this.onEmpty = opts.onEmpty;
    this.onError = opts.onError;
  }

  get subscriberCount(): number {
    return this.subs.size;
  }

  /** Returns a ReadableStream for one client, wired into the shared upstream. */
  subscribe(): ReadableStream<Uint8Array> {
    const id = this.nextSubId++;
    let sub: Subscriber;
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        sub = {
          id,
          enqueue: (chunk) => {
            try {
              controller.enqueue(chunk);
            } catch {
              this.unsubscribe(id);
            }
          },
          close: () => {
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          },
        };
        this.subs.set(id, sub);
        if (!this.running) this.startPump();
      },
      cancel: () => this.unsubscribe(id),
    });
    return stream;
  }

  private unsubscribe(id: number) {
    const sub = this.subs.get(id);
    if (!sub) return;
    this.subs.delete(id);
    if (this.subs.size === 0) this.stop();
  }

  private stop() {
    this.running = false;
    this.abort?.abort();
    this.abort = null;
    this.onEmpty();
  }

  /** Pulls from the single upstream connection and fans chunks out to all subs. */
  private async startPump() {
    this.running = true;
    this.abort = new AbortController();
    try {
      const res = await fetch(this.sourceUrl, {
        redirect: "follow",
        signal: this.abort.signal,
        headers: { "User-Agent": "restream-relay/1.0" },
      });
      if (!res.ok || !res.body) {
        throw new Error(`upstream HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      while (this.running) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          for (const sub of this.subs.values()) sub.enqueue(value);
        }
      }
      reader.cancel().catch(() => {});
    } catch (err) {
      if (!this.abort?.signal.aborted) {
        const message = err instanceof Error ? err.message : String(err);
        this.onError(message);
        for (const sub of this.subs.values()) sub.close();
        this.subs.clear();
      }
    } finally {
      this.running = false;
    }
  }
}
