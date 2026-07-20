export type SoundtrackId = 'menu' | 'match' | 'boss';
export type UiSampleId = 'select' | 'navigate' | 'confirm' | 'open' | 'close' | 'toggle' | 'error';

export const SOUNDTRACK_URLS: Readonly<Record<SoundtrackId, string>> = Object.freeze({
  menu: './assets/audio/music/blood-league-menu.mp3',
  match: './assets/audio/music/blood-league-match.mp3',
  boss: './assets/audio/music/blood-league-boss.mp3',
});

export const UI_SAMPLE_URLS: Readonly<Record<UiSampleId, string>> = Object.freeze({
  select: './assets/audio/ui/select.ogg',
  navigate: './assets/audio/ui/navigate.ogg',
  confirm: './assets/audio/ui/confirm.ogg',
  open: './assets/audio/ui/open.ogg',
  close: './assets/audio/ui/close.ogg',
  toggle: './assets/audio/ui/toggle.ogg',
  error: './assets/audio/ui/error.ogg',
});

export const AUDIO_ASSET_IDS = Object.freeze([
  ...Object.keys(SOUNDTRACK_URLS).map((id) => `music:${id}`),
  ...Object.keys(UI_SAMPLE_URLS).map((id) => `ui:${id}`),
]);
