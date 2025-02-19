pub const INSTALL_PLUGINS: &'static str = r#"
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
