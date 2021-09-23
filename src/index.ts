/* eslint-disable @typescript-eslint/triple-slash-reference */

/// <reference no-default-lib="true"/>
/// <reference path="./stdlib/lib.dom.d.ts" />
/// <reference path="./stdlib/lib.esnext.d.ts" />
/// <reference path="./stdlib/utils.d.ts" />

import { Result } from '@noshiro/ts-utils';
import { psqlRowId } from './constants';
import { initDiscordClient, startDiscordListener } from './discord/discord';
import { DATABASE_URL, isDev } from './env';
import { initializeInMemoryDatabase } from './in-memory-database';
import { psql } from './postgre-sql';
import { defaultDatabase } from './types/database';
import type { DatabaseRef } from './types/types';

const main = async (): Promise<Result<unknown, unknown>> => {
  psql.setTlsRejectUnauthorized0();

  const databaseRef: DatabaseRef = {
    db: defaultDatabase,
  };

  const [psqlClientResult, discordClientResult] = await Promise.all([
    psql.initClient(isDev ? undefined : DATABASE_URL),
    initDiscordClient(),
  ]);

  if (Result.isErr(psqlClientResult)) {
    console.error('initPsqlClient failed.', psqlClientResult.value);
    return psqlClientResult;
  }
  if (Result.isErr(discordClientResult)) {
    console.error('initDiscordClient failed.', discordClientResult.value);
    return discordClientResult;
  }

  const psqlClient = psqlClientResult.value;
  console.log('PostgreSQL client is ready!');

  const discordClient = discordClientResult.value;
  console.log('Discord client is ready!');

  // initialize psql database
  const hasRecordOfIdResult = await psql.hasRecordOfId(psqlClient, psqlRowId);
  if (Result.isErr(hasRecordOfIdResult)) {
    console.error(
      'psql.hasRecordOfId check failed.',
      hasRecordOfIdResult.value
    );
    return hasRecordOfIdResult;
  }

  if (!hasRecordOfIdResult.value) {
    const res = await psql.createRecord(psqlClient, psqlRowId);
    if (Result.isErr(res)) {
      console.error('psql.createRecord failed.', res.value);
      return res;
    }
    console.log(`created record with id ${psqlRowId}`);
  }

  const initDbResult = await initializeInMemoryDatabase(
    databaseRef,
    psqlClient
  );

  if (Result.isErr(initDbResult)) {
    console.error('initDbResult failed.', initDbResult.value);
    return initDbResult;
  }
  console.log('In-Memory DB is ready');

  startDiscordListener(discordClient, psqlClient, databaseRef);

  return Result.ok(undefined);
};

main()
  .then((res) => {
    if (Result.isErr(res)) {
      process.exit(1);
    }
  })
  .catch(() => undefined);
