/** Fork-sensitive defaults — edit for this app. */
export const APP_CONFIG = {
  /** Public site URL (GitHub Pages). Used to hide this app in “also see”. */
  appUrl: "https://filcuk.github.io/connection-string-creator/",
  repoUrl: "https://github.com/filcuk/connection-string-creator",
  themeStorageKey: "microapp-theme",
  themeChangeEvent: "microapp-theme-change",
  /**
   * Remote JSON for the footer “also see” menu.
   * Prefer a raw.githubusercontent.com or GitHub Pages URL. Empty = skip fetch.
   */
  alsoSeeUrl:
    "https://raw.githubusercontent.com/filcuk/shared/refs/heads/main/apps/links.json",
  /** Topic filter for the remote also-see list. */
  alsoSeeTopics: ["*"],
  /** When false, local `alsoSee` is never shown. */
  alsoSeeIncludeLocal: false,
  alsoSee: [],
};
