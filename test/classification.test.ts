import { describe, it } from "mocha";
import * as assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

import { parseTextInput } from "../src/parsing";
import { ClassifierScore, ClassificationSnapshot, getClassificationHistory, RollingWindow, sortClassifiers, scoreNeededForTarget } from "../src/classifications";

const classifierData = parseTextInput(readFileSync(join(__dirname, "data", "record.txt"), { encoding: "utf-8" }));

function assertClose(actual: number | null, expected: number, tol = 1e-3) {
    if (actual === null) {
        throw new Error(`expected ${expected}, got null`);
    }
    const diff = Math.abs(actual - expected);
    assert.ok(diff <= tol, `expected ${expected}, got ${actual} (diff ${diff})`);
}

function quickScore(date: string, classifierNumber: string, percent: number): ClassifierScore {
    return {
        date: new Date(date),
        classifierNumber: classifierNumber,
        percent: percent
    };
}

describe("RollingWindow", () => {
    describe("append()", () => {

        const scores = [
            quickScore("01/01/24", "01-01", 55),
            quickScore("02/01/24", "01-02", 56),
            quickScore("03/01/24", "01-03", 57),
            quickScore("04/01/24", "01-04", 58),
            quickScore("05/01/24", "01-06", 59),
            quickScore("06/01/24", "01-07", 59),
            quickScore("07/01/24", "01-08", 59),
            quickScore("08/01/24", "01-09", 59)
        ];

        it("should append classifiers until full", () => {
            let window = new RollingWindow([]);
            scores.forEach((score, index) => {
                assert.deepEqual(index, window.scores.length);
                window = window.append(score);
                assert.deepEqual(index + 1, window.scores.length);
            });
            assert.deepEqual(scores, window.scores)

            // Now old ones should roll off
            const newScore = quickScore("09/01/24", "01-10", 60);
            window = window.append(newScore);
            assert.equal(8, window.scores.length)

            const expectedScores = scores.slice(1);
            expectedScores.push(newScore);
            assert.deepEqual(expectedScores, window.scores);
        });

        it("should remove older scores for the same classifier", () => {
            const window = new RollingWindow(scores);
            const newScore = quickScore("09/01/24", "01-07", 100);
            assert.deepEqual(
                [
                    quickScore("01/01/24", "01-01", 55),
                    quickScore("02/01/24", "01-02", 56),
                    quickScore("03/01/24", "01-03", 57),
                    quickScore("04/01/24", "01-04", 58),
                    quickScore("05/01/24", "01-06", 59),
                    quickScore("07/01/24", "01-08", 59),
                    quickScore("08/01/24", "01-09", 59),
                    newScore
                ],
                window.append(newScore).scores
            );
        });
    });

    describe("sortClassifiers()", () => {
        it("should sort by date and percentage", () => {
            const classifiers = [
                quickScore("01/01/24", "01-01", 55),
                quickScore("02/02/24", "02-01", 58),
                quickScore("01/01/24", "01-05", 34),
                quickScore("01/01/24", "08-09", 90),
                quickScore("02/02/24", "07-05", 80)
            ];

            const expected = [
                quickScore("01/01/24", "01-05", 34),
                quickScore("01/01/24", "01-01", 55),
                quickScore("01/01/24", "08-09", 90),
                quickScore("02/02/24", "02-01", 58),
                quickScore("02/02/24", "07-05", 80)
            ]

            assert.deepEqual(sortClassifiers(classifiers), expected);
        });
    });

    describe("classificationScore()", () => {
        it("should match USPSA's calculation for a known record", () => {
            const score = sortClassifiers(classifierData)
                .reduce<RollingWindow>((window, s) => window.append(s), new RollingWindow([]))
                .classificationScore()?.toFixed(4);
            assert.equal(score, 96.6455)
        });
    });

    describe("getClassificationHistory()", () => {
        const expected: ClassificationSnapshot[] = [
            {
                date: new Date("07/15/23"),
                percentage: 76.80225
            },
            {
                date: new Date("08/06/23"),
                percentage: 82.60745
            },
            {
                date: new Date("12/03/23"),
                percentage: 85.32589999999999
            },
            {
                date: new Date("01/07/24"),
                percentage: 79.19494999999999
            },
            {
                date: new Date("01/26/24"),
                percentage: 82.15845999999999
            },
            {
                date: new Date("03/03/24"),
                percentage: 80.38911666666665
            },
            {
                date: new Date("03/03/24"),
                percentage: 82.87986666666666
            },
            {
                date: new Date("03/03/24"),
                percentage: 85.74546666666667
            },
            {
                date: new Date("03/03/24"),
                percentage: 88.46071666666666
            },
            {
                date: new Date("03/03/24"),
                percentage: 89.53298333333333 
            },
            {
                date: new Date("03/03/24"),
                percentage: 91.08616666666667
            },
            {
                date: new Date("03/03/24"),
                percentage: 92.42359999999998 
            },
            {
                date: new Date("03/03/24"),
                percentage: 93.42151666666666
            },
            {
                date: new Date("06/02/24"),
                percentage: 93.42151666666666
            },
            {
                date: new Date("07/07/24"),
                percentage: 94.8756
            },
            {
                date: new Date("09/01/24"),
                percentage: 94.8756
            },
            {
                date: new Date("11/03/24"),
                percentage: 96.10669999999999
            },
            {
                date: new Date("06/01/25"),
                percentage: 96.64551666666667
            }
        ];
        // assert.deepEqual(getClassificationHistory(classifierData), expected);
        const result = getClassificationHistory(classifierData)
        expected.forEach((val, index) => assert.deepEqual(result[index], expected[index]));
    });

    describe("scoreNeededForTarget()", () => {
        it("returns the exact value (>110) when classing up is impossible in one match", () => {
            const base: ClassifierScore[] = [
                { date: new Date('2025-01-01'), percent: 50 },
                { date: new Date('2025-02-01'), percent: 60 },
                { date: new Date('2025-03-01'), percent: 70 },
                { date: new Date('2025-04-01'), percent: 80 },
                { date: new Date('2025-05-01'), percent: 90 },
                { date: new Date('2025-06-01'), percent: 95 },
            ];
            const needed = scoreNeededForTarget(base, 85) as number;
            // Sorted: [50,60,70,80,90,95]; top5 sum = 395; 6*85 - 395 = 115
            assertClose(needed, 115, 1e-3);
        });


        it("classing up from D to C", () => {
            // D: 2, C: 40
            const scores = [
                { date: new Date('2025-01-01'), classifierNumber: 'A', percent: 10 },
                { date: new Date('2025-02-01'), classifierNumber: 'B', percent: 15 },
                { date: new Date('2025-03-01'), classifierNumber: 'C', percent: 25 },
                { date: new Date('2025-04-01'), classifierNumber: 'D', percent: 30 },
                { date: new Date('2025-05-01'), classifierNumber: 'E', percent: 35 },
                { date: new Date('2025-06-01'), classifierNumber: 'F', percent: 39 },
            ];
            const needed = scoreNeededForTarget(scores, 40) as number;
            // top5 sum = 15+25+30+35+39 = 144; need = 240-144 = 96
            assertClose(needed, 96, 1e-3);
        });

        it("classing up from C to B", () => {
            // C: 40, B: 60
            const scores = [
                { date: new Date('2025-01-01'), classifierNumber: 'A', percent: 45 },
                { date: new Date('2025-02-01'), classifierNumber: 'B', percent: 50 },
                { date: new Date('2025-03-01'), classifierNumber: 'C', percent: 55 },
                { date: new Date('2025-04-01'), classifierNumber: 'D', percent: 58 },
                { date: new Date('2025-05-01'), classifierNumber: 'E', percent: 59 },
                { date: new Date('2025-06-01'), classifierNumber: 'F', percent: 59 },
            ];
            const needed = scoreNeededForTarget(scores, 60) as number;
            // top5 sum = 50+55+58+59+59 = 281; need = 360-281 = 79
            assertClose(needed, 79, 1e-3);
        });

        it("classing up from B to A", () => {
            // B: 60, A: 75
            const scores = [
                { date: new Date('2025-01-01'), classifierNumber: 'A', percent: 65 },
                { date: new Date('2025-02-01'), classifierNumber: 'B', percent: 68 },
                { date: new Date('2025-03-01'), classifierNumber: 'C', percent: 70 },
                { date: new Date('2025-04-01'), classifierNumber: 'D', percent: 72 },
                { date: new Date('2025-05-01'), classifierNumber: 'E', percent: 74 },
                { date: new Date('2025-06-01'), classifierNumber: 'F', percent: 74 },
            ];
            const needed = scoreNeededForTarget(scores, 75) as number;
            // top5 sum = 68+70+72+74+74 = 358; need = 450-358 = 92
            assertClose(needed, 92, 1e-3);
        });

        it("classing up from A to M", () => {
            // A: 75, M: 85
            const scores = [
                { date: new Date('2025-01-01'), classifierNumber: 'A', percent: 78 },
                { date: new Date('2025-02-01'), classifierNumber: 'B', percent: 80 },
                { date: new Date('2025-03-01'), classifierNumber: 'C', percent: 81 },
                { date: new Date('2025-04-01'), classifierNumber: 'D', percent: 82 },
                { date: new Date('2025-05-01'), classifierNumber: 'E', percent: 83 },
                { date: new Date('2025-06-01'), classifierNumber: 'F', percent: 84 },
            ];
            const needed = scoreNeededForTarget(scores, 85) as number;
            // top5 sum = 80+81+82+83+84 = 410; need = 510-410 = 100
            assertClose(needed, 100, 1e-3);
        });

        it("classing up from M to GM", () => {
            // M: 85, GM: 95
            const scores = [
                { date: new Date('2025-01-01'), classifierNumber: 'A', percent: 88 },
                { date: new Date('2025-02-01'), classifierNumber: 'B', percent: 90 },
                { date: new Date('2025-03-01'), classifierNumber: 'C', percent: 91 },
                { date: new Date('2025-04-01'), classifierNumber: 'D', percent: 92 },
                { date: new Date('2025-05-01'), classifierNumber: 'E', percent: 94 },
                { date: new Date('2025-06-01'), classifierNumber: 'F', percent: 95 },
            ];
            const needed = scoreNeededForTarget(scores, 95) as number;
            // top5 sum = 90+91+92+94+95 = 462; need = 570-462 = 108
            assertClose(needed, 108, 1e-3);
        });
    });
});