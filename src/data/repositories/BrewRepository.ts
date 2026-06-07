import { supabase } from '../supabase';
import { BrewLog } from '../../domain/entities/BrewLog';

interface BrewLogRow {
    id: number;
    user_id: string | null;
    coffee_id: number;
    grinder_id: number;
    date: string;
    dose_in: number;
    dose_out: number;
    time_seconds: number;
    temperature: number | null;
    grind_setting: string | null;
    rating: number | null;
    rating_body: number;
    rating_acidity: number;
    rating_bitterness: number;
    taste_notes: string | null;
}

const COLUMNS =
    'id, user_id, coffee_id, grinder_id, date, dose_in, dose_out, time_seconds, ' +
    'temperature, grind_setting, rating, rating_body, rating_acidity, rating_bitterness, taste_notes';

/**
 * BrewRepository — Supabase-backed. RLS scopes reads/writes to the signed-in
 * user. Cross-user analysis no longer happens here: it lives in the
 * get_community_bean_stats() RPC, called server-side from the brew-advice
 * Edge Function (anonymized + opt-in + k-anonymity).
 */
export class BrewRepository {
    async getAll(_userId?: string): Promise<BrewLog[]> {
        const { data, error } = await supabase
            .from('brew_logs')
            .select(COLUMNS)
            .order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return (data as unknown as BrewLogRow[]).map(this.mapRow);
    }

    async create(brew: BrewLog): Promise<number> {
        const userId = brew.userId ?? (await this.requireUserId());
        const { data, error } = await supabase
            .from('brew_logs')
            .insert({
                user_id: userId,
                coffee_id: brew.coffeeId,
                grinder_id: brew.grinderId,
                date: brew.date,
                dose_in: brew.doseIn,
                dose_out: brew.doseOut,
                time_seconds: brew.timeSeconds,
                temperature: brew.temperature ?? null,
                grind_setting: brew.grindSetting ?? null,
                rating: brew.rating ?? null,
                rating_body: brew.score.body,
                rating_acidity: brew.score.acidity,
                rating_bitterness: brew.score.bitterness,
                taste_notes: JSON.stringify(brew.score.tasteNotes ?? []),
            })
            .select('id')
            .single();
        if (error) throw new Error(error.message);
        return (data as { id: number }).id;
    }

    async delete(id: number): Promise<void> {
        const { error } = await supabase.from('brew_logs').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    private async requireUserId(): Promise<string> {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error('Not signed in');
        return data.user.id;
    }

    private mapRow(row: BrewLogRow): BrewLog {
        return {
            id: row.id,
            userId: row.user_id ?? undefined,
            coffeeId: row.coffee_id,
            grinderId: row.grinder_id,
            date: row.date,
            doseIn: row.dose_in,
            doseOut: row.dose_out,
            timeSeconds: row.time_seconds,
            temperature: row.temperature ?? undefined,
            grindSetting: row.grind_setting ?? undefined,
            rating: row.rating ?? undefined,
            score: {
                body: row.rating_body,
                acidity: row.rating_acidity,
                bitterness: row.rating_bitterness,
                tasteNotes: JSON.parse(row.taste_notes || '[]'),
            },
        };
    }
}
