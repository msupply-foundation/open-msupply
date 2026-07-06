mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::{mock_store_a, mock_user_account_a, MockDataInserts},
        KeyType, KeyValueStoreRepository, SyncVersion, UserAccountRowRepository,
    };
    use serde_json::json;
    use service::user_account::UserAccountService;

    use crate::GeneralQueries;

    /// Cookie-session front-end contract: a successful login returns the user in the same shape
    /// as the `me` query (including the auth timing durations) in a single round trip.
    #[actix_rt::test]
    async fn test_graphql_login_returns_user_and_auth_durations() {
        let (_, connection, _, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_login_returns_user",
            MockDataInserts::none()
                .names()
                .stores()
                .user_accounts()
                .user_store_joins(),
        )
        .await;

        // Give mock_user_account_a a real bcrypt hash so the local credential check passes.
        let hashed = UserAccountService::hash_password("password").unwrap();
        let mut user = mock_user_account_a();
        user.hashed_password = hashed;
        UserAccountRowRepository::new(&connection)
            .upsert_one(&user)
            .unwrap();

        // V7 login with an unreachable central falls back to local hash verification.
        SyncVersion::set(&connection, SyncVersion::V7).unwrap();
        let key_value_store = KeyValueStoreRepository::new(&connection);
        key_value_store
            .set_i32(KeyType::SettingsSyncSiteId, Some(mock_store_a().site_id))
            .unwrap();
        // The resolver reads the central url from sync settings; point it at a closed port.
        key_value_store
            .set_string(
                KeyType::SettingsSyncUrl,
                Some("http://localhost:9998".to_string()),
            )
            .unwrap();
        key_value_store
            .set_string(KeyType::SettingsSyncUsername, Some("site".to_string()))
            .unwrap();
        key_value_store
            .set_string(
                KeyType::SettingsSyncPasswordSha256,
                Some("unused".to_string()),
            )
            .unwrap();
        key_value_store
            .set_i64(KeyType::SettingsSyncIntervalSeconds, Some(300))
            .unwrap();

        let query = r#"query authToken($username: String!, $password: String!) {
            authToken(username: $username, password: $password) {
                ... on AuthToken {
                    __typename
                    user {
                        userId
                        username
                        inactivityTimeoutSeconds
                        tokenRefreshIntervalSeconds
                        stores {
                            totalCount
                            nodes {
                                id
                            }
                        }
                    }
                }
            }
        }"#;

        let variables = json!({
            "username": mock_user_account_a().username,
            "password": "password",
        });

        // Durations come from server configuration; test settings use the defaults (900/60).
        let expected = json!({
            "authToken": {
                "__typename": "AuthToken",
                "user": {
                    "userId": mock_user_account_a().id,
                    "username": mock_user_account_a().username,
                    "inactivityTimeoutSeconds": 900,
                    "tokenRefreshIntervalSeconds": 60,
                    // The front end assumes this is never empty after a successful login
                    // (zero stores on this site → NoSiteAccess error instead).
                    "stores": {
                        "totalCount": 1,
                        "nodes": [{ "id": mock_store_a().id }]
                    }
                }
            }
        });

        assert_graphql_query!(&settings, query, &Some(variables), &expected, None);
    }
}
