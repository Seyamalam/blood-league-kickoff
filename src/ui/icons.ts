export type UiIconName =
  | 'play'
  | 'calendar'
  | 'trophy'
  | 'career'
  | 'settings'
  | 'close'
  | 'resume'
  | 'restart'
  | 'home'
  | 'loadout'
  | 'stats'
  | 'seed'
  | 'back'
  | 'ball'
  | 'heal'
  | 'shield'
  | 'power'
  | 'bolt'
  | 'target';

const ICON_PATHS: Readonly<Record<UiIconName, string>> = Object.freeze({
  play: '<path d="m8 5 11 7-11 7Z"/>',
  calendar: '<path d="M5 4h14v16H5zM8 2v4m8-4v4M5 9h14"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v5m-4 2h8"/>',
  career: '<path d="M12 3 4 7v6c0 4 3 7 8 8 5-1 8-4 8-8V7Zm0 4v10m-4-6h8"/>',
  settings:
    '<path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0-5 1 2.2 2.4.6 2-1.2 1.5 1.5-1.2 2 .6 2.4 2.2 1-2.2 1-.6 2.4 1.2 2-1.5 1.5-2-1.2-2.4.6-1 2.2-1-2.2-2.4-.6-2 1.2-1.5-1.5 1.2-2-.6-2.4-2.2-1 2.2-1 .6-2.4-1.2-2 1.5-1.5 2 1.2 2.4-.6Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  resume: '<path d="m9 6 9 6-9 6Z"/>',
  restart: '<path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 7"/>',
  home: '<path d="m3 11 9-8 9 8M6 9v11h12V9m-8 11v-6h4v6"/>',
  loadout: '<path d="M5 4h14v5H5zm0 11h14v5H5zM8 9v6m8-6v6"/>',
  stats: '<path d="M5 20v-7h3v7zm6 0V4h3v16zm6 0v-11h3v11z"/>',
  seed: '<path d="M12 21c0-7 2-12 7-16-7 1-11 5-11 10 0 3 2 5 4 6Zm0 0c0-5-2-8-6-10"/>',
  back: '<path d="m15 18-6-6 6-6M9 12h11"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-2 5h-4l-2-5Zm-7 2 3 1m8 0 3-1m-9 6-2 4m6-4 2 4"/>',
  heal: '<path d="M12 21S4 17 4 10a4 4 0 0 1 7-3 4 4 0 0 1 7 3c0 7-6 11-6 11Z"/><path d="M9 12h6m-3-3v6"/>',
  shield: '<path d="m12 3 7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z"/>',
  power: '<path d="M12 2v10m5.7-6.7a9 9 0 1 1-11.4 0"/>',
  bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7Z"/>',
  target:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
});

export function uiIcon(name: UiIconName): string {
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`;
}
