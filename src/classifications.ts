export interface ClassifierScore {
    date: Date,
    classifierNumber: string,
    percent: number,
    club?: string,
    flag?: string,
    hitFactor?: number
}

export class RollingWindow {
    constructor(public readonly scores: ClassifierScore[]) {
        this.canScore = scores.length >= 6;
    }

    public readonly canScore: boolean;

    append(nextClassifier: ClassifierScore): RollingWindow {
        // Take MRO into account. If the classifier number is already in our list, remove the old score
        let newHistory = this.scores.filter(c => c.classifierNumber !== nextClassifier.classifierNumber);
        if (newHistory.length == 8) {
            // If the window is full, remove the first entry
            newHistory = newHistory.slice(1);
        }

        newHistory.push(nextClassifier);
        return new RollingWindow(newHistory);
    }
}