# React SaaS App

A SaaS application that uses Azure AD (Microsoft Entra ID) for authentication and Azure SQL Database for subscription management.

## Prerequisites

- Node.js (v14 or higher)
- Azure subscription
- Azure AD application registration
- Azure SQL Database
- Azure CLI (for local development)

## Environment Setup

### 1. Create Environment File

Create a `.env` file in the root directory of the project:

```bash
cp .env.example .env  # If .env.example exists, or create it manually
```

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```env
# Azure AD Authentication
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Application Settings
BASE_URL=http://localhost:3000
SESSION_SECRET=your-random-session-secret
PORT=3000

# Azure SQL Database
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=your-database-name

# Environment
IS_LOCAL=true
```

## Environment Variables Explained

### Azure AD Authentication Variables

#### `AZURE_CLIENT_ID` (Required)
- **Purpose**: The Application (client) ID from your Azure AD app registration
- **How to get it**: 
  1. Go to Azure Portal → Azure Active Directory → App registrations
  2. Select your application
  3. Copy the "Application (client) ID" from the Overview page
- **Example**: `12345678-1234-1234-1234-123456789abc`

#### `AZURE_CLIENT_SECRET` (Required)
- **Purpose**: The client secret used to authenticate your application with Azure AD
- **How to get it**: 
  1. In your app registration → Certificates & secrets
  2. Click "New client secret"
  3. Add a description and expiration period
  4. Copy the **Value** (not the Secret ID) immediately after creation
- **Example**: `abc123~XyZ789.qwerty-ASDFGH_12345`
- **⚠️ Important**: Store this securely! It's only shown once when created.

#### `AZURE_TENANT_ID` (Required)
- **Purpose**: Your Azure AD tenant (directory) ID - identifies which Azure AD instance to use for authentication
- **How to get it**: 
  1. Azure Portal → Azure Active Directory → Overview
  2. Copy the "Tenant ID" (also called Directory ID)
- **Example**: `87654321-4321-4321-4321-210987654321`
- **Used for**: MSAL authentication authority URL and logout redirect

### Application Settings

#### `BASE_URL` (Required)
- **Purpose**: The base URL where your application is hosted
- **Local development**: `http://localhost:3000`
- **Production**: Your actual domain (e.g., `https://yourdomain.com`)
- **Used for**: 
  - OAuth redirect URI configuration
  - Logout redirect
  - Any absolute URL generation in the app
- **⚠️ Important**: This URL must be registered in your Azure AD app registration's redirect URIs

#### `SESSION_SECRET` (Required for Production)
- **Purpose**: Secret key used to sign and encrypt session cookies
- **How to generate**: Use a random, secure string
  ```bash
  # Generate a random secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **⚠️ Important**: Use a strong, random value in production. Never commit this to version control!

#### `PORT` (Optional)
- **Purpose**: The port number on which the Express server will listen
- **Default**: `3000` (if not specified)
- **Example**: `3000`, `8080`, `5000`
- **Note**: Must match the port in your `BASE_URL` if running locally

### Azure SQL Database Variables

#### `AZURE_SQL_SERVER` (Required)
- **Purpose**: The fully qualified domain name of your Azure SQL Server
- **How to get it**: 
  1. Azure Portal → SQL databases → Select your database
  2. On the Overview page, find "Server name"
- **Format**: `your-server-name.database.windows.net`
- **Example**: `mycompany-sql-server.database.windows.net`
- **⚠️ Important**: Do NOT include `tcp:` prefix or port number

#### `AZURE_SQL_DATABASE` (Required)
- **Purpose**: The name of your specific database on the SQL Server
- **How to get it**: The database name shown in Azure Portal
- **Example**: `SaaSSubscriptions`, `ProductionDB`
- **Note**: This database should contain a `Subscriptions` table with columns:
  - `PurchaserTenantId` (NVarChar)
  - `IsActive` (bit/boolean)

### Environment Configuration

#### `IS_LOCAL` (Required)
- **Purpose**: Determines the authentication method for connecting to Azure SQL Database
- **Values**: 
  - `true` - Uses Azure CLI credentials (for local development)
  - `false` or undefined - Uses Managed Identity (for Azure-hosted environments)
- **Local development**: `true`
- **Production/Azure**: `false` or remove this variable
- **Important for local development**: 
  - You must be logged in via Azure CLI: `az login`
  - Your Azure account must have appropriate database permissions

## Azure AD App Registration Configuration

Your Azure AD app registration must be configured with:

1. **Redirect URIs** (Authentication → Platform configurations → Web):
   - `http://localhost:3000/redirect` (for local development)
   - `https://yourdomain.com/redirect` (for production)

2. **API Permissions**:
   - Microsoft Graph:
     - `User.Read`
     - `openid`
     - `profile`
     - `email`

3. **Implicit grant and hybrid flows**: (Optional, not required for this app)

## Database Setup

The application expects a `Subscriptions` table in your Azure SQL Database:

```sql
CREATE TABLE [dbo].[Subscriptions] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [PurchaserTenantId] NVARCHAR(255) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    -- Add other fields as needed
);
```

## Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Login to Azure CLI** (for database access):
   ```bash
   az login
   ```

3. **Set up your `.env` file** with all required variables

4. **Build the application**:
   ```bash
   npm run build
   ```

5. **Start the development server**:
   ```bash
   npm start
   ```

6. **Access the application**:
   - Open your browser to `http://localhost:3000`

## Production Deployment

When deploying to Azure (App Service, Container Apps, etc.):

1. Set all environment variables as Application Settings in Azure
2. Set `IS_LOCAL=false` or remove it entirely
3. Enable Managed Identity for your Azure service
4. Grant the Managed Identity access to your Azure SQL Database
5. Ensure `BASE_URL` matches your production domain
6. Use a strong, unique `SESSION_SECRET`
7. Update your Azure AD app registration redirect URIs to include production URLs

## Security Notes

- **Never commit `.env` file to version control** - add it to `.gitignore`
- **Rotate secrets regularly**, especially `AZURE_CLIENT_SECRET` and `SESSION_SECRET`
- **Use HTTPS in production** - set `cookie: { secure: true }` in session configuration
- **Restrict API permissions** to minimum required scopes
- **Use Azure Key Vault** for production secrets management (recommended)

## Troubleshooting

### "Failed to get auth url"
- Check that `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_TENANT_ID` are correct
- Verify your Azure AD app registration is active

### Database connection errors
- Local: Ensure you're logged in with `az login` and have database access
- Production: Verify Managed Identity is enabled and has database permissions
- Check that `AZURE_SQL_SERVER` and `AZURE_SQL_DATABASE` are correct

### "No subscription" page
- Verify the `Subscriptions` table exists in your database
- Check that the tenant ID has an active subscription record
- Ensure the database query is returning expected results

## Support

For issues or questions, please check the Azure documentation:
- [Azure AD App Registration](https://docs.microsoft.com/azure/active-directory/develop/quickstart-register-app)
- [MSAL Node](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [Azure SQL Database](https://docs.microsoft.com/azure/azure-sql/database/)

