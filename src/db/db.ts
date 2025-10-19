import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();

async function getToken() {
  const tokenResponse = await credential.getToken("https://database.windows.net/.default");
  console.log("Got token from managed identity:", tokenResponse?.token?.substring(0, 20) + "...");
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

  const result = await pool.request().query(`SELECT USER_NAME() AS current_user`);
console.log("SQL sees user as:", result.recordset[0].current_user);
  return pool;
}
