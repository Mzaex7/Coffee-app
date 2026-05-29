import { BrewLog, Score } from '../entities/BrewLog';

export class BrewBuilder {
    private brew: Partial<BrewLog>;

    constructor() {
        this.brew = {
            score: {
                body: 1,
                acidity: 5,
                bitterness: 5,
                tasteNotes: [],
            },
        };
    }

    setEquipment(coffeeId: number, grinderId: number): BrewBuilder {
        this.brew.coffeeId = coffeeId;
        this.brew.grinderId = grinderId;
        return this;
    }

    setRecipe(doseIn: number, doseOut: number, timeSeconds: number, temp?: number): BrewBuilder {
        this.brew.doseIn = doseIn;
        this.brew.doseOut = doseOut;
        this.brew.timeSeconds = timeSeconds;
        this.brew.temperature = temp;
        return this;
    }

    setGrindSetting(setting: string): BrewBuilder {
        this.brew.grindSetting = setting;
        return this;
    }

    setRating(rating: number): BrewBuilder {
        this.brew.rating = rating;
        return this;
    }

    setScore(score: Partial<Score>): BrewBuilder {
        this.brew.score = { ...this.brew.score!, ...score };
        return this;
    }

    build(): BrewLog {
        if (
            this.brew.coffeeId === undefined ||
            this.brew.grinderId === undefined ||
            this.brew.doseIn === undefined ||
            this.brew.doseOut === undefined ||
            this.brew.timeSeconds === undefined
        ) {
            throw new Error('Missing required brew fields');
        }

        return {
            ...this.brew as BrewLog,
            date: new Date().toISOString(),
        };
    }
}
