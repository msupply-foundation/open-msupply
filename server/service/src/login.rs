use std::time::{Duration, SystemTime};

use log::info;
use repository::{ActivityLogType, RepositoryError};
use serde::{Deserialize, Serialize};

use crate::{
    activity_log::activity_log_entry,
    apis::central_user_login::{central_user_login, CentralUserLoginError},
    auth_data::AuthData,
    service_provider::ServiceProvider,
    settings::is_develop,
    token::{JWTIssuingError, TokenPair, TokenService},
    user_account::{UserAccountService, VerifyPasswordError},
};

/// Minimum response time on a failed login. Disguises whether the username
/// exists by making "wrong password" and "no such user" indistinguishable by
/// latency. Must be longer than the worst-case bcrypt verify time.
pub const MIN_ERR_RESPONSE_TIME_SEC: u64 = 6;

pub struct LoginService {}

#[derive(Debug)]
pub enum LoginFailure {
    /// Either user does not exist or wrong password
    InvalidCredentials,
    /// User account is blocked due to too many failed login attempts.
    /// No longer produced by the login flow (the OMS Central REST endpoint
    /// does not surface lockouts) but kept as a defensive variant for
    /// downstream consumers.
    AccountBlocked(u64),
    /// User account does not have login rights to any stores on this site
    NoSiteAccess,
}

#[derive(Debug)]
pub enum LoginError {
    LoginFailure(LoginFailure),
    FailedToGenerateToken(JWTIssuingError),
    InternalError(String),
    DatabaseError(RepositoryError),
    MSupplyCentralNotReached,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
    /// Central server url needed to fetch user details during login
    pub central_server_url: String,
}

impl LoginService {
    /// # Arguments:
    /// * `min_err_response_time_sec` min response time if there was a login error. This is to
    ///     disguise any information whether the use exists or not, i.e. response time for invalid
    ///     usernames is indistinguishable from the response time for invalid passwords. This only works
    ///     if the value is high enough, i.e. higher than the server needs to calculate the password
    ///     hash.
    ///
    /// Note, this service takes a ServiceProvider instead of a ServiceContext. The reason is that a
    /// ServiceContext can't be used across async calls (because of the containing thread bound
    /// SqliteConnection). Since we need an async api call to the remote server to fetch user data
    /// we need to create the service context after the call where the compiler can deduce that we are
    /// not passing it to another thread.
    pub async fn login(
        service_provider: &ServiceProvider,
        auth_data: &AuthData,
        input: LoginInput,
        min_err_response_time_sec: u64,
    ) -> Result<TokenPair, LoginError> {
        let now = SystemTime::now();
        match LoginService::do_login(service_provider, auth_data, input).await {
            Ok(result) => Ok(result),
            Err(err) => {
                let elapsed = now.elapsed().unwrap_or(Duration::from_secs(0));
                let minimum = Duration::from_secs(min_err_response_time_sec);
                if elapsed < minimum {
                    tokio::time::sleep(minimum - elapsed).await;
                }

                Err(err)
            }
        }
    }

    /// Local credential check for the OMS Central REST login endpoint.
    ///
    /// Returns `Ok(true)` on a valid match, `Ok(false)` on any credential
    /// failure (unknown user, wrong password, empty stored hash), and `Err`
    /// for genuine server errors. The failure path is padded to
    /// `min_err_response_time_sec` to match the GraphQL login's
    /// timing-attack mitigation.
    pub async fn verify_credentials_on_central(
        service_provider: &ServiceProvider,
        username: &str,
        password: &str,
        min_err_response_time_sec: u64,
    ) -> Result<bool, LoginError> {
        let now = SystemTime::now();
        let result = (|| {
            let service_ctx = service_provider.basic_context()?;
            let user_service = UserAccountService::new(&service_ctx.connection);
            match user_service.verify_password(username, password) {
                Ok(_) => Ok(true),
                Err(VerifyPasswordError::UsernameDoesNotExist)
                | Err(VerifyPasswordError::InvalidCredentials)
                | Err(VerifyPasswordError::EmptyHashedPassword) => Ok(false),
                Err(VerifyPasswordError::DatabaseError(e)) => Err(LoginError::DatabaseError(e)),
                Err(VerifyPasswordError::InvalidCredentialsBackend(_)) => Err(
                    LoginError::InternalError("Failed to read credentials".to_string()),
                ),
            }
        })();

        if matches!(&result, Ok(false) | Err(_)) {
            let elapsed = now.elapsed().unwrap_or(Duration::from_secs(0));
            let minimum = Duration::from_secs(min_err_response_time_sec);
            if elapsed < minimum {
                tokio::time::sleep(minimum - elapsed).await;
            }
        }
        result
    }

