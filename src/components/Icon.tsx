/**
 * EDX icon set (68 icons) - same artwork as edx-decals-webpack/js/icons.js.
 * 24px grid, 2px stroke, square caps, mitre joins, octagons instead of circles. Colour = currentColor.
 */
const ICONS = {
  home: ["M3 11l9-8 9 8", "M5 9v12h14V9", "M10 21v-6h4v6"],
  bag: ["M4 8h16v13H4z", "M8 8V3h8v5"],
  scissors: ["M5 3l14 14", "M19 3L5 17", "M3 15h4v4H3z", "M17 15h4v4h-4z"],
  pin: ["M12 22L5 13V8l4-5h6l4 5v5z", "M10 8h4v4h-4z"],
  cart: ["M2 3h3l2 12h12l2-9H6", "M8 19h2v2H8z", "M16 19h2v2h-2z"],
  mail: ["M3 5h18v14H3z", "M3 5l9 8 9-8"],
  phone: ["M7 2h10v20H7z", "M11 18h2"],
  share: ["M3 10h4v4H3z", "M17 3h4v4h-4z", "M17 17h4v4h-4z", "M7 11l10-6", "M7 13l10 6"],
  grid: ["M3 3h8v8H3z", "M13 3h8v8h-8z", "M3 13h8v8H3z", "M13 13h8v8h-8z"],
  package: ["M3 7l9-4 9 4v10l-9 4-9-4z", "M3 7l9 4 9-4", "M12 11v10"],
  inbox: ["M3 13l3-9h12l3 9v8H3z", "M3 13h5l1 3h6l1-3h5"],
  message: ["M3 4h18v13H10l-5 4v-4H3z", "M8 9h8", "M8 12h5"],
  users: ["M5 4h6v6H5z", "M1 21v-3l3-4h8l3 4v3z", "M15 4h5v6h-5", "M18 14l4 4v3h-4"],
  user: ["M8 3h8v8H8z", "M4 21v-3l3-4h10l3 4v3z"],
  tag: ["M3 3h9l9 9-9 9-9-9z", "M7 7h2v2H7z"],
  clipboard: ["M5 4h14v18H5z", "M9 2h6v4H9z", "M9 11h6", "M9 15h6"],
  receipt: ["M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z", "M9 8h6", "M9 12h6"],
  chart: ["M3 3v18h18", "M7 15l4-4 3 3 6-7"],
  swatch: ["M3 3h8v18H3z", "M11 8l5.5-5L21 7.5 9 21", "M6 17h2"],
  percent: ["M19 5L5 19", "M5 5h4v4H5z", "M15 15h4v4h-4z"],
  "credit-card": ["M3 5h18v14H3z", "M3 10h18", "M7 15h4"],
  truck: ["M2 5h12v12H2z", "M14 9h4l4 4v4h-8", "M5 17h2v3H5z", "M17 17h2v3h-2z"],
  layers: ["M12 3l9 5-9 5-9-5z", "M3 12l9 5 9-5", "M3 16l9 5 9-5"],
  bolt: ["M13 2L4 14h7l-1 8 9-12h-7z"],
  "log-in": ["M15 3h6v18h-6", "M10 7l5 5-5 5", "M15 12H3"],
  "log-out": ["M9 3H3v18h6", "M16 7l5 5-5 5", "M21 12H9"],
  settings: ["M3 6h18", "M3 12h18", "M3 18h18", "M14 3h3v6h-3z", "M7 9h3v6H7z", "M15 15h3v6h-3z"],
  menu: ["M3 6h18", "M3 12h18", "M3 18h18"],
  search: ["M7 3h6l4 4v6l-4 4H7l-4-4V7z", "M16 16l5 5"],
  filter: ["M3 4h18l-7 9v8l-4-2v-6z"],
  sort: ["M8 4v16", "M4 8l4-4 4 4", "M16 20V4", "M12 16l4 4 4-4"],
  plus: ["M12 5v14", "M5 12h14"],
  minus: ["M5 12h14"],
  check: ["M4 12l6 6L20 6"],
  x: ["M5 5l14 14", "M19 5L5 19"],
  trash: ["M4 6h16", "M9 6V3h6v3", "M6 6l1 15h10l1-15", "M10 11v6", "M14 11v6"],
  edit: ["M4 20l1-5L16 4l4 4L9 19z", "M14 6l4 4"],
  save: ["M4 3h13l3 3v15H4z", "M8 3v6h8V3", "M8 21v-7h8v7"],
  copy: ["M8 8h13v13H8z", "M16 8V3H3v13h5"],
  download: ["M12 3v12", "M6 10l6 6 6-6", "M4 21h16"],
  upload: ["M12 17V5", "M6 10l6-6 6 6", "M4 21h16"],
  image: ["M3 4h18v16H3z", "M3 16l5-5 4 4 3-3 6 6", "M14 8h3v3h-3z"],
  archive: ["M3 4h18v5H3z", "M5 9v12h14V9", "M10 13h4"],
  undo: ["M9 14L4 9l5-5", "M4 9h12l4 4v7"],
  "external-link": ["M14 3h7v7", "M21 3l-9 9", "M18 14v7H3V6h7"],
  eye: ["M2 12l5-6h10l5 6-5 6H7z", "M10 10h4v4h-4z"],
  "eye-off": ["M2 12l5-6h10l5 6-5 6H7z", "M10 10h4v4h-4z", "M3 3l18 18"],
  lock: ["M5 11h14v10H5z", "M8 11V6l2-3h4l2 3v5"],
  star: ["M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2l-5-4.9 6.9-1z"],
  more: ["M4 11h2v2H4z", "M11 11h2v2h-2z", "M18 11h2v2h-2z"],
  "arrow-up": ["M12 20V4", "M5 11l7-7 7 7"],
  "arrow-down": ["M12 4v16", "M5 13l7 7 7-7"],
  "arrow-left": ["M20 12H4", "M11 5l-7 7 7 7"],
  "arrow-right": ["M4 12h16", "M13 5l7 7-7 7"],
  "chevron-up": ["M5 15l7-7 7 7"],
  "chevron-down": ["M5 9l7 7 7-7"],
  "chevron-left": ["M15 5l-7 7 7 7"],
  "chevron-right": ["M9 5l7 7-7 7"],
  calendar: ["M3 5h18v16H3z", "M3 10h18", "M8 3v4", "M16 3v4"],
  clock: ["M8 3h8l5 5v8l-5 5H8l-5-5V8z", "M12 7v5l3 3"],
  sun: ["M10 7h4l3 3v4l-3 3h-4l-3-3v-4z", "M12 1v3", "M12 20v3", "M1 12h3", "M20 12h3", "M4.2 4.2l2.1 2.1", "M17.7 17.7l2.1 2.1", "M4.2 19.8l2.1-2.1", "M17.7 6.3l2.1-2.1"],
  moon: ["M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"],
  "text-size": ["M2 20L8 4l6 16", "M4 15h8", "M16 20l3-8 3 8", "M17 18h4"],
  bell: ["M6 17v-7a6 6 0 0 1 12 0v7l2 2H4z", "M10 21h4"],
  info: ["M8 3h8l5 5v8l-5 5H8l-5-5V8z", "M12 11v6", "M12 7h.01"],
  "alert-triangle": ["M12 3l10 18H2z", "M12 10v5", "M12 18h.01"],
  "alert-octagon": ["M8 3h8l5 5v8l-5 5H8l-5-5V8z", "M12 7v6", "M12 16.5h.01"],
  "check-octagon": ["M8 3h8l5 5v8l-5 5H8l-5-5V8z", "M8 12l3 3 5-6"]
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({ name, size, label, className }: { name: IconName; size?: "sm" | "lg" | "xl"; label?: string; className?: string }) {
  const cls = ["icon", size ? `icon-${size}` : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <svg className={cls} viewBox="0 0 24 24" aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label} focusable="false">
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
