import { describe, it } from "mocha";
import * as assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

import { parseTextInput } from "../src/parsing";
import { ClassifierScore, ClassificationSnapshot, getClassificationHistory, RollingWindow, sortClassifiers } from "../src/classifications";

const classifierData = parseTextInput(readFileSync(join(__dirname, "data", "record.txt"), { encoding: "utf-8" }));

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
});