import { describe, it } from "mocha";
import * as assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

import { parseTextInput } from "../src/parsing";
import { RollingWindow } from "../src/classifications";

const classifierData = parseTextInput(readFileSync(join(__dirname, "data", "record.txt"), { encoding: "utf-8" }));

describe("RollingWindow", () => {
    describe("append()", () => {
        function quickScore(date: string, classifierNumber: string, percent: number): ClassifierScore {
            return {
                date: new Date(date),
                classifierNumber: classifierNumber,
                percent: percent
            };
        }

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
});