use std::{
    collections::HashMap,
    time::{Duration, SystemTime},
};

use log::info;
use repository::{
    schema::{
        user_permission::{Permission, Resource, UserPermissionRow},
        user_store_join::UserStoreJoinRow,
        UserAccountRow,
    },
    RepositoryError,
};
use reqwest::{ClientBuilder, Url};
use util::uuid::uuid;

use crate::{
    apis::{
        login_v4::{LoginApiV4, LoginInputV4, LoginStatusV4, LoginUserTypeV4},
        permissions::{map_api_permissions, Permissions},
    },
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    token::{JWTIssuingError, TokenPair, TokenService},
    user_account::{StorePermissions, UserAccountService, VerifyPasswordError},
};

const CONNECTION_TIMEOUT_SEC: u64 = 10;

#[derive(Debug)]
pub enum FetchUserError {
    Unauthenticated,
    ConnectionError(String),
    InternalError(String),
}

pub struct LoginService {}

#[derive(Debug)]
pub enum LoginError {
    /// Either user does not exit or wrong password
    LoginFailure,
    FailedToGenerateToken(JWTIssuingError),
    InternalError(String),
    DatabaseError(RepositoryError),
}

pub struct LoginInput {
    pub username: String,
    pub password: String,
    /// Central server url needed to fetch user details during login
    pub central_server_url: String,
}

impl LoginService {
    /// # Arguments:
    /// * `min_err_response_time_sec` min response time if there was a login error. This is to
    /// disguise any information whether the use exists or not, i.e. response time for invalid
    /// usernames is indistinguishable from the response time for invalid passwords. This only works
    /// if the value is high enough, i.e. higher than the server needs to calculate the password
    /// hash.
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
                let delay = Duration::from_secs(min_err_response_time_sec)
                    - now.elapsed().unwrap_or(Duration::from_secs(0));
                tokio::time::sleep(delay).await;
                Err(err)
            }
        }
    }

    async fn do_login(
        service_provider: &ServiceProvider,
        auth_data: &AuthData,
        input: LoginInput,
    ) -> Result<TokenPair, LoginError> {
        match LoginService::fetch_user_from_central(&input).await {
            Ok((user, store_permissions)) => {
                let service_ctx = service_provider.context()?;
                LoginService::update_user(&service_ctx, user, store_permissions)?;
            }
            Err(err) => match err {
                FetchUserError::Unauthenticated => return Err(LoginError::LoginFailure),
                FetchUserError::ConnectionError(_) => info!("{:?}", err),
                FetchUserError::InternalError(_) => info!("{:?}", err),
            },
        };
        let service_ctx = service_provider.context()?;
        let user_service = UserAccountService::new(&service_ctx.connection);
        let user_account = match user_service.verify_password(&input.username, &input.password) {
            Ok(user) => user,
            Err(err) => {
                return Err(match err {
                    VerifyPasswordError::UsernameDoesNotExist => LoginError::LoginFailure,
                    VerifyPasswordError::InvalidCredentials => LoginError::LoginFailure,
                    VerifyPasswordError::InvalidCredentialsBackend(_) => {
                        LoginError::InternalError("Failed to read credentials".to_string())
                    }
                    VerifyPasswordError::DatabaseError(e) => LoginError::DatabaseError(e),
                });
            }
        };

        let mut token_service = TokenService::new(
            &auth_data.token_bucket,
            auth_data.auth_token_secret.as_bytes(),
        );
        let max_age_token = chrono::Duration::minutes(60).num_seconds() as usize;
        let max_age_refresh = chrono::Duration::hours(6).num_seconds() as usize;
        let pair = match token_service.jwt_token(&user_account.id, max_age_token, max_age_refresh) {
            Ok(pair) => pair,
            Err(err) => return Err(LoginError::FailedToGenerateToken(err)),
        };
        Ok(pair)
    }

    async fn fetch_user_from_central(
        input: &LoginInput,
    ) -> Result<(UserAccountRow, Vec<StorePermissions>), FetchUserError> {
        let central_server_url = Url::parse(&input.central_server_url).map_err(|err| {
            FetchUserError::InternalError(format!("Failed to parse central server url: {}", err))
        })?;
        let client = ClientBuilder::new()
            .connect_timeout(Duration::from_secs(CONNECTION_TIMEOUT_SEC))
            .build()
            .map_err(|err| FetchUserError::ConnectionError(format!("{:?}", err)))?;
        let login_api = LoginApiV4::new(client, central_server_url.clone());
        let username = &input.username;
        let password = &input.password;
        let user_data = login_api
            .login(LoginInputV4 {
                username: username.clone(),
                password: password.clone(),
                login_type: LoginUserTypeV4::User,
            })
            .await
            .map_err(|err| {
                FetchUserError::ConnectionError(format!(
                    "Failed to reach the central server to fetch data for {}: {:?}",
                    username, err
                ))
            })?;
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

        // convert user_info to internal format
        let user = UserAccountRow {
            id: user_info.user.id,
            username: username.to_string(),
            hashed_password: UserAccountService::hash_password(&password)
                .map_err(|err| FetchUserError::InternalError(format!("{:?}", err)))?,
            email: match user_info.user.e_mail.as_str() {
                // TODO do this using serde
                "" => None,
                _ => Some(user_info.user.e_mail.to_string()),
            },
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
                let permissions = permissions_to_domain(permissions)
                    .into_iter()
                    .map(|(resource, permission)| UserPermissionRow {
                        id: uuid(),
                        user_id: user_store_join.user_id.clone(),
                        store_id: Some(user_store_join.store_id.clone()),
                        resource,
                        permission,
                    })
                    .collect();
                StorePermissions {
                    user_store_join,
                    permissions,
                }
            })
            .collect();
        Ok((user, stores_permissions))
    }

    fn update_user(
        service_ctx: &ServiceContext,
        user: UserAccountRow,
        store_permissions: Vec<StorePermissions>,
    ) -> Result<(), RepositoryError> {
        let service = UserAccountService::new(&service_ctx.connection);
        service.upsert_user(user, store_permissions)?;
        Ok(())
    }
}

