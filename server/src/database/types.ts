import { PoolClient, QueryResultRow } from "pg";

export type QueryParams = any[];

export interface ISqlExecutor {
  query<T extends QueryResultRow = any>(sql: string, params?: QueryParams): Promise<T[]>;
  queryOne<T extends QueryResultRow = any>(sql: string, params?: QueryParams): Promise<T | null>;
  execute(sql: string, params?: QueryParams): Promise<number>;
}

export type TransactionCallback<T> = (client: ISqlExecutor & { rawClient: PoolClient }) => Promise<T>;
