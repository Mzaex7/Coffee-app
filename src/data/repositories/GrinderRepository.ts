import { supabase } from '../supabase';
import { Grinder } from '../../domain/entities/Grinder';

interface GrinderRow {
    id: number;
    user_id: string | null;
    name: string;
    brand: string | null;
    model: string | null;
    description: string | null;
}

const COLUMNS = 'id, user_id, name, brand, model, description';

export class GrinderRepository {
    async getAll(_userId?: string): Promise<Grinder[]> {
        const { data, error } = await supabase
            .from('grinders')
            .select(COLUMNS)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return (data as GrinderRow[]).map(this.mapRow);
    }

    async getById(id: number): Promise<Grinder | null> {
        const { data, error } = await supabase
            .from('grinders')
            .select(COLUMNS)
            .eq('id', id)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? this.mapRow(data as GrinderRow) : null;
    }

    async create(grinder: Grinder): Promise<number> {
        const userId = grinder.userId ?? (await this.requireUserId());
        const { data, error } = await supabase
            .from('grinders')
            .insert({
                user_id: userId,
                name: grinder.name,
                brand: grinder.brand ?? null,
                model: grinder.model ?? null,
                description: grinder.description ?? null,
            })
            .select('id')
            .single();
        if (error) throw new Error(error.message);
        return (data as { id: number }).id;
    }

    async update(grinder: Grinder): Promise<void> {
        if (!grinder.id) throw new Error('Grinder ID required for update');
        const { error } = await supabase
            .from('grinders')
            .update({
                name: grinder.name,
                brand: grinder.brand ?? null,
                model: grinder.model ?? null,
                description: grinder.description ?? null,
            })
            .eq('id', grinder.id);
        if (error) throw new Error(error.message);
    }

    async delete(id: number): Promise<void> {
        const { error } = await supabase.from('grinders').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    private async requireUserId(): Promise<string> {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error('Not signed in');
        return data.user.id;
    }

    private mapRow(row: GrinderRow): Grinder {
        return {
            id: row.id,
            userId: row.user_id ?? undefined,
            name: row.name,
            brand: row.brand ?? '',
            model: row.model ?? '',
            description: row.description ?? undefined,
        };
    }
}