impl From<RepositoryError> for LoginError {
    fn from(err: RepositoryError) -> Self {
        LoginError::InternalError(format!("{:?}", err))
    }
}

fn update_permission(
    output: &mut HashMap<Resource, Permission>,
    resource: Resource,
    per: Permission,
) {
    let existing_per = output.entry(resource).or_insert(per.clone());
    match existing_per {
        Permission::Query => *existing_per = per,
        Permission::Mutate => match per {
            Permission::Query => {}
            Permission::Mutate => *existing_per = per,
        },
    }
}

fn permissions_to_domain(permissions: Vec<Permissions>) -> HashMap<Resource, Permission> {
    let mut output = HashMap::new();
    for per in permissions {
        match per {
            // stocktake
            // TODO: correct
            Permissions::ViewStock => {
                update_permission(&mut output, Resource::Stocktake, Permission::Query)
            }
            Permissions::CreateStocktake => {
                update_permission(&mut output, Resource::Stocktake, Permission::Mutate)
            }
            Permissions::DeleteStocktake => {
                update_permission(&mut output, Resource::Stocktake, Permission::Mutate)
            }
            // stocktake lines
            Permissions::ViewStocktakeLines => {
                update_permission(&mut output, Resource::Stocktake, Permission::Query)
            }
            Permissions::AddStocktakeLines => {
                update_permission(&mut output, Resource::Stocktake, Permission::Mutate)
            }
            Permissions::EditStocktakeLines => {
                update_permission(&mut output, Resource::Stocktake, Permission::Mutate)
            }
            Permissions::DeleteStocktakeLines => {
                update_permission(&mut output, Resource::Stocktake, Permission::Mutate)
            }
            // customer invoices
            Permissions::ViewCustomerInvoices => {
                update_permission(&mut output, Resource::OutboundShipment, Permission::Query)
            }
            Permissions::CreateCustomerInvoices => {
                update_permission(&mut output, Resource::OutboundShipment, Permission::Mutate)
            }
            Permissions::EditCustomerInvoices => {
                update_permission(&mut output, Resource::OutboundShipment, Permission::Mutate)
            }
            // supplier invoices
            Permissions::ViewSupplierInvoices => {
                update_permission(&mut output, Resource::InboundShipment, Permission::Query)
            }
            Permissions::EditSupplierInvoices => {
                update_permission(&mut output, Resource::InboundShipment, Permission::Mutate)
            }
            Permissions::CreateSupplierInvoices => {
                update_permission(&mut output, Resource::InboundShipment, Permission::Mutate)
            }
            // requisitions
            Permissions::ViewRequisitions => {
                update_permission(&mut output, Resource::Requisition, Permission::Query)
            }
            Permissions::CreateAndEditRequisitions => {
                update_permission(&mut output, Resource::Requisition, Permission::Mutate)
            }

            _ => continue,
        }
    }
    output
}

#[cfg(test)]
mod test {
    use std::sync::RwLock;

    use httpmock::{Method::POST, MockServer};
    use repository::{
        mock::MockDataInserts, test_db::setup_all, EqualFilter, UserFilter, UserPermissionFilter,
        UserPermissionRepository, UserRepository,
    };

    use crate::{
        apis::login_v4::LoginResponseV4, auth_data::AuthData, login::LoginInput,
        login_mock_data::LOGIN_V4_RESPONSE_1, service_provider::ServiceProvider,
        token_bucket::TokenBucket,
    };

    use super::LoginService;

    #[actix_rt::test]
    async fn central_login_test() {
        let (_, _, connection_manager, _) =
            setup_all("login_test", MockDataInserts::none().names().stores()).await;
        let service_provider = ServiceProvider::new(connection_manager);

        let mock_server = MockServer::start();
        mock_server.mock(|when, then| {
            when.method(POST).path("/api/v4/login".to_string());
            then.status(200).body(LOGIN_V4_RESPONSE_1);
        });

        let central_server_url = mock_server.base_url();
        let auth_data = AuthData {
            auth_token_secret: "secret".to_string(),
            token_bucket: RwLock::new(TokenBucket::new()),
            debug_no_ssl: true,
            debug_no_access_control: false,
        };
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

        let expected: LoginResponseV4 = serde_json::from_str(LOGIN_V4_RESPONSE_1).unwrap();
        let expected_user_info = expected.user_info.unwrap();

        let context = service_provider.context().unwrap();
        let user = UserRepository::new(&context.connection)
            .query_one(UserFilter::new().id(EqualFilter::equal_to(&expected_user_info.user.id)))
            .unwrap()
            .unwrap();
        assert_eq!(expected_user_info.user.name, user.user_row.username);
        assert_eq!(
            expected_user_info.user_stores.first().unwrap().store_id,
            user.stores.first().unwrap().store_row.id
        );

        let permissions = UserPermissionRepository::new(&context.connection)
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(&expected_user_info.user.id)),
            )
            .unwrap();
        assert_eq!(4, permissions.len());
    }
}
