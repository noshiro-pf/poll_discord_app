import { JsonType, promiseToResult, Result } from '@noshiro/ts-utils';
import { Client as PsqlClient } from 'pg';
import { psqlRowId, psqlRowType, psqlTableName } from './constants';
import { createIDatabase } from './types/database';
import { PsqlRow } from './types/types';

// eslint-disable-next-line @typescript-eslint/no-namespace
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

  export const getJsonData = async (
    psqlClient: PsqlClient
  ): Promise<Result<PsqlRow, unknown>> => {
    const query = `select * from ${psqlTableName};`;
    return new Promise((resolve) => {
      psqlClient.query(query, (error, res) => {
        if (error) {
          resolve(Result.err(error));
        } else {
          resolve(Result.ok(res.rows[0] as PsqlRow));
        }
      });
    });
  };

  export const setJsonData = async (
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
        if (error) {
          resolve(Result.err(error));
        } else {
          resolve(Result.ok(undefined));
        }
      });
    });
  };

  export const hasRecordOfId = async (
    psqlClient: PsqlClient,
    recordId: string
  ): Promise<Result<boolean, unknown>> => {
    const query = `select count(*) from ${psqlTableName} where ${psqlRowType.id} = '${recordId}';`;
    return new Promise((resolve) => {
      psqlClient.query(query, (error, res) => {
        if (error) {
          resolve(Result.err(error));
        } else {
          resolve(
            Result.ok(Number((res.rows[0] as { count: string }).count) > 0)
          );
        }
      });
    });
  };

  export const createRecord = async (
    psqlClient: PsqlClient,
    recordId: string
  ): Promise<Result<undefined, unknown>> => {
    const query = `insert into ${psqlTableName} ( ${psqlRowType.data}, ${
      psqlRowType.updated_at
    }, ${psqlRowType.id} ) values ( '${JSON.stringify(
      createIDatabase().toJS()
    )}', current_timestamp, '${recordId}' );`;
    return new Promise((resolve) => {
      psqlClient.query(query, (error) => {
        if (error) {
          resolve(Result.err(error));
        } else {
          resolve(Result.ok(undefined));
        }
      });
    });
  };

  export const closeConnection = async (
    psqlClient: PsqlClient
  ): Promise<Result<void, unknown>> => promiseToResult(psqlClient.end());
}
