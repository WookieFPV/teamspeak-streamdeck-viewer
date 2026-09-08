/**
 * Pure SVG builders for the key images. No sharp, no HID, no env access —
 * everything varies through parameters so this is unit-testable
 * (see `renderer.test.ts`). The I/O side lives in `deck.ts`.
 */
export interface FontSettings {
  family: string;
  userSizePx: number;
  afkSizePx: number;
}

const xmlEscapes: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
};

/** nicknames are user-controlled; never interpolate them raw into svg */
export const escapeXml = (value: string): string =>
  value.replace(/[<>&"']/g, (ch) => xmlEscapes[ch] ?? ch);

export const buildKeySvg = (opts: {
  name: string;
  subText: string;
  pixelSize: number;
  fonts: FontSettings;
}): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.pixelSize} ${opts.pixelSize}">
    <text
      font-family="${escapeXml(opts.fonts.family)}"
      font-size="${opts.fonts.userSizePx}px"
      font-weight="bold"
      x="40"
      y="40"
      fill="#fff"
      text-anchor="middle"
    >${escapeXml(opts.name)}
    </text>
    <text
      font-family="${escapeXml(opts.fonts.family)}"
      font-size="${opts.fonts.afkSizePx}px"
      x="40"
      y="60"
      fill="#fff"
      text-anchor="middle"
    >${escapeXml(opts.subText)}
    </text>
  </svg>`;

export const buildClockSvg = (opts: {
  char: string;
  pixelSize: number;
  family: string;
}): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.pixelSize} ${opts.pixelSize}">
    <text
      font-family="${escapeXml(opts.family)}"
      font-size="50px"
      font-weight="bold"
      dx="50%"
      dy="75%"
      fill="#fff"
      text-anchor="middle"
    >${escapeXml(opts.char)}
    </text>
  </svg>`;
