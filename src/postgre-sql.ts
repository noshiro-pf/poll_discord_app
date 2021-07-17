import type { JsonType } from '@noshiro/ts-utils';
import { promiseToResult, Result } from '@noshiro/ts-utils';
import { Client as PsqlClient } from 'pg';
import { psqlRowId, psqlRowType, psqlTableName } from './constants';
import { defaultDatabase } from './types/database';
import type { PsqlRow } from './types/types';

const isTruthy = (a: unknown): boolean => Boolean(a);

export namespace psql {
  export const setTlsRejectUnauthorized0 = (): void => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  };

  export const initClient = async (
    connectionString: string | undefined
  ): Promise<Result<PsqlClient, unknown>> => {
    const psqlClient = new PsqlClient({
      connectionString: connectionString,
      ssl: true,
    });

    const res = await promiseToResult(psqlClient.connect());

    return Result.isOk(res) ? Result.ok(psqlClient) : Result.err(res.value);
  };

  export const getJsonData = (
    // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
    psqlClient: PsqlClient
  ): Promise<Result<PsqlRow, unknown>> => {
    const query = `select * from ${psqlTableName};`;
    return new Promise((resolve) => {
      psqlClient.query(query, (error, res) => {
        if (isTruthy(error)) {
          resolve(Result.err(error));
        } else {
          resolve(Result.ok(res.rows[0] as PsqlRow));
        }
      });
    });
  };

  export const setJsonData = (
    // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
    psqlClient: PsqlClient,
    jsonData: JsonType
  ): Promise<Result<undefined, unknown>> => {
    const query = `update ${psqlTableName} SET ${
      psqlRowType.data
    } = '${JSON.stringify(jsonData)}', ${
      psqlRowType.updated_at
    } = current_timestamp where ${psqlRowType.id} = '${psqlRowId}';`;
    return new Promise((resolve) => {
      psqlClient.query(query, (error) => {
        if (isTruthy(error)) {
          resolve(Result.err(error));
        } else {
          resolve(Result.ok(undefined));
        }
      });
    });
  };

  export const hasRecordOfId = (
    // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
    psqlClient: PsqlClient,
    recordId: string
  ): Promise<Result<boolean, unknown>> => {
    const query = `select count(*) from ${psqlTableName} where ${psqlRowType.id} = '${recordId}';`;
    return new Promise((resolve) => {
      psqlClient.query(query, (error, res) => {
        if (isTruthy(error)) {
          resolve(Result.err(error));
        } else {
          resolve(
            Result.ok(Number((res.rows[0] as { count: string }).count) > 0)
          );
        }
      });
    });
  };

  export const createRecord = (
    // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
    psqlClient: PsqlClient,
    recordId: string
  ): Promise<Result<undefined, unknown>> => {
    const query = `insert into ${psqlTableName} ( ${psqlRowType.data}, ${
      psqlRowType.updated_at
    }, ${psqlRowType.id} ) values ( '${JSON.stringify(
      defaultDatabase
    )}', current_timestamp, '${recordId}' );`;
    return new Promise((resolve) => {
      psqlClient.query(query, (error) => {
        if (isTruthy(error)) {
          resolve(Result.err(error));
        } else {
          resolve(Result.ok(undefined));
        }
      });
    });
  };

  export const closeConnection = (
    // eslint-disable-next-line noshiro-custom/prefer-readonly-parameter-types
    psqlClient: PsqlClient
  ): Promise<Result<void, unknown>> => promiseToResult(psqlClient.end());
}
