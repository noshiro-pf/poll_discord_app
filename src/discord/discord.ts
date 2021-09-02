import { promiseToResult, Result } from '@noshiro/ts-utils';
import { Client as DiscordClient } from 'discord.js';
import type { Client as PsqlClient } from 'pg';
import { triggerCommand } from '../constants';
import { DISCORD_TOKEN } from '../env';
import type { DatabaseRef } from '../types/types';
import { onMessageReactionAdd, onMessageReactionRemove } from './reaction';
import { sendMessageMain } from './send-poll-message';
import { updatePollTitle } from './update-poll-title';

export const initDiscordClient = (): Promise<Result<DiscordClient, unknown>> =>
  new Promise((resolveAll) => {
    const discordClient = new DiscordClient({
      partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    });

    Promise.all([
      new Promise<Result<undefined, undefined>>((resolve) => {
        discordClient.once('ready', () => {
          discordClient.user
            ?.setActivity({
              name: `${triggerCommand.rp},${triggerCommand.rp30},${triggerCommand.rp60},${triggerCommand.gp},${triggerCommand.rand}`,
              type: 'PLAYING',
            })
            .then(() => {
              resolve(Result.ok(undefined));
            })
            .catch((err) => {
              resolve(Result.err(err));
            });
        });
      }),
      promiseToResult(discordClient.login(DISCORD_TOKEN)),
    ])
      .then(([ready, login]) => {
        if (Result.isErr(ready)) {
          resolveAll(Result.err(ready));
        } else {
          if (Result.isErr(login)) {
            resolveAll(Result.err(login));
          } else {
            resolveAll(Result.ok(discordClient));
          }
        }
      })
      .catch(() => {
        resolveAll(Result.err(undefined));
      });
  });

export const startDiscordListener = (
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  discordClient: DiscordClient,
  // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
  psqlClient: PsqlClient,
  databaseRef: DatabaseRef
): void => {
  discordClient.on('messageReactionAdd', (reaction, user) => {
    onMessageReactionAdd(databaseRef, psqlClient, reaction, user)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on messageReactionAdd error:', result);
        }
      })
      .catch(console.error);
  });

  discordClient.on('messageReactionRemove', (reaction, user) => {
    onMessageReactionRemove(databaseRef, psqlClient, reaction, user)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on messageReactionRemove error:', result);
        }
      })
      .catch(console.error);
  });

  discordClient.on('messageUpdate', (_oldMessage, newMessage) => {
    updatePollTitle(databaseRef, psqlClient, newMessage)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on message error:', result);
        }
      })
      .catch(console.error);
  });

  discordClient.on('message', (message) => {
    sendMessageMain(databaseRef, psqlClient, message)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on message error:', result);
        }
      })
      .catch(console.error);
  });
};
