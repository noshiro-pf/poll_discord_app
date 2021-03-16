export const replyTriggerCommand = '/rp';

export const emojis = {
  ok: { unicode: '⭕', name: ':o:' },
  neither: { unicode: '🔺', name: ':small_red_triangle:' },
  ng: { unicode: '❌', name: ':x:' },
} as const;

export const thumbnailUrl =
  'https://github.com/noshiro-pf/poll_discord_app/blob/main/src/assets/calendar_icon.png?raw=true';

export const paths = {
  dbJson: './db.json',
} as const;
