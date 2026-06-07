import { supabase } from '../supabase';
import { Coffee, RoastLevel } from '../../domain/entities/Coffee';

interface CoffeeRow {
    id: number;
    user_id: string | null;
    name: string;
    roastery: string;
    origin: string | null;
    variety: string | null;
    process: string | null;
    roast_level: string | null;
    roast_date: string | null;
    notes: string | null;
}

const COLUMNS = 'id, user_id, name, roastery, origin, variety, process, roast_level, roast_date, notes';

/**
 * CoffeeRepository — Supabase-backed. RLS scopes every query to the signed-in
 * user automatically, so the userId argument is effectively advisory; we still
 * accept it to keep the call sites unchanged.
 */
export class CoffeeRepository {
    async getAll(_userId?: string): Promise<Coffee[]> {
        const { data, error } = await supabase
            .from('coffees')
            .select(COLUMNS)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return (data as CoffeeRow[]).map(this.mapRow);
    }

    async getById(id: number): Promise<Coffee | null> {
        const { data, error } = await supabase
            .from('coffees')
            .select(COLUMNS)
            .eq('id', id)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? this.mapRow(data as CoffeeRow) : null;
    }

    async create(coffee: Coffee): Promise<number> {
        const userId = coffee.userId ?? (await this.requireUserId());
        const { data, error } = await supabase
            .from('coffees')
            .insert({
                user_id: userId,
                name: coffee.name,
                roastery: coffee.roastery,
                origin: coffee.origin ?? null,
                variety: coffee.variety ?? null,
                process: coffee.process ?? null,
                roast_level: coffee.roastLevel ?? null,
                roast_date: coffee.roastDate ?? null,
                notes: coffee.notes ?? null,
            })
            .select('id')
            .single();
        if (error) throw new Error(error.message);
        return (data as { id: number }).id;
    }

    async update(coffee: Coffee): Promise<void> {
        if (!coffee.id) throw new Error('Coffee ID required for update');
        const { error } = await supabase
            .from('coffees')
            .update({
                name: coffee.name,
                roastery: coffee.roastery,
                origin: coffee.origin ?? null,
                variety: coffee.variety ?? null,
                process: coffee.process ?? null,
                roast_level: coffee.roastLevel ?? null,
                roast_date: coffee.roastDate ?? null,
                notes: coffee.notes ?? null,
            })
            .eq('id', coffee.id);
        if (error) throw new Error(error.message);
    }

    async delete(id: number): Promise<void> {
        const { error } = await supabase.from('coffees').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    private async requireUserId(): Promise<string> {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error('Not signed in');
        return data.user.id;
    }

    private mapRow(row: CoffeeRow): Coffee {
        return {
            id: row.id,
            userId: row.user_id ?? undefined,
            name: row.name,
            roastery: row.roastery,
            origin: row.origin ?? undefined,
            variety: row.variety ?? undefined,
            process: row.process ?? undefined,
            roastLevel: (row.roast_level as RoastLevel) ?? undefined,
            roastDate: row.roast_date ?? undefined,
            notes: row.notes ?? undefined,
        };
    }
}
