export const colors = {
  black: "black",
  blue: "blue",
  light_blue: "light_blue",
  red: "red",
  orange: "orange"
} as const

export type Colors = keyof typeof colors