    async fn do_login(
        service_provider: &ServiceProvider,
        auth_data: &AuthData,
        input: LoginInput,
    ) -> Result<TokenPair, LoginError> {
        // Ask OMS Central whether the credentials are valid. If central is
        // reachable and replies, that's authoritative. If it's not reachable
        // (network error, legacy mSupply at the configured URL with no such
        // endpoint, etc.), fall back to local hash verification — the user's
        // `password_hash` flows in via the user sync translation, so the local
        // hash is current.
        let mut connection_failure = false;
        match central_user_login(&input.central_server_url, &input.username, &input.password).await
        {
            Ok(()) => {}
            Err(CentralUserLoginError::InvalidCredentials) => {
                return Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials));
            }
            Err(CentralUserLoginError::Unreachable(reason)) => {
                info!("central user login unreachable, falling back to local: {reason}");
                connection_failure = true;
            }
        }

        let mut service_ctx = service_provider.basic_context()?;
        let user_service = UserAccountService::new(&service_ctx.connection);
        let user_account = match user_service.verify_password(&input.username, &input.password) {
            Ok(user) => user,
            Err(err) => {
                return Err(match err {
                    VerifyPasswordError::UsernameDoesNotExist => {
                        LoginError::LoginFailure(LoginFailure::InvalidCredentials)
                    }
                    VerifyPasswordError::InvalidCredentials => {
                        LoginError::LoginFailure(LoginFailure::InvalidCredentials)
                    }
                    VerifyPasswordError::InvalidCredentialsBackend(_) => {
                        LoginError::InternalError("Failed to read credentials".to_string())
                    }
                    VerifyPasswordError::DatabaseError(e) => LoginError::DatabaseError(e),
                    VerifyPasswordError::EmptyHashedPassword => {
                        if connection_failure {
                            LoginError::MSupplyCentralNotReached
                        } else {
                            LoginError::InternalError("Corrupted credentials".to_string())
                        }
                    }
                });
            }
        };

        // Check that the logged in user has access to at least one store on the site
        match user_service.find_user_active_on_this_site(&user_account.id) {
            Ok(Some(_)) => (),
            Ok(None) => return Err(LoginError::LoginFailure(LoginFailure::NoSiteAccess)),
            Err(err) => return Err(err.into()),
        };

        service_ctx.user_id.clone_from(&user_account.id);

        activity_log_entry(
            &service_ctx,
            ActivityLogType::UserLoggedIn,
            None,
            None,
            None,
        )?;

        let mut token_service = TokenService::new(
            &auth_data.token_bucket,
            auth_data.auth_token_secret.as_bytes(),
            !is_develop(),
        );
        let max_age_token = crate::auth_data::TOKEN_LIFETIME_SEC;
        let max_age_refresh = crate::auth_data::REFRESH_TOKEN_LIFETIME_SEC;

        let pair = match token_service.jwt_token(
            &user_account.id,
            &input.password,
            max_age_token,
            max_age_refresh,
        ) {
            Ok(pair) => pair,
            Err(err) => return Err(LoginError::FailedToGenerateToken(err)),
        };
        Ok(pair)
    }
}

impl From<RepositoryError> for LoginError {
    fn from(err: RepositoryError) -> Self {
        LoginError::InternalError(format!("{err:?}"))
    }
}

#[cfg(test)]
mod test {
    use std::sync::{Arc, RwLock};

    use httpmock::{Method::POST, MockServer};
    use repository::{
        mock::{
            mock_user_account_a, mock_user_empty_hashed_password, mock_user_store_join_a_store_a,
            MockDataInserts,
        },
        test_db::setup_all,
        KeyType, KeyValueStoreRepository, UserAccountRowRepository,
    };
    use util::assert_matches;

    use crate::{
        auth_data::AuthData,
        login::{LoginError, LoginFailure, LoginInput},
        service_provider::ServiceProvider,
        token_bucket::TokenBucket,
        user_account::{CreateUserAccount, UserAccountService},
    };

    use super::LoginService;

    /// Bcrypt-hash "password" and write it onto mock_user_account_a so that
    /// `verify_password` can succeed locally. user_account_a already has a
    /// store join on store_a (site_id 100) via mock_user_store_join_a_store_a.
    fn seed_user_with_real_hash(service_provider: &ServiceProvider) {
        let ctx = service_provider.basic_context().unwrap();
        let hashed = UserAccountService::hash_password("password").unwrap();
        let mut user = mock_user_account_a();
        user.hashed_password = hashed;
        UserAccountRowRepository::new(&ctx.connection)
            .upsert_one(&user)
            .unwrap();
    }

    #[actix_rt::test]
    async fn central_login_test() {
        let (_, _, connection_manager, _) = setup_all(
            "login_test",
            MockDataInserts::none()
                .names()
                .stores()
                .user_accounts()
                .user_store_joins(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let auth_data = AuthData {
            auth_token_secret: "secret".to_string(),
            token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
            no_ssl: true,
            debug_no_access_control: false,
        };

        seed_user_with_real_hash(&service_provider);
        let username = mock_user_account_a().username;
        let store_site_id = mock_user_store_join_a_store_a();
        // mock_user_store_join_a_store_a joins user_account_a to store_a
        // (site_id 100 via mock_store_a). Configure this site as that one.
        let _ = store_site_id;
        let key_value_store = KeyValueStoreRepository::new(&context.connection);
        key_value_store
            .set_i32(
                KeyType::SettingsSyncSiteId,
                Some(repository::mock::mock_store_a().site_id),
            )
            .unwrap();

        // Valid credentials, central confirms with success:true → Ok
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(200).body(r#"{"success":true}"#);
            });

            LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: username.clone(),
                    password: "password".to_string(),
                    central_server_url: mock_server.base_url(),
                },
                0,
            )
            .await
            .unwrap();
        }

        // Central confirms with success:false → InvalidCredentials
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(200).body(r#"{"success":false}"#);
            });

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: username.clone(),
                    password: "password".to_string(),
                    central_server_url: mock_server.base_url(),
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
        }

        // Central responds with HTTP 401 → InvalidCredentials
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(401);
            });

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: username.clone(),
                    password: "password".to_string(),
                    central_server_url: mock_server.base_url(),
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
        }

        // Central unreachable (5xx) + correct local hash → succeeds via fallback
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(500);
            });

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: username.clone(),
                    password: "password".to_string(),
                    central_server_url: mock_server.base_url(),
                },
                0,
            )
            .await;

            assert!(result.is_ok(), "expected local-hash fallback to succeed");
        }

        // Central genuinely unreachable (connection refused) + correct local
        // hash → succeeds via fallback.
        // Port 1 is privileged and reliably refuses on POSIX systems.
        {
            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: username.clone(),
                    password: "password".to_string(),
                    central_server_url: "http://127.0.0.1:1".to_string(),
                },
                0,
            )
            .await;

            assert!(
                result.is_ok(),
                "expected local-hash fallback to succeed when central is refused"
            );
        }

        // Central unreachable + wrong local password → InvalidCredentials
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(500);
            });

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: username.clone(),
                    password: "wrong".to_string(),
                    central_server_url: mock_server.base_url(),
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
        }

        // Central unreachable + empty local hash → MSupplyCentralNotReached
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(500);
            });

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: mock_user_empty_hashed_password().username,
                    password: "anything".to_string(),
                    central_server_url: mock_server.base_url(),
                },
                0,
            )
            .await;

            assert_matches!(result, Err(LoginError::MSupplyCentralNotReached));
        }

        // Valid creds but no store join on this site → NoSiteAccess
        {
            key_value_store
                .set_i32(KeyType::SettingsSyncSiteId, Some(999))
                .unwrap();

            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(200).body(r#"{"success":true}"#);
            });

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: username.clone(),
                    password: "password".to_string(),
                    central_server_url: mock_server.base_url(),
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::NoSiteAccess))
            );
        }
    }

    #[actix_rt::test]
    async fn verify_credentials_on_central_test() {
        use std::time::{Duration, Instant};

        let (_, _, connection_manager, _) = setup_all(
            "verify_credentials_on_central_test",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);

        // Seed a user with a real bcrypt-hashed password.
        let context = service_provider.basic_context().unwrap();
        UserAccountService::new(&context.connection)
            .create_user(CreateUserAccount {
                username: "alice".to_string(),
                password: "correct-horse".to_string(),
                email: None,
            })
            .unwrap();
        drop(context);

        // Valid credentials -> Ok(true), no padding required
        let ok = LoginService::verify_credentials_on_central(
            &service_provider,
            "alice",
            "correct-horse",
            0,
        )
        .await
        .unwrap();
        assert!(ok);

        // Wrong password -> Ok(false), padded to min response time
        let started = Instant::now();
        let bad =
            LoginService::verify_credentials_on_central(&service_provider, "alice", "wrong", 1)
                .await
                .unwrap();
        assert!(!bad);
        assert!(
            started.elapsed() >= Duration::from_secs(1),
            "expected min response time padding on failed login"
        );

        // Unknown user -> Ok(false)
        let unknown = LoginService::verify_credentials_on_central(
            &service_provider,
            "no-such-user",
            "whatever",
            0,
        )
        .await
        .unwrap();
        assert!(!unknown);

        // Empty stored hash (synced user with no password yet) -> Ok(false)
        let empty = LoginService::verify_credentials_on_central(
            &service_provider,
            &mock_user_empty_hashed_password().username,
            "anything",
            0,
        )
        .await
        .unwrap();
        assert!(!empty);
    }
}
