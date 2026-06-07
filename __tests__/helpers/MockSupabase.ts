/**
 * MockSupabase — a tiny in-memory stand-in for the Supabase JS client, just
 * rich enough to exercise the repository call patterns:
 *
 *   from(t).select(cols).order(...)            → { data: rows,  error }
 *   from(t).select(cols).eq(c,v).maybeSingle() → { data: row|null }
 *   from(t).insert(obj).select('id').single()  → { data: { id }, error }
 *   from(t).update(obj).eq(c,v)                → awaited → { error }
 *   from(t).delete().eq(c,v)                   → awaited → { error }
 *   auth.getUser()                             → { data: { user } }
 *   functions.invoke(name, { body })          → jest.fn (set per test)
 *
 * The query builder is chainable AND thenable, mirroring supabase-js so the
 * same code path runs in tests as in production.
 */

type Row = Record<string, any>;

class Store {
    tables: Record<string, Row[]> = {};
    seq: Record<string, number> = {};
    reset() { this.tables = {}; this.seq = {}; }
    rows(table: string): Row[] { return (this.tables[table] ||= []); }
    next(table: string): number { this.seq[table] = (this.seq[table] || 0) + 1; return this.seq[table]; }
}

class Query implements PromiseLike<{ data: any; error: any }> {
    private op?: 'select' | 'insert' | 'update' | 'delete';
    private payload: any;
    private filters: [string, any][] = [];

    constructor(private store: Store, private table: string) { }

    select(_cols?: string) { if (!this.op) this.op = 'select'; return this; }
    insert(obj: Row) { this.op = 'insert'; this.payload = obj; return this; }
    update(obj: Row) { this.op = 'update'; this.payload = obj; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(col: string, val: any) { this.filters.push([col, val]); return this; }
    order(_col?: string, _opts?: any) { return this; }

    private matches(row: Row): boolean {
        return this.filters.every(([c, v]) => row[c] === v);
    }

    private exec(): { data: any; error: any } {
        const rows = this.store.rows(this.table);
        if (this.op === 'insert') {
            const id = this.store.next(this.table);
            const row = { id, ...this.payload };
            rows.push(row);
            return { data: { id }, error: null };
        }
        if (this.op === 'update') {
            rows.filter(r => this.matches(r)).forEach(r => Object.assign(r, this.payload));
            return { data: null, error: null };
        }
        if (this.op === 'delete') {
            this.store.tables[this.table] = rows.filter(r => !this.matches(r));
            return { data: null, error: null };
        }
        // select
        return { data: rows.filter(r => this.matches(r)), error: null };
    }

    single() {
        const { data, error } = this.exec();
        const row = Array.isArray(data) ? (data[0] ?? null) : data;
        return Promise.resolve({ data: row, error });
    }
    maybeSingle() {
        const { data, error } = this.exec();
        const row = Array.isArray(data) ? (data[0] ?? null) : data;
        return Promise.resolve({ data: row, error });
    }
    then<T>(resolve: (v: { data: any; error: any }) => T, reject?: (e: any) => any) {
        return Promise.resolve(this.exec()).then(resolve, reject);
    }
}

export interface MockSupabase {
    from: (table: string) => Query;
    auth: {
        getUser: () => Promise<{ data: { user: { id: string } | null }; error: null }>;
        getSession: () => Promise<{ data: { session: null }; error: null }>;
    };
    functions: { invoke: jest.Mock };
    rpc: jest.Mock;
    __store: Store;
    __reset: () => void;
    __userId: string;
}

export function createMockSupabase(userId = 'test-user-id'): MockSupabase {
    const store = new Store();
    return {
        from: (table: string) => new Query(store, table),
        auth: {
            getUser: async () => ({ data: { user: { id: userId } }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
        },
        functions: { invoke: jest.fn(async () => ({ data: null, error: null })) },
        rpc: jest.fn(async () => ({ data: null, error: null })),
        __store: store,
        __reset: () => store.reset(),
        __userId: userId,
    };
}
