import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([{ a: 'x,"y"', b: "line\nbreak" }])).toBe('a,b\r\n"x,""y""","line\nbreak"');
  });
  it("neutralises formula injection", () => {
    expect(toCsv([{ a: "=SUM(A1)" }])).toBe("a\r\n'=SUM(A1)");
  });
  it("respects column order and blanks missing values", () => {
    expect(toCsv([{ b: 2 }, { a: 1, b: null }], ["a", "b"])).toBe("a,b\r\n,2\r\n1,");
  });
});
