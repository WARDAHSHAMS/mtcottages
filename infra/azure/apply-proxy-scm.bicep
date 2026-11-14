// Locks the SCM (Kudu) and FTP publishing surface of the Mt Cottages apply
// proxy Function App to Microsoft Entra bearer tokens only
// (FocusApiary/infrastructure#509). The app itself is not created here; this
// module attaches the two basic-auth publishing policies to the existing app.
//
//   az deployment group what-if -g mtcottages --template-file infra/azure/apply-proxy-scm.bicep
//   az deployment group create  -g mtcottages --template-file infra/azure/apply-proxy-scm.bicep
//
// The GitLab CI job deploy:apply-proxy (see README.md) publishes with the Entra
// token of its certificate service principal, so it needs no basic auth. SCM is
// not IP-restricted here; that is tracked in FocusApiary/infrastructure#529.
targetScope = 'resourceGroup'

@description('Existing Function App that serves the stay application proxy.')
param functionAppName string = 'mtcottages-apply-proxy'

resource functionApp 'Microsoft.Web/sites@2024-11-01' existing = {
  name: functionAppName
}

resource scmBasicAuthPolicy 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-11-01' = {
  parent: functionApp
  name: 'scm'
  properties: {
    allow: false
  }
}

resource ftpBasicAuthPolicy 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-11-01' = {
  parent: functionApp
  name: 'ftp'
  properties: {
    allow: false
  }
  dependsOn: [
    scmBasicAuthPolicy
  ]
}
