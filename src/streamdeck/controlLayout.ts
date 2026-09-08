import type { StreamDeck } from "@elgato-stream-deck/node";

export type Corner = "top-left" | "bottom-right";

/** picks the button in the given corner of the deck's grid, by row/column rather than assuming an index */
export const getCornerButtonIndex = (
  streamDeck: StreamDeck,
  corner: Corner,
): number | undefined => {
  const buttons = streamDeck.CONTROLS.filter((c) => c.type === "button");
  if (buttons.length === 0) return undefined;

  const wantMin = corner === "top-left";
  const targetRow = wantMin
    ? Math.min(...buttons.map((c) => c.row))
    : Math.max(...buttons.map((c) => c.row));
  const rowButtons = buttons.filter((c) => c.row === targetRow);
  const targetColumn = wantMin
    ? Math.min(...rowButtons.map((c) => c.column))
    : Math.max(...rowButtons.map((c) => c.column));
  return rowButtons.find((c) => c.column === targetColumn)?.index;
};
