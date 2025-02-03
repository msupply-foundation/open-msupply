pub(super) const AUTH_QUERY: &str = r#"
query AuthToken($username: String!, $password: String) {
  root: authToken(password: $password, username: $username) {
    ... on AuthToken {
      __typename
      token
    }
    ... on AuthTokenError {
      __typename
      error {
        description
      }
    }
  }
}
"#;
