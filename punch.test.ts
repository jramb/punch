import * as p from './punch.js';
import { describe, expect, test } from '@jest/globals';
// https://jestjs.io/docs/expect

const testDate1 = new Date(2022, 11-1, 24, 12, 34);
const testDate2 = new Date("2022-12-17 09:17"); //Saturday

describe("punch", () => {
    // test = it
    test('clockText', () => {
        expect(p.clockText(new Date())).toHaveLength(20);
        expect(p.clockText(testDate1)).toBe('2022-11-24 Thu 12:34');
        expect(p.clockText(testDate2)).toBe('2022-12-17 Sat 09:17');
        expect(p.clockTextDate(testDate1)).toBe('2022-11-24');
        expect(p.clockTextDate(testDate2)).toBe('2022-12-17');
        expect(p.getMonDay(testDate1)).toBe(3);
        expect(testDate1.getDay()).toBe(4);
        expect(testDate2.getDay()).toBe(6);
        expect(p.getMonDay(testDate2)).toBe(5);
    });
    test('pad2', () => {
        expect(p.pad2(2)).toBe('02');
        //expect(p.pad2(undefined)).toBe("undefined");
        expect(p.pad2(12)).toBe('12');
        expect(p.pad2(123)).toBe('123');
    });
});

