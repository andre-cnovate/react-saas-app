import { AzureCliCredential, ManagedIdentityCredential } from "@azure/identity";
import sql from "mssql";

function getAzureCredential() {
  const IS_LOCAL = process.env.IS_LOCAL;
  if (!IS_LOCAL) {
    console.log("🔐 Using Managed Identity for authentication");
    return new ManagedIdentityCredential();
  }

  console.log("💻 Using Azure CLI credential (local)");
  return new AzureCliCredential();
}


async function getToken() {
  const credential = getAzureCredential();
  const tokenResponse = await credential.getToken("https://database.windows.net/.default");
  return tokenResponse.token;
}

export async function getConnection() {
  const accessToken = await getToken();

  const config: sql.config = {
    server: process.env.AZURE_SQL_SERVER!,
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
