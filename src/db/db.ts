import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();

async function getToken() {
  const tokenResponse = await credential.getToken("https://database.windows.net/.default");
  return tokenResponse.token;
}

export async function getConnection() {
  const accessToken = await getToken();

  const config: sql.config = {
    server: process.env.AZURE_SQL_SERVER!, // e.g. my-saas-db.database.windows.net
    database: process.env.AZURE_SQL_DATABASE!,
    authentication: {
      type: "azure-active-directory-access-token",
      options: { token: accessToken },
    },
    options: {
      encrypt: true,
    },
  };

  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  return pool;
}
