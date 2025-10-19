import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { ConfidentialClientApplication } from "@azure/msal-node";
import path from "path";
import sql from "mssql";
import { getConnection } from "./db/db";
import { loadHtml } from "./util/load-html";

dotenv.config();

const {
  AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET,
  AZURE_TENANT_ID,
  BASE_URL,
  SESSION_SECRET,
} = process.env;

const app = express();

// static assets
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// session
app.use(
  session({
    secret: SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // in production set secure: true (HTTPS)
  })
);

// MSAL configuration
const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    clientSecret: AZURE_CLIENT_SECRET!,
  },
});


app.get("/", async (_req, res) => {
  // Serve static index.html
  const html = await loadHtml("index.html");
  res.type("html").send(html);
});

// Step 1: Redirect user to Microsoft login
app.get("/login", async (_req, res) => {
  console.log("login");
  try {
    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: ["openid", "profile", "email", "User.Read"],
      redirectUri: `${BASE_URL}/redirect`,
    });
    res.redirect(authUrl);
  } catch (err) {
    console.error("Failed to get auth url", err);
    const html = await loadHtml("error.html");
    res.status(500).type("html").send(html);
  }
});

// Step 2: Handle redirect from Azure AD
app.get("/redirect", async (req, res) => {
  console.log("redirect");
  const tokenRequest = {
    code: req.query.code as string,
    scopes: ["openid", "profile", "email", "User.Read"],
    redirectUri: `${BASE_URL}/redirect`,
  };

  try {
    const response = await msalClient.acquireTokenByCode(tokenRequest);
    // store account and tokens in session
    (req as any).session.user = response.account;
    (req as any).session.accessToken = response.accessToken;
    res.redirect("/profile");
  } catch (err) {
    console.error("acquireTokenByCode failed", err);
    const html = await loadHtml("error.html");
    res.status(500).type("html").send(html);
  }
});

// Step 3: Show logged-in user profile
app.get("/profile", async (req, res) => {
  console.log("profile");
  const sessionAny = (req as any).session;
  const user = sessionAny?.user;
  if (!user) return res.redirect("/login");

  try {
    let html = await loadHtml("profile.html");

    // If tenant id exists in account or idTokenClaims, try to get tid
    const tenantId =
      (user.idTokenClaims && (user.idTokenClaims.tid as string)) ||
      (user.homeAccountId ? user.homeAccountId.split(".")[1] : "") ||
      "";

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("tenant_id", sql.NVarChar, tenantId)
      .query(`select * from [dbo].[Subscriptions] where PurchaserTenantId = '${tenantId}' and IsActive = 'true'`)

    if (result.recordset.length === 0) {
      return res.redirect("/no-subscription");
    }

    // Replace placeholders safely (simple, server-side)
    const displayName = (user.name as string) || (user.username as string) || "User";
    const username = (user.username as string) || (user.name as string) || "";


    html = html.replace(/{{displayName}}/g, escapeHtml(displayName));
    html = html.replace(/{{username}}/g, escapeHtml(username));
    html = html.replace(/{{tenantId}}/g, escapeHtml(tenantId));

    res.type("html").send(html);
  } catch (err) {
    console.error("Failed to render profile", err);
    const html = await loadHtml("error.html");
    res.status(500).type("html").send(html);
  }
});

// Logout
app.get("/logout", (req, res) => {
  const logoutUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(process.env.BASE_URL || '')}`;

  (req as any).session.destroy((err: any) => {
    if (err) console.error("Session destroy error:", err);
    res.redirect(logoutUrl);
  });
});

app.get("/no-subscription", async (req, res) => {
  const user = (req as any).session?.user;
  const displayName = user?.name || user?.username || "User";
  const tenantId =
    (user?.idTokenClaims && user.idTokenClaims.tid) ||
    (user?.homeAccountId ? user.homeAccountId.split(".")[1] : "") ||
    "";

  let html = await loadHtml("no-subscription.html");
  html = html.replace(/{{displayName}}/g, escapeHtml(displayName));
  html = html.replace(/{{tenantId}}/g, escapeHtml(tenantId));

  res.type("html").send(html);
});

// simple HTML escape to avoid injection
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => console.log(`Server running at ${BASE_URL || `http://localhost:${port}`}`));
