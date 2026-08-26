/**
 * Fork-owned inline SVG icons. Never overwritten by framework sync.
 *
 * Available (app): visibility, visibility-off
 */

import { ICON_ATTRIBUTIONS } from "./icons-framework.js";

/** @typedef {{ viewBox: string, markup: string, attribution?: string, name?: string }} IconSvgDef */
/** @typedef {{ ref: string }} IconRefDef */
/** @typedef {IconSvgDef | IconRefDef} IconDef */

/** @type {Record<string, IconDef>} */
export const APP_ICONS = {
  visibility: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 4C7 4 2.73 7.11 1 11.5C2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4m0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-visibility",
  },
  "visibility-off": {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="M12 6.5c2.76 0 5 2.24 5 5c0 .51-.1 1-.24 1.46l3.06 3.06c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l2.17 2.17c.47-.14.96-.24 1.47-.24M2.71 3.16a.996.996 0 0 0 0 1.41l1.97 1.97A11.9 11.9 0 0 0 1 11.5C2.73 15.89 7 19 12 19c1.52 0 2.97-.3 4.31-.82l2.72 2.72a.996.996 0 1 0 1.41-1.41L4.13 3.16c-.39-.39-1.03-.39-1.42 0M12 16.5c-2.76 0-5-2.24-5-5c0-.77.18-1.5.49-2.14l1.57 1.57c-.03.18-.06.37-.06.57c0 1.66 1.34 3 3 3c.2 0 .38-.03.57-.07L14.14 16c-.65.32-1.37.5-2.14.5m2.97-5.33a2.97 2.97 0 0 0-2.64-2.64z"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-visibility-off",
  },
};
