import { describe, expect, test } from "bun:test";
import { buildClockSvg, buildKeySvg, escapeXml } from "./renderer";

const fonts = { family: "DejaVuSans", userSizePx: 16, afkSizePx: 14 };

describe("escapeXml", () => {
  test("escapes markup-significant characters", () => {
    expect(escapeXml(`a<b>&"c"'`)).toBe("a&lt;b&gt;&amp;&quot;c&quot;&apos;");
    expect(escapeXml("plain")).toBe("plain");
  });
});

describe("buildKeySvg", () => {
  test("embeds name, sub text and font sizes", () => {
    const svg = buildKeySvg({
      name: "Alice",
      subText: "7m",
      pixelSize: 80,
      fonts,
    });
    expect(svg).toContain("Alice");
    expect(svg).toContain("7m");
    expect(svg).toContain('font-size="16px"');
    expect(svg).toContain('font-size="14px"');
    expect(svg).toContain('viewBox="0 0 80 80"');
  });

  test("never interpolates raw nicknames", () => {
    const svg = buildKeySvg({
      name: "<script>alert(1)</script>",
      subText: "",
      pixelSize: 80,
      fonts,
    });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });
});

describe("buildClockSvg", () => {
  test("embeds the character", () => {
    const svg = buildClockSvg({ char: ":", pixelSize: 80, family: "sans" });
    expect(svg).toContain(">:");
    expect(svg).toContain("</text>");
  });

  test("scales the glyph with the key resolution", () => {
    expect(
      buildClockSvg({ char: "1", pixelSize: 80, family: "sans" }),
    ).toContain('font-size="50px"');
    expect(
      buildClockSvg({ char: "1", pixelSize: 160, family: "sans" }),
    ).toContain('font-size="100px"');
  });
});
