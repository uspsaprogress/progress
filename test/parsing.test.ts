import { describe, it } from "mocha";
import * as assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

import { parseLine, parseTextInput } from "../src/parsing";
import { ClassifierScore } from "../src/classifications";

describe("parseLine", () => {
    it("should parse Entries out of USPSA table lines", () => {
        const input1 = "6/01/25 	09-10 	Custer Sportsmens Club 	Y 	95.0488 	11.2840 	6/10/25 	Stage Score";
        const expectedOutput: ClassifierScore = {
            date: new Date("6/01/25"),
            classifierNumber: "09-10",
            club: "Custer Sportsmens Club",
            flag: "Y",
            percent: 95.0488,
            hitFactor: 11.284
        }
        assert.deepEqual(parseLine(input1), expectedOutput);
    })

    it("should parse major matches", () => {
        const input = "6/26/24 		2024 SIG Sauer Carry Optics Nationals Presented by Vortex Optics at US01 	F 	90.8692 	- 	- 	Major Match";
        const expectedOutput: ClassifierScore = {
            date: new Date("6/26/24"),
            club: "2024 SIG Sauer Carry Optics Nationals Presented by Vortex Optics at US01",
            flag: "F",
            percent: 90.8692
        };
        assert.deepEqual(parseLine(input), expectedOutput);
    })
})

describe("parseTextInput", () => {
    it("should ignore headers and parse a table", () => {
        const expectedOutput: ClassifierScore[] = [
            {
                classifierNumber: "09-10",
                club: "Custer Sportsmens Club",
                date: new Date("06/01/25"),
                flag: "Y",
                percent: 95.0488,
                hitFactor: 11.284
            },
            {
                classifierNumber: "19-02",
                club: "Custer Sportsmens Club",
                date: new Date("11/03/24"),
                flag: "Y",
                percent: 99.0984,
                hitFactor: 10.0346
            },
            {
                classifierNumber: "99-13",
                club: "Custer Sportsmens Club",
                date: new Date("09/01/24"),
                flag: "F",
                percent: 86.858,
                hitFactor: 8.3051
            },
            {
                classifierNumber: "20-01",
                club: "Custer Sportsmens Club",
                date: new Date("07/07/24"),
                flag: "Y",
                percent: 97.4605,
                hitFactor: 8.5546
            },
            {
                classifierNumber: "18-03",
                club: "Custer Sportsmens Club",
                date: new Date("06/02/24"),
                flag: "F",
                percent: 87.4095,
                hitFactor: 6.7981
            },
            {
                classifierNumber: "23-01",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "Y",
                percent: 100,
                hitFactor: 10.325
            },
            {
                classifierNumber: "99-53",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "Y",
                percent: 95.5208,
                hitFactor: 6.9948
            },
            {
                classifierNumber: "99-28",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "Y",
                percent: 92.7446,
                hitFactor: 10.087
            },
            {
                classifierNumber: "22-07",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "E",
                percent: 91.7118,
                hitFactor: 8.9474
            },
            {
                classifierNumber: "23-02",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "E",
                percent: 91.8159,
                hitFactor: 9.3913
            },
            {
                classifierNumber: "99-10",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "E",
                percent: 88.736,
                hitFactor: 9.1525
            },
            {
                classifierNumber: "09-08",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "E",
                percent: 87.4962,
                hitFactor: 8.0717
            },
            {
                classifierNumber: "99-14",
                club: "Custer Sportsmens Club",
                date: new Date("03/03/24"),
                flag: "E",
                percent: 67.0886,
                hitFactor: 53
            },
            {
                classifierNumber: "22-01",
                club: "WAC Gulf Coast Lead Slingers",
                date: new Date("01/26/24"),
                flag: "E",
                percent: 94.0125,
                hitFactor: 8.0392
            },
            {
                classifierNumber: "06-10",
                club: "Custer Sportsmens Club",
                date: new Date("01/07/24"),
                flag: "E",
                percent: 71.5424,
                hitFactor: 7.4442
            },
            {
                classifierNumber: "99-42",
                club: "Custer Sportsmens Club",
                date: new Date("12/03/23"),
                flag: "E",
                percent: 83.4255,
                hitFactor: 8.1123
            },
            {
                classifierNumber: "08-01",
                club: "Custer Sportsmens Club",
                date: new Date("08/06/23"),
                flag: "E",
                percent: 85.3823,
                hitFactor: 4.8831
            },
            {
                classifierNumber: "99-24",
                club: "Marysville Rifle Club Practical Shooters",
                date: new Date("07/15/23"),
                flag: "E",
                percent: 75.4203,
                hitFactor: 8.8189
            },
            {
                classifierNumber: "18-06",
                club: "Custer Sportsmens Club",
                date: new Date("07/02/23"),
                flag: "E",
                percent: 62.1615,
                hitFactor: 3.7599
            },
            {
                classifierNumber: "06-10",
                club: "Custer Sportsmens Club",
                date: new Date("06/04/23"),
                flag: "E",
                percent: 97.0755,
                hitFactor: 10.101
            },
            {
                classifierNumber: "03-08",
                club: "Custer Sportsmens Club",
                date: new Date("05/07/23"),
                flag: "E",
                percent: 72.5517,
                hitFactor: 7.4972
            }
      ]
        assert.deepEqual(expectedOutput, parseTextInput(readFileSync(join(__dirname, "data", "record.txt"), { encoding: "utf-8" })));
    })
})