import { sortBy } from "lodash/fp";
import _ from "lodash";

export interface ClassifierScore {
    date: Date,
    classifierNumber?: string,
    percent: number,
    club?: string,
    flag?: string,
    hitFactor?: number
}

export class RollingWindow {
    constructor(public readonly scores: ClassifierScore[]) {
        this.canScore = scores.length >= 4;
    }

    public readonly canScore: boolean;

    append(nextClassifier: ClassifierScore): RollingWindow {
        // Take MRO into account only when a classifier number is present
        let newHistory = this.scores;
        if (nextClassifier.classifierNumber !== undefined) {
            newHistory = newHistory.filter(c => c.classifierNumber !== nextClassifier.classifierNumber);
        }
        if (newHistory.length == 8) {
            // If the window is full, remove the first entry
            newHistory = newHistory.slice(1);
        }

        newHistory.push(nextClassifier);
        return new RollingWindow(newHistory);
    }

    classificationScore(): number | null {
        if (this.canScore) {
            const dropScoreCount = Math.min(2, this.scores.length - 4);
            return _(this.scores)
                .map(s => s.percent)
                .sortBy()
                .slice(dropScoreCount)
                .mean();
        }
        return null;
    }
}

/**
 * Classifiers are sorted by date in ascending order.
 * 
 * If multiple classifiers are shot on the same day, they are sorted by percentage in ascending order.
 */
export function sortClassifiers(scores: ClassifierScore[]): ClassifierScore[] {
    return sortBy<ClassifierScore>([
        s => s.date.getTime(),
        s => s.percent
    ])(scores);
}

/**
 * Indicates whether we should exclude the given score from consideration based on the given flag.
 *
 * We are intentionally being more permissive than USPSA here. We want to consider P- and U-flagged classifiers
 * (pending or unpaid) so that we don't have to wait until Tuesday for stats to run to see how a recent score will
 * affect our classification. I'm also allowing X flags (submitted while the membership was inactive) so that people
 * can continue to track their progress even if they're not paying.
 *
 * These decisions are somewhat arbitrary. In the future we could consider letting the user pick which flags to
 * exclude using checkboxes or similar.
 */
export function isInvalid(flag: string): boolean {
    switch (flag) {
        case "I": // Administrative exclusion
        case "Q": // DQ
        case "N": // "Did Not Fire"
            return true;
        default:
            return false
    }
}

export interface ClassificationSnapshot {
    readonly date: Date;
    readonly percentage: number;
};

export function getClassificationHistory(classifiers: ClassifierScore[]): ClassificationSnapshot[] {
    let window = new RollingWindow([]);
    return _(classifiers)
        .sortBy([
            s => s.date.getTime(),
            s => s.percent
        ]).reduce<ClassificationSnapshot[]>(
            (hist, nextScore) => {
                if (nextScore.flag === undefined || !isInvalid(nextScore.flag)) {
                    window = window.append(nextScore);
                    if (window.canScore) {
                        hist.push({
                            date: nextScore.date,
                            percentage: window.classificationScore()!
                        });
                    }
                }
                return hist;
            }, []
        )
}

/**
 * Compute the current rolling window after applying USPSA-like ordering and MRO rules.
 */
export function getCurrentWindow(classifiers: ClassifierScore[]): RollingWindow {
    let window = new RollingWindow([]);
    _(classifiers)
        .sortBy([
            s => s.date.getTime(),
            s => s.percent
        ])
        .forEach(nextScore => {
            if (nextScore.flag === undefined || !isInvalid(nextScore.flag)) {
                window = window.append(nextScore);
            }
        });
    return window;
}

/**
 * Calculate the minimal next classifier percent needed to reach a target average, honoring
 * the rolling window rules and optional MRO replacement for a specific upcoming classifier number.
 * Returns null if the window cannot currently score. Returns Infinity if >110% would be required.
 */
export function scoreNeededForTarget(
    classifiers: ClassifierScore[],
    targetAverage: number,
    nextClassifierNumber?: string
): number | null {
    const window = getCurrentWindow(classifiers);
    const currentAvg = window.classificationScore();
    if (currentAvg !== null && currentAvg >= targetAverage) return 0;

    // Build list after removing oldest-by-date if currently full, honoring MRO replacement
    const byDate = window.scores
        .filter(c => !nextClassifierNumber || c.classifierNumber !== nextClassifierNumber)
        .slice();
    if (byDate.length === 8) {
        let oldestIdx = 0;
        let oldestTime = byDate[0].date.getTime();
        for (let i = 1; i < byDate.length; i++) {
            const t = byDate[i].date.getTime();
            if (t < oldestTime) { oldestTime = t; oldestIdx = i; }
        }
        byDate.splice(oldestIdx, 1);
    }
    const perc = _(byDate).map(s => s.percent).sortBy().value();
    const top5 = perc.slice(-Math.min(5, perc.length));
    const sumTop5 = _.sum(top5);
    const needed = targetAverage * 6 - sumTop5;
    if (needed <= 0) return 0;
    return needed;
}