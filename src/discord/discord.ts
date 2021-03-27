import { promiseToResult, Result } from '@noshiro/ts-utils';
import { Client as DiscordClient } from 'discord.js';
import { Client as PsqlClient } from 'pg';
import { replyTriggerCommand } from '../constants';
import { DISCORD_TOKEN } from '../env';
import { DatabaseRef } from '../types/types';
import { onMessageReactionAdd, onMessageReactionRemove } from './reaction';
import { sendPollMessage } from './send-poll-message';
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
              name: replyTriggerCommand,
              type: 'PLAYING',
            })
            .then(() => resolve(Result.ok(undefined)))
            .catch((err) => resolve(Result.err(err)));
        });
      }),
      promiseToResult(discordClient.login(DISCORD_TOKEN)),
    ])
      .then(([ready, login]) =>
        Result.isErr(ready)
          ? resolveAll(Result.err(ready))
          : Result.isErr(login)
          ? resolveAll(Result.err(login))
          : resolveAll(Result.ok(discordClient))
      )
      .catch(() => resolveAll(Result.err(undefined)));
  });

export const startDiscordListener = (
  discordClient: DiscordClient,
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
          console.error('on message erorr:', result);
        }
      })
      .catch(console.error);
  });

  discordClient.on('message', (message) => {
    sendPollMessage(databaseRef, psqlClient, message)
      .then((result) => {
        if (Result.isErr(result)) {
          console.error('on message erorr:', result);
        }
      })
      .catch(console.error);
  });
};
