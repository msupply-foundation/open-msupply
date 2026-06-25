pub const INSTALL_PLUGINS: &str = r#"
mutation Query($fileId: String!) {
  root: centralServer {
    __typename
    plugins {
      installUploadedPlugin(fileId: $fileId) {
        pluginInfo
      }
    }
  }
}"#;

pub const UNINSTALL_PLUGIN: &str = r#"
mutation Query($id: String!) {
  root: centralServer {
    __typename
    plugins {
      uninstallPlugin(id: $id) {
        id
        code
        kind
      }
    }
  }
}"#;

pub const INSTALLED_PLUGINS: &str = r#"
query Query {
  root: centralServer {
    __typename
    plugin {
      installedPlugins {
        nodes {
          id
          code
          version
          kind
        }
      }
    }
  }
}"#;
