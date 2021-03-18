import { isDev } from './env';

export const replyTriggerCommand = isDev ? '/devrp' : '/rp';

export const emojis = {
  ok: { unicode: '⭕', name: ':o:' },
  neither: { unicode: '🔺', name: ':small_red_triangle:' },
  ng: { unicode: '❌', name: ':x:' },
} as const;

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
