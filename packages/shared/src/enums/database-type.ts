export enum DatabaseType {
  Postgres = 'postgres',
  MSSQL = 'mssql',
}

export const databaseLabels: Record<DatabaseType, string> = {
  [DatabaseType.Postgres]: 'PostgreSQL',
  [DatabaseType.MSSQL]: 'Microsoft SQL Server',
}
