import { isDev } from './env';

export const triggerCommand = {
  rp: isDev ? '/rpdev' : '/rp',
  rp30: isDev ? '/rp30dev' : '/rp30',
  rp60: isDev ? '/rp60dev' : '/rp60',
  rp30d: isDev ? '/rp30ddev' : '/rp30d',
  rp60d: isDev ? '/rp60ddev' : '/rp60d',
  gp: isDev ? '/gpdev' : '/gp',
  rand: isDev ? '/randdev' : '/rand',
} as const;

export const emojis = {
  ok: { unicode: '⭕', name: ':o:' },
  neither: { unicode: '🔺', name: ':small_red_triangle:' },
  ng: { unicode: '❌', name: ':x:' },
  refresh: { unicode: '🔄', name: ':arrows_counterclockwise:' },
} as const;

export const embedMessageColor = '#3e68b0';

export const thumbnailUrl =
  'https://github.com/noshiro-pf/poll_discord_app/blob/main/src/assets/calendar_icon.png?raw=true';

export const footerText = 'Last Update';

// export const paths = {
//   dbJson: './db.json',
// } as const;

// psql
export const psqlTableName = 'main';
export const psqlRowType = {
  id: 'id',
  data: 'data',
  updated_at: 'updated_at',
} as const;

export const psqlRowId = '2021-03-20_16:35';
