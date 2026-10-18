// Locks the SCM (Kudu) and FTP publishing surface of the Mt Cottages apply
// proxy Function App to Microsoft Entra bearer tokens only
// (FocusApiary/infrastructure#509). The app itself is not created here; this
// module attaches the two basic-auth publishing policies to the existing app.
//
//   az deployment group what-if -g mtcottages --template-file infra/azure/apply-proxy-scm.bicep
//   az deployment group create  -g mtcottages --template-file infra/azure/apply-proxy-scm.bicep
//
// `az functionapp deployment source config-zip` (see README.md) switches to the
// Entra token on its own once basic auth is off. SCM is deliberately not
// IP-restricted: operators deploy from workstations with no stable egress IP.
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
