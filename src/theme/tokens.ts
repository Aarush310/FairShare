// Single source of truth for Fairshare colours ("Fresh air": paper white, ink black and greens).
// Mirrored as CSS variables in index.css.
export const colors = {
  paper: "#F3F5F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F8F5",
  line: "rgba(11, 16, 13, 0.08)",
  ink: "#0B100D",
  ink2: "#161E19",
  ink3: "#222C26",
  muted: "#66716A",
  faint: "#9AA49E",
  green: "#17B26A",
  green700: "#0A7D47",
  forest: "#0E4D33",
  mint: "#E3F6EA",
  volt: "#C6F36B",
  amber: "#F5A524",
  danger: "#E5484D",
  dangerSoft: "#FCE8E8",
  dangerInk: "#B42318",
  alert: "#F25C45", // panic button border/accent; button is white, pastel red on hover
  alertSoft: "#FDE9E5",
  alertPastel: "#FDE2DC",
  mintMid: "#86D6B2", // "Your next task" card (ink text; forest green labels)
} as const;
