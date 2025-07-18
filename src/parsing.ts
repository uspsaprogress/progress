import * as _ from "lodash";

import { ClassifierScore } from "./classifications";

export function parseLine(input: string): ClassifierScore | undefined {
    const CLASSIFIER_REGEX = new RegExp("(?<date>\\d+\\/\\d+\\/\\d+)\\s+(?<classifierNumber>\\d{2}-\\d{2})\\s+(?<club>.+[^\\s])\\s+(?<flag>[A-Z])\\s+(?<percentage>[\\d\\.]+)\\s+(?<hitFactor>[\\d\\.]+)");
    const MAJOR_MATCH_REGEX = new RegExp("(?<date>\\d+\\/\\d+\\/\\d+)\\s+(?<club>.+[^\\s])\\s+(?<flag>[A-Z])\\s+(?<percentage>[\\d\\.]+)\\s+-\\s+-\\s+Major Match$")

    const matchResult = input.match(CLASSIFIER_REGEX)?.groups ?? input.match(MAJOR_MATCH_REGEX)?.groups;
    if (matchResult != null) {
        const score: ClassifierScore = {
            date: new Date(matchResult["date"]),
            classifierNumber: matchResult["classifierNumber"],
            club: matchResult["club"],
            flag: matchResult["flag"],
            percent: parseFloat(matchResult["percentage"]),
            hitFactor: parseFloat(matchResult["hitFactor"])
        };

        // Remove undefined values from optional properties
        for (let key in score) {
            if (score[key] === undefined || _.isNaN(score[key])) {
                delete score[key];
            }
        }

        return score;
    }

    return undefined
}

export function parseTextInput(input: string): ClassifierScore[] {
    return input
        .split("\n")
        .map(parseLine)
        .filter(x => x !== undefined)
}