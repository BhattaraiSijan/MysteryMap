export type FakeStoreOptions = { throwOnSet?: boolean; throwOnGet?: boolean };

/** An in-memory Storage with switches for the ways a real browser store can fail. */
export function fakeStore(initial: Record<string, string> = {}, options: FakeStoreOptions = {}): Storage {
  const data = new Map(Object.entries(initial));
  const store = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => {
      if (options.throwOnGet) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (options.throwOnSet) throw new Error("blocked");
      data.set(k, String(v));
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
    clear: () => data.clear(),
  };
  return store as Storage;
}
