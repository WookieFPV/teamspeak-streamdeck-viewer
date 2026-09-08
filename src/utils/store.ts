/**
 * A tiny async cache that replaces the previous `@tanstack/query-core`
 * `QueryClient` usage. Each cached value is fetched explicitly through
 * `fetch()` with a stale-while-fresh window, and dropped explicitly through
 * `invalidate()` — no hidden fetch semantics, no global service locator, and
 * trivial to unit test (see `store.test.ts`).
 */
export class Store<T> {
  private data: T | undefined;
  private lastSetAt = 0;
  private inFlight: Promise<T> | undefined;

  /** the last successfully fetched (or `set`) value, if any */
  get(): T | undefined {
    return this.data;
  }

  /** overwrite the cached value (counts as fresh, like `setQueryData` did) */
  set(value: T | ((old: T | undefined) => T)): void {
    this.data =
      typeof value === "function"
        ? (value as (old: T | undefined) => T)(this.data)
        : value;
    this.lastSetAt = Date.now();
  }

  /** drop the cached value so the next `fetch()` goes to the source */
  invalidate(): void {
    this.data = undefined;
    this.lastSetAt = 0;
  }

  /**
   * Return the cached value if it is fresher than `staleMs`, otherwise run
   * `fn`, cache its result and return it. Concurrent callers share a single
   * in-flight fetch. Failures are never cached.
   */
  async fetch(
    fn: () => Promise<T>,
    opts?: { forceRefresh?: boolean; staleMs?: number },
  ): Promise<T> {
    const staleMs = opts?.staleMs ?? 0;
    if (
      !opts?.forceRefresh &&
      this.data !== undefined &&
      Date.now() - this.lastSetAt < staleMs
    ) {
      return this.data;
    }
    if (this.inFlight) return this.inFlight;
    const pending = fn().then(
      (result) => {
        this.data = result;
        this.lastSetAt = Date.now();
        this.inFlight = undefined;
        return result;
      },
      (error) => {
        this.inFlight = undefined;
        throw error;
      },
    );
    this.inFlight = pending;
    return pending;
  }
}
