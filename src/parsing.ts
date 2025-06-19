import { ClassifierScore } from "./classifications";

export function parseLine(input: string): ClassifierScore | undefined {
    const CLASSIFIER_REGEX = new RegExp("(?<date>\\d+\\/\\d+\\/\\d+)\\s+(?<classifierNumber>\\d{2}-\\d{2})\\s+(?<club>.+[^\\s])\\s+(?<flag>[A-Z])\\s+(?<percentage>[\\d\\.]+)\\s+(?<hitFactor>[\\d\\.]+)");
    const matchResult = input.match(CLASSIFIER_REGEX)?.groups;
    if (matchResult != null) {
        return {
            date: new Date(matchResult["date"]),
            classifierNumber: matchResult["classifierNumber"],
            club: matchResult["club"],
            flag: matchResult["flag"],
            percent: parseFloat(matchResult["percentage"]),
            hitFactor: parseFloat(matchResult["hitFactor"])
        };
    }

    return undefined
}

export function parseTextInput(input: string): ClassifierScore[] {
    return input
        .split("\n")
        .map(parseLine)
        .filter(x => x !== undefined)
}