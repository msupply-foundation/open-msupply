use std::time::{Duration, SystemTime};

use bcrypt::BcryptError;
use chrono::Utc;
use log::info;
use repository::{
    ActivityLogType, LanguageType, PermissionType, RepositoryError, SyncVersion, UserAccountRow,
    UserAccountRowRepository, UserPermissionRow, UserStoreJoinRow,
};
use reqwest::Url;
use serde::{Deserialize, Serialize};

use crate::{
    activity_log::activity_log_entry,
    apis::{
        central_user_login::{central_user_login, CentralUserLoginError},
        login_v4::{
            LoginApiV4, LoginInputV4, LoginStatusV4, LoginUserInfoV4, LoginUserTypeV4, LoginV4Error,
        },
        permissions::{map_api_permissions, permissions_to_domain},
    },
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    sync::CentralServerConfig,
    user_account::{StorePermissions, UserAccountService, VerifyPasswordError},
};

const CONNECTION_TIMEOUT_SEC: u64 = 10;

/// What a login flow settled about the user, and about the hash on their local row.
struct Authenticated {
    user: UserAccountRow,
    /// Central accepted the password and the local row holds a hash that password does
    /// not verify against, so the row predates a reset sync has not landed here yet.
    ///
    /// Only the v7 central-verified path can be in that position: every other flow
    /// either writes the row from central before verifying, or verifies the password
    /// against the row itself, so the two always agree by the time it returns.
    stored_hash_is_stale: bool,
}

/// Minimum response time on a failed login. Disguises whether the username
/// exists by making "wrong password" and "no such user" indistinguishable by
/// latency. Must be longer than the worst-case bcrypt verify time.
pub const MIN_ERR_RESPONSE_TIME_SEC: u64 = 3;

#[derive(Debug)]
pub enum FetchUserError {
    Unauthenticated,
    AccountBlocked(u64),
    ConnectionError(String),
    InternalError(String),
}
#[derive(Debug)]
pub enum UpdateUserError {
    PasswordHashError(BcryptError),
    DatabaseError(RepositoryError),
}

pub struct LoginService {}

#[derive(Debug)]
pub enum LoginFailure {
    /// Either user does not exist or wrong password
    InvalidCredentials,
    /// User account is blocked due to too many failed login attempts
    AccountBlocked(u64),
    /// User account does not have login rights to any stores on this site
    NoSiteAccess,
}

#[derive(Debug)]
pub enum LoginError {
    LoginFailure(LoginFailure),
    FetchUserError(FetchUserError),
    UpdateUserError(UpdateUserError),
    InternalError(String),
    DatabaseError(RepositoryError),
    MSupplyCentralNotReached,
}

/// Result of a successful login. The caller is responsible for creating a session token via
/// `AuthData::session_store` and setting the cookie; this keeps the service free of
/// transport/cookie concerns.
#[derive(Debug, Clone)]
pub struct LoginSuccess {
    pub user_id: String,
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
    ) -> Result<LoginSuccess, LoginError> {
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
    ) -> Result<LoginSuccess, LoginError> {
        // Pick login flow based on which sync version this site is running.
        // V5V6 sites authenticate via legacy mSupply's /api/v4/login (which
        // also delivers the user row, store joins, and permissions). V7 sites
        // authenticate via OMS Central's /central/user/login — user state is
        // already kept current by the sync translations.
        let sync_version = {
            let ctx = service_provider.basic_context()?;
            SyncVersion::get(&ctx.connection, CentralServerConfig::is_central_server()).map_err(
                |err| LoginError::InternalError(format!("Failed to read sync version: {err:?}")),
            )?
        };

        let Authenticated {
            user: user_account,
            stored_hash_is_stale,
        } = match sync_version {
            SyncVersion::V5V6 => Self::authenticate_v5v6(service_provider, &input).await?,
            SyncVersion::V7 => Self::authenticate_v7(service_provider, &input).await?,
        };

        // Sessions issued against the old credentials are no longer the user's to hold:
        // evict them before this login gets its own. Nothing else invalidates a session
        // when a password changes.
        //
        // The comparison is against the hash the session store last issued sessions
        // against, not against the row as it looked at the top of this call. A password
        // reset at central reaches the local row through the `user` sync translation,
        // which writes `password_hash` outside any login, and the v7 flow never writes
        // the row at all - so a before/after comparison here would miss the reset in
        // exactly the case an incident responder cares about.
        //
        // Where the row itself still predates the reset there is no new hash to compare
        // anything to, and the change is taken on central's word - see `authenticate_v7`.
        let revoked = {
            let mut session_store = auth_data.session_store.write().map_err(|err| {
                LoginError::InternalError(format!("Session store lock poisoned: {err}"))
            })?;

            if stored_hash_is_stale {
                session_store.revoke_for_credentials_changed_at_central(&user_account.id)
            } else {
                session_store
                    .revoke_if_credentials_changed(&user_account.id, &user_account.hashed_password)
            }
        };

        if revoked {
            log::info!(
                "Password changed for user {}, revoked existing sessions",
                user_account.id
            );
        }

        let mut service_ctx = service_provider.basic_context()?;
        let user_service = UserAccountService::new(&service_ctx.connection);

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

        Ok(LoginSuccess {
            user_id: user_account.id,
        })
    }

    /// V5V6 login: fetch user data + permissions from legacy mSupply's
    /// `/api/v4/login`, write them locally, then verify the password against
    /// the just-stored hash. Falls back to local verify if central is
    /// unreachable.
    async fn authenticate_v5v6(
        service_provider: &ServiceProvider,
        input: &LoginInput,
    ) -> Result<Authenticated, LoginError> {
        let mut username = input.username.clone();
        let mut connection_failure = false;
        // Don't do login via v5 and v6 on central server, permissions with v3 and up will come via sync
        if !CentralServerConfig::is_central_server() {
            match LoginService::fetch_user_from_central(service_provider, input).await {
                Ok(user_info) => {
                    let service_ctx =
                        service_provider.context("".to_string(), user_info.user.id.clone())?;
                    username.clone_from(&user_info.user.name);
                    LoginService::update_user(&service_ctx, &input.password, user_info)
                        .map_err(LoginError::UpdateUserError)?;
                }
                Err(err) => match err {
                    FetchUserError::Unauthenticated => {
                        return Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
                    }
                    FetchUserError::AccountBlocked(timeout_remaining) => {
                        return Err(LoginError::LoginFailure(LoginFailure::AccountBlocked(
                            timeout_remaining,
                        )))
                    }
                    FetchUserError::ConnectionError(_) => {
                        info!("{err:?}");
                        connection_failure = true;
                    }
                    FetchUserError::InternalError(_) => info!("{err:?}"),
                },
            };
        }

        let service_ctx = service_provider.basic_context()?;
        let user_service = UserAccountService::new(&service_ctx.connection);
        match user_service.verify_password(&username, &input.password) {
            // The password was verified against this row's own hash, so the two agree.
            Ok(user) => Ok(Authenticated {
                user,
                stored_hash_is_stale: false,
            }),
            Err(err) => Err(match err {
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
            }),
        }
    }

    /// V7 login: ask OMS Central's `/central/user/login` whether the
    /// credentials are valid. On a confirmed match, trust central and look
    /// up the local user row. If central is unreachable, fall back to local
    /// hash verification — the user sync translation keeps the local hash
    /// current. On the central server itself we are the source of truth, so
    /// skip the round-trip and verify locally.
    async fn authenticate_v7(
        service_provider: &ServiceProvider,
        input: &LoginInput,
    ) -> Result<Authenticated, LoginError> {
        let mut central_verified = false;
        let mut connection_failure = false;

        match central_user_login(&input.central_server_url, &input.username, &input.password).await
        {
            Ok(()) => central_verified = true,
            Err(CentralUserLoginError::InvalidCredentials) => {
                return Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials));
            }
            Err(CentralUserLoginError::Unreachable(reason)) => {
                info!("central user login unreachable, falling back to local: {reason}");
                connection_failure = true;
            }
        }

        let service_ctx = service_provider.basic_context()?;
        let user_service = UserAccountService::new(&service_ctx.connection);
        if central_verified {
            // Central already vetted the password. Just look up the local
            // user row so we have the id for site-access / token / activity
            // log. If sync hasn't propagated the user yet, surface as
            // InvalidCredentials — they can retry once sync catches up.
            let user = UserAccountRowRepository::new(&service_ctx.connection)
                .find_one_by_user_name(&input.username)
                .map_err(LoginError::DatabaseError)?
                .ok_or(LoginError::LoginFailure(LoginFailure::InvalidCredentials))?;

            // Central has just accepted this password and this flow never writes the
            // row, so a stored hash the password does not verify against belongs to a
            // reset central has already applied and sync has not delivered here. Say so,
            // or the sessions held under the old password would outlive the reset and
            // outlive the user's own login with the new one, until the `user`
            // translation lands and the user logs in a second time.
            let stored_hash_is_stale = match bcrypt::verify(&input.password, &user.hashed_password)
            {
                Ok(verified) => !verified,
                // Not a hash anything can be concluded from - an empty one on a row sync
                // has yet to fill in. Leave it to the ordinary comparison, which only
                // needs the stored string to change.
                Err(_) => false,
            };

            Ok(Authenticated {
                user,
                stored_hash_is_stale,
            })
        } else {
            match user_service.verify_password(&input.username, &input.password) {
                // Verified against this row's own hash, so the two agree.
                Ok(user) => Ok(Authenticated {
                    user,
                    stored_hash_is_stale: false,
                }),
                Err(err) => Err(match err {
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
                }),
            }
        }
    }

    /// # Warning
    ///
    /// Must not be called from COMS. The result is consumed by
    /// [`Self::update_user`] → [`UserAccountService::upsert_user`], which deletes
    /// `user_store_joins` not present in the OG response. OG narrows its response
    /// to the calling site's stores, so on COMS this would wipe joins for stores
    /// that belong to other ROMS sites and that COMS legitimately holds for the
    /// user.
    ///
    /// # Safety
    /// Safe on ROMS — the wipe scope matches the OG response scope, since a ROMS
    /// only holds joins for its own site.
    pub async fn fetch_user_from_central(
        service_provider: &ServiceProvider,
        input: &LoginInput,
    ) -> Result<LoginUserInfoV4, FetchUserError> {
        // Prepare central login query
        let central_server_url = Url::parse(&input.central_server_url).map_err(|err| {
            FetchUserError::InternalError(format!("Failed to parse central server url: {err}"))
        })?;
        let client = util::https_client_builder()
            .connect_timeout(Duration::from_secs(CONNECTION_TIMEOUT_SEC))
            .build()
            .map_err(|err| FetchUserError::ConnectionError(format!("{err:?}")))?;
        let login_api = LoginApiV4::new(client, central_server_url.clone());
        let username = &input.username;
        let password = &input.password;

        let service_ctx = service_provider.basic_context().map_err(|err| {
            FetchUserError::InternalError(format!("Failed to get service context: {err}"))
        })?;
        let settings = service_provider
            .settings
            .sync_settings(&service_ctx)
            .map_err(|err| {
                FetchUserError::InternalError(format!("Failed to get sync settings: {err}"))
            })?;

        // Try login with central
        let login_result = login_api
            .login(LoginInputV4 {
                username: username.clone(),
                password: password.clone(),
                login_type: LoginUserTypeV4::User,
                site_name: settings.map(|x| x.username),
            })
            .await;

        let user_data = match login_result {
            Ok(user_data) => user_data,
            Err(err) => match err {
                LoginV4Error::Unauthorised => {
                    return Err(FetchUserError::Unauthenticated);
                }
                LoginV4Error::AccountBlocked(timeout_remaining) => {
                    return Err(FetchUserError::AccountBlocked(timeout_remaining));
                }
                LoginV4Error::ConnectionError(_) => {
                    return Err(FetchUserError::ConnectionError(format!(
                        "Failed to reach the central server to fetch data for {username}: {err:?}"
                    )))
                }
                LoginV4Error::ParseError(_) => {
                    return Err(FetchUserError::InternalError(format!(
                        "Failed to parse central server response for {username}: {err:?}"
                    )))
                }
            },
        };

        if user_data.status == LoginStatusV4::Error {
            return Err(FetchUserError::ConnectionError(
                "Failed to fetch user from central server".to_string(),
            ));
        }
        if user_data.status != LoginStatusV4::Success {
            return Err(FetchUserError::InternalError(format!(
                "Unexpected central server status: {:?}",
                user_data.status
            )));
        }

        let user_info = match user_data.user_info {
            Some(user_info) => user_info,
            None => {
                return Err(FetchUserError::InternalError(
                    "Missing user info in returned central server login data".to_string(),
                ));
            }
        };

        Ok(user_info)
    }

    pub fn update_user(
        service_ctx: &ServiceContext,
        password: &str,
        user_info: LoginUserInfoV4,
    ) -> Result<(), UpdateUserError> {
        // Keep the stored hash while the password is unchanged: bcrypt salts
        // every hash, so re-hashing per login would make the user row always
        // look changed and defeat upsert_user's delta detection (#12612).
        // Central has already accepted `password` at this point.
        let hashed_password = UserAccountRowRepository::new(&service_ctx.connection)
            .find_one_by_id(&user_info.user.id)
            .map_err(UpdateUserError::DatabaseError)?
            .filter(|existing| {
                bcrypt::verify(password, &existing.hashed_password).unwrap_or(false)
            })
            .map(|existing| existing.hashed_password);
        let hashed_password = match hashed_password {
            Some(existing_hash) => existing_hash,
            None => UserAccountService::hash_password(password)
                .map_err(UpdateUserError::PasswordHashError)?,
        };

        // convert user_info to internal format
        let user = UserAccountRow {
            id: user_info.user.id,
            username: user_info.user.name.to_string(),
            hashed_password,
            email: user_info.user.e_mail,
            language: match user_info.user.language {
                0 => LanguageType::English,
                1 => LanguageType::French,
                2 => LanguageType::Spanish,
                3 => LanguageType::Laos,
                4 => LanguageType::Khmer,
                5 => LanguageType::Portuguese,
                6 => LanguageType::Russian,
                7 => LanguageType::Tetum,
                _ => LanguageType::English,
            },
            first_name: user_info.user.first_name,
            last_name: user_info.user.last_name,
            phone_number: user_info.user.phone1,
            job_title: user_info.user.job_title,
            last_successful_sync: Some(Utc::now().naive_utc()),
            is_active: user_info.user.active,
        };
        let stores_permissions: Vec<StorePermissions> = user_info
            .user_stores
            .into_iter()
            .filter(|store| store.can_login)
            .map(|user_store| {
                let user_store_join = UserStoreJoinRow {
                    id: user_store.id,
                    user_id: user_store.user_id,
                    store_id: user_store.store_id,
                    is_default: user_store.store_default,
                };
                let permissions = map_api_permissions(user_store.permissions);
                let mut permission_set = permissions_to_domain(permissions);
                // Give the user access to the store
                permission_set.insert(PermissionType::StoreAccess);
                let permissions = permission_set
                    .into_iter()
                    .map(|permission| UserPermissionRow {
                        id: UserPermissionRow::deterministic_id(
                            &user_store_join.user_id,
                            Some(&user_store_join.store_id),
                            &permission,
                        ),
                        user_id: user_store_join.user_id.clone(),
                        store_id: Some(user_store_join.store_id.clone()),
                        permission,
                        context_id: None,
                    })
                    .collect();

                StorePermissions {
                    user_store_join,
                    permissions,
                }
            })
            .collect();

        let service = UserAccountService::new(&service_ctx.connection);
        service
            .upsert_user(user.clone(), stores_permissions)
            .map_err(UpdateUserError::DatabaseError)?;
        Ok(())
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
            mock_store_a, mock_user_account_a, mock_user_empty_hashed_password,
            mock_user_store_join_a_store_a, MockDataInserts,
        },
        test_db::setup_all,
        EqualFilter, KeyType, KeyValueStoreRepository, SyncVersion, UserAccountRowRepository,
        UserFilter, UserPermissionFilter, UserPermissionRepository, UserRepository,
    };
    use util::assert_matches;

    use crate::{
        apis::login_v4::LoginResponseV4,
        auth_data::AuthData,
        login::{LoginError, LoginFailure, LoginInput},
        login_mock_data::LOGIN_V4_RESPONSE_1,
        service_provider::{ServiceContext, ServiceProvider},
        session_store::SessionStore,
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

    /// A site with a mocked login endpoint and an empty session store, shared by the
    /// session-revocation tests.
    struct SessionFixture {
        service_provider: ServiceProvider,
        context: ServiceContext,
        auth_data: AuthData,
        user_id: String,
        username: String,
        central_server_url: String,
        // Kept alive for as long as the fixture is; dropping it stops serving the mock
        _mock_server: MockServer,
    }

    impl SessionFixture {
        /// A V5V6 site: the legacy endpoint hands back the user row, and the login
        /// writes it locally before verifying against it.
        async fn new(db_name: &str) -> Self {
            let (_, _, connection_manager, _) = setup_all(
                db_name,
                MockDataInserts::none().names().stores().user_accounts(),
            )
            .await;
            let service_provider = ServiceProvider::new(connection_manager);
            let context = service_provider
                .context("".to_string(), "".to_string())
                .unwrap();

            SyncVersion::set(&context.connection, SyncVersion::V5V6).unwrap();

            let expected: LoginResponseV4 = serde_json::from_str(LOGIN_V4_RESPONSE_1).unwrap();
            let user_id = expected.user_info.unwrap().user.id;

            Self::assemble(
                service_provider,
                context,
                user_id,
                "Gryffindor".to_string(),
                |when, then| {
                    when.method(POST).path("/api/v4/login".to_string());
                    then.status(200).body(LOGIN_V4_RESPONSE_1);
                },
            )
        }

        /// A V7 site: central only says yes or no to the password, and the flow never
        /// writes the user row - so the row has to be seeded, joined to a store on this
        /// site, and given a real hash of "password" up front.
        async fn new_v7(db_name: &str) -> Self {
            let (_, _, connection_manager, _) = setup_all(
                db_name,
                MockDataInserts::none()
                    .names()
                    .stores()
                    .user_accounts()
                    .user_store_joins(),
            )
            .await;
            let service_provider = ServiceProvider::new(connection_manager);
            let context = service_provider
                .context("".to_string(), "".to_string())
                .unwrap();

            SyncVersion::set(&context.connection, SyncVersion::V7).unwrap();
            seed_user_with_real_hash(&service_provider);

            let user = mock_user_account_a();

            Self::assemble(
                service_provider,
                context,
                user.id,
                user.username,
                |when, then| {
                    when.method(POST).path("/central/user/login".to_string());
                    then.status(200).body(r#"{"success":true}"#);
                },
            )
        }

        fn assemble(
            service_provider: ServiceProvider,
            context: ServiceContext,
            user_id: String,
            username: String,
            mock: impl FnOnce(httpmock::When, httpmock::Then),
        ) -> Self {
            KeyValueStoreRepository::new(&context.connection)
                .set_i32(KeyType::SettingsSyncSiteId, Some(mock_store_a().site_id))
                .unwrap();

            let mock_server = MockServer::start();
            mock_server.mock(mock);
            let central_server_url = mock_server.base_url();

            SessionFixture {
                service_provider,
                context,
                auth_data: AuthData {
                    session_store: Arc::new(RwLock::new(SessionStore::new())),
                    cookie_suffix: "test".to_string(),
                    no_ssl: true,
                    debug_no_access_control: false,
                },
                user_id,
                username,
                central_server_url,
                _mock_server: mock_server,
            }
        }

        async fn login(&self) {
            self.login_with_password("password").await
        }

        async fn login_with_password(&self, password: &str) {
            LoginService::login(
                &self.service_provider,
                &self.auth_data,
                LoginInput {
                    username: self.username.clone(),
                    password: password.to_string(),
                    central_server_url: self.central_server_url.clone(),
                },
                0,
            )
            .await
            .unwrap();
        }

        /// A session held against the credentials as they stand — another device, or an
        /// attacker holding a stolen token.
        fn create_session(&self) -> String {
            self.auth_data
                .session_store
                .write()
                .unwrap()
                .create(&self.user_id)
        }

        fn session_is_live(&self, token: &str) -> bool {
            self.auth_data
                .session_store
                .write()
                .unwrap()
                .validate_and_slide(token)
                .is_some()
        }

        fn stored_password_hash(&self) -> String {
            UserAccountRowRepository::new(&self.context.connection)
                .find_one_by_id(&self.user_id)
                .unwrap()
                .unwrap()
                .hashed_password
        }

        fn set_stored_password_hash(&self, hashed_password: String) {
            let repo = UserAccountRowRepository::new(&self.context.connection);
            let mut user = repo.find_one_by_id(&self.user_id).unwrap().unwrap();
            user.hashed_password = hashed_password;
            repo.upsert_one(&user).unwrap();
        }
    }

    /// Security audit DS-4: a session issued against the old credentials must not
    /// survive the password changing. Before this, `revoke_all_for_user` had no
    /// production caller and only a server restart evicted a stolen token.
    #[actix_rt::test]
    async fn login_revokes_existing_sessions_when_the_password_hash_changes() {
        let fixture = SessionFixture::new("login_revokes_existing_sessions_on_password_change").await;

        // First login writes the user row locally
        fixture.login().await;

        let existing_session = fixture.create_session();
        assert!(fixture.session_is_live(&existing_session));

        // The credentials change: the stored hash is no longer one the user's
        // password verifies against, so the next login re-hashes it
        fixture.set_stored_password_hash("ATTACKER-CONTROLLED-HASH".to_string());

        fixture.login().await;

        assert!(
            !fixture.session_is_live(&existing_session),
            "session issued against the old password should have been revoked"
        );
    }

    /// The case an incident responder actually produces: the password is reset at
    /// central, sync delivers the new hash to this site (the `user` translation writes
    /// `password_hash`), and only then does the user log in with the new password.
    ///
    /// Comparing the stored hash before and after the login call cannot see this - by the
    /// time the user logs in, the row already holds the new hash and `update_user` keeps
    /// it, so nothing looks changed. The session store is what remembers which hash the
    /// live sessions were issued against.
    #[actix_rt::test]
    async fn login_revokes_existing_sessions_when_sync_landed_the_new_hash_first() {
        let fixture = SessionFixture::new("login_revokes_when_sync_landed_hash_first").await;

        fixture.login().await;
        let attacker_session = fixture.create_session();

        // Central resets the password and sync writes the new hash onto the local row,
        // as a freshly bcrypted hash of the new password - exactly what central sends
        fixture.set_stored_password_hash(UserAccountService::hash_password("password").unwrap());

        // The user logs in with the new password
        fixture.login().await;

        assert!(
            !fixture.session_is_live(&attacker_session),
            "session issued before the password reset should have been revoked"
        );
    }

    /// The other direction: an ordinary re-login leaves other sessions alone.
    #[actix_rt::test]
    async fn login_keeps_existing_sessions_when_the_password_is_unchanged() {
        let fixture = SessionFixture::new("login_keeps_existing_sessions_when_unchanged").await;

        fixture.login().await;
        let existing_session = fixture.create_session();

        // Same password again — the stored hash is kept (see update_user), so nothing
        // is revoked and the user's other device stays logged in
        fixture.login().await;

        assert!(fixture.session_is_live(&existing_session));
    }

    /// The v7 transport is the one the stored-hash comparison cannot see a reset
    /// through: central vets the password, the flow never writes the user row, and until
    /// the `user` translation lands the reset the row still holds the hash the live
    /// sessions were issued against. Central's verdict is the only evidence there is.
    #[actix_rt::test]
    async fn v7_login_revokes_existing_sessions_when_central_accepts_a_changed_password() {
        let fixture = SessionFixture::new_v7("v7_login_revokes_on_central_verdict").await;

        fixture.login().await;
        let attacker_session = fixture.create_session();
        assert!(fixture.session_is_live(&attacker_session));

        // The password is reset at central and the user logs in with the new one. Sync
        // has not delivered the new hash, so the local row is byte-for-byte what it was.
        let hash_before = fixture.stored_password_hash();
        fixture.login_with_password("new-password").await;
        assert_eq!(fixture.stored_password_hash(), hash_before);

        assert!(
            !fixture.session_is_live(&attacker_session),
            "session issued before the reset should have been revoked on central's verdict"
        );
    }

    /// Nothing names the new credentials until sync lands the hash, so the window has to
    /// be quiet: a second device logging in with the same new password must not evict
    /// the first.
    #[actix_rt::test]
    async fn v7_login_keeps_sessions_issued_earlier_in_the_same_stale_window() {
        let fixture = SessionFixture::new_v7("v7_login_keeps_sessions_in_stale_window").await;

        fixture.login().await;
        fixture.login_with_password("new-password").await;
        let first_device = fixture.create_session();

        fixture.login_with_password("new-password").await;

        assert!(
            fixture.session_is_live(&first_device),
            "a second login in the same window should not evict the first"
        );
    }

    /// And once a usable hash is there again, nothing can tell the reset arriving over
    /// sync from a second reset since. It revokes, which is the direction that stops a
    /// session issued under a password that has changed again from surviving.
    #[actix_rt::test]
    async fn v7_login_revokes_once_a_usable_hash_lands_after_a_central_verified_change() {
        let fixture = SessionFixture::new_v7("v7_login_revokes_when_a_hash_lands").await;

        fixture.login().await;
        fixture.login_with_password("new-password").await;
        let session_from_the_window = fixture.create_session();

        // Sync delivers a hash the password verifies against
        fixture
            .set_stored_password_hash(UserAccountService::hash_password("new-password").unwrap());
        fixture.login_with_password("new-password").await;

        assert!(
            !fixture.session_is_live(&session_from_the_window),
            "a login that finds a usable hash again must revoke rather than guess"
        );
    }

    /// The v7 fallback, where central is unreachable and the password is verified
    /// against the row: the two agree by construction, so an ordinary re-login must not
    /// be read as a change.
    #[actix_rt::test]
    async fn v7_login_keeps_existing_sessions_when_the_password_is_unchanged() {
        let fixture = SessionFixture::new_v7("v7_login_keeps_existing_sessions").await;

        fixture.login().await;
        let existing_session = fixture.create_session();

        fixture.login().await;

        assert!(fixture.session_is_live(&existing_session));
    }

    /// V5V6 (legacy /api/v4/login) login flow. Exercises the original
    /// fetch-and-update-then-verify path against a mocked legacy server.
    #[actix_rt::test]
    async fn central_login_test_v5v6() {
        let (_, _, connection_manager, _) = setup_all(
            "central_login_test_v5v6",
            MockDataInserts::none().names().stores().user_accounts(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("".to_string(), "".to_string())
            .unwrap();

        // Default SyncVersion is V5V6, but make it explicit so this test
        // documents the flow it's exercising.
        SyncVersion::set(&context.connection, SyncVersion::V5V6).unwrap();

        let auth_data = AuthData {
            session_store: Arc::new(RwLock::new(SessionStore::new())),
            cookie_suffix: "test".to_string(),
            no_ssl: true,
            debug_no_access_control: false,
        };

        let expected: LoginResponseV4 = serde_json::from_str(LOGIN_V4_RESPONSE_1).unwrap();
        let expected_user_info = expected.user_info.unwrap();

        let key_value_store = KeyValueStoreRepository::new(&context.connection);

        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(200).body(LOGIN_V4_RESPONSE_1);
            });

            let central_server_url = mock_server.base_url();

            key_value_store
                .set_i32(KeyType::SettingsSyncSiteId, Some(mock_store_a().site_id))
                .unwrap();

            LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: "Gryffindor".to_string(),
                    password: "password".to_string(),
                    central_server_url,
                },
                0,
            )
            .await
            .unwrap();

            let user = UserRepository::new(&context.connection)
                .query_one(UserFilter::new().id(EqualFilter::equal_to(
                    expected_user_info.user.id.to_string(),
                )))
                .unwrap()
                .unwrap();
            assert_eq!(expected_user_info.user.name, user.user_row.username);
            assert_eq!(
                expected_user_info.user_stores.first().unwrap().store_id,
                user.stores.first().unwrap().store_row.id
            );

            let permissions = UserPermissionRepository::new(&context.connection)
                .query_by_filter(UserPermissionFilter::new().user_id(EqualFilter::equal_to(
                    expected_user_info.user.id.to_string(),
                )))
                .unwrap();
            assert!(!permissions.is_empty());
        }
        // If server password has changed, and trying to login with other then old password, return LoginFailure
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(401);
            });

            let central_server_url = mock_server.base_url();

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: "Gryffindor".to_string(),
                    password: "password2".to_string(),
                    central_server_url,
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
        }
        // Old password should still work in offline mode or if central return an error
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(500);
            });

            let central_server_url = mock_server.base_url();

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: "Gryffindor".to_string(),
                    password: "password".to_string(),
                    central_server_url,
                },
                0,
            )
            .await;

            assert!(result.is_ok());
        }

        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(500);
            });

            let central_server_url = mock_server.base_url();

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: mock_user_empty_hashed_password().username,
                    password: "password".to_string(),
                    central_server_url,
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
        }

        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(200).body(
                    // mSupply was reached, but there are non-parse-able contents
                    // so fetch_central_user results in InternalError
                    // Therefore password not updated - we'll get the empty password error
                    r#"{"cannot": "parse"}"#,
                );
            });

            let central_server_url = mock_server.base_url();

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: mock_user_empty_hashed_password().username,
                    password: "password".to_string(),
                    central_server_url,
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
        }
        // If server password has changed, and trying to login with old password, return LoginError::LoginFailure
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(401);
            });

            let central_server_url = mock_server.base_url();

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: "Gryffindor".to_string(),
                    password: "password2".to_string(),
                    central_server_url,
                },
                0,
            )
            .await;

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
        }
        // If login is correct but user is not active on this site, get NoSiteAccess error
        {
            // Login user only has access to store_a, which has site_id 100
            key_value_store
                .set_i32(KeyType::SettingsSyncSiteId, Some(1))
                .unwrap();

            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(200).body(LOGIN_V4_RESPONSE_1);
            });

            let central_server_url = mock_server.base_url();

            let result = LoginService::login(
                &service_provider,
                &auth_data,
                LoginInput {
                    username: "Gryffindor".to_string(),
                    password: "password".to_string(),
                    central_server_url,
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

    /// V7 (/central/user/login) login flow. Exercises the new credential-only
    /// endpoint plus the local-hash fallback when central is unreachable.
    #[actix_rt::test]
    async fn central_login_test_v7() {
        let (_, _, connection_manager, _) = setup_all(
            "central_login_test_v7",
            MockDataInserts::none()
                .names()
                .stores()
                .user_accounts()
                .user_store_joins(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        SyncVersion::set(&context.connection, SyncVersion::V7).unwrap();

        let auth_data = AuthData {
            session_store: Arc::new(RwLock::new(SessionStore::new())),
            cookie_suffix: "test".to_string(),
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

        // Central confirms credentials, but the local bcrypt hash is stale
        // (the user changed their password upstream and the sync hasn't yet
        // updated the local hash). Login must still succeed — central is
        // authoritative.
        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/central/user/login");
                then.status(200);
            });

            // Overwrite the local hash with one that does NOT match
            // "password".
            let stale_hash = UserAccountService::hash_password("something-else").unwrap();
            let mut user = mock_user_account_a();
            user.hashed_password = stale_hash;
            UserAccountRowRepository::new(&context.connection)
                .upsert_one(&user)
                .unwrap();

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

            // Restore the matching hash for subsequent test blocks.
            seed_user_with_real_hash(&service_provider);
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

        // Central unreachable + empty local hash → InvalidCredentials.
        // find_one_by_user_name filters out users with an empty hash, so the
        // user looks like "doesn't exist" to the local verify path — the same
        // shape the V5V6 flow exhibits.
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

            assert_matches!(
                result,
                Err(LoginError::LoginFailure(LoginFailure::InvalidCredentials))
            );
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

    /// On the central server we are the source of truth, so `do_login` should
    /// skip the round-trip to `central_user_login` entirely and verify against
    /// the local hash directly. (Note: `SyncVersion::get` forces V5V6 when
    /// `is_central_server` is true, so this test also implicitly exercises
    /// the V5V6 path on central — `central_user_login` is unreachable from
    /// both branches because we're on central.)
    #[actix_rt::test]
    async fn central_server_short_circuits_central_user_login() {
        use crate::sync::test_util_set_is_central_server;

        let (_, _, connection_manager, _) = setup_all(
            "central_server_short_circuits_central_user_login",
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
            session_store: Arc::new(RwLock::new(SessionStore::new())),
            cookie_suffix: "test".to_string(),
            no_ssl: true,
            debug_no_access_control: false,
        };

        seed_user_with_real_hash(&service_provider);
        KeyValueStoreRepository::new(&context.connection)
            .set_i32(
                KeyType::SettingsSyncSiteId,
                Some(repository::mock::mock_store_a().site_id),
            )
            .unwrap();

        test_util_set_is_central_server(true);

        // Deliberately unreachable URL: if the short-circuit didn't fire,
        // both `central_user_login` and the V4 `fetch_user_from_central`
        // would attempt to connect and we'd see latency up to the 10s
        // connect timeout. On central, V5V6 is forced and V4 falls back to
        // local-hash on connection failure, so this still succeeds — but
        // the central_user_login path is never even considered.
        let result = LoginService::login(
            &service_provider,
            &auth_data,
            LoginInput {
                username: mock_user_account_a().username,
                password: "password".to_string(),
                central_server_url: "http://this-host-should-never-be-contacted.invalid"
                    .to_string(),
            },
            0,
        )
        .await;

        assert!(
            result.is_ok(),
            "expected local-only verify on central, got {:?}",
            result
        );
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
