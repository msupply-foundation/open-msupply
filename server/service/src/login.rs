use std::{
    collections::HashSet,
    time::{Duration, SystemTime},
};

use bcrypt::BcryptError;
use chrono::Utc;
use log::info;
use repository::{
    ActivityLogType, Language, Permission, RepositoryError, UserAccountRow, UserPermissionRow,
    UserStoreJoinRow,
};
use reqwest::{ClientBuilder, Url};
use serde::{Deserialize, Serialize};
use util::uuid::uuid;

use crate::{
    activity_log::activity_log_entry,
    apis::{
        login_v4::{
            LoginApiV4, LoginInputV4, LoginStatusV4, LoginUserInfoV4, LoginUserTypeV4, LoginV4Error,
        },
        permissions::{map_api_permissions, Permissions},
    },
    auth_data::AuthData,
    service_provider::{ServiceContext, ServiceProvider},
    settings::is_develop,
    token::{JWTIssuingError, TokenPair, TokenService},
    user_account::{StorePermissions, UserAccountService, VerifyPasswordError},
};

const CONNECTION_TIMEOUT_SEC: u64 = 10;

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
    /// Either user does not exit or wrong password
    InvalidCredentials,
    /// User account is blocked due to too many failed login attempts
    AccountBlocked(u64),
}

#[derive(Debug)]
pub enum LoginError {
    /// Either user does not exit or wrong password
    LoginFailure(LoginFailure),
    FailedToGenerateToken(JWTIssuingError),
    FetchUserError(FetchUserError),
    UpdateUserError(UpdateUserError),
    InternalError(String),
    DatabaseError(RepositoryError),
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
                let elapsed = now.elapsed().unwrap_or(Duration::from_secs(0));
                let minimum = Duration::from_secs(min_err_response_time_sec);
                if elapsed < minimum {
                    tokio::time::sleep(minimum - elapsed).await;
                }

                Err(err)
            }
        }
    }

    async fn do_login(
        service_provider: &ServiceProvider,
        auth_data: &AuthData,
        input: LoginInput,
    ) -> Result<TokenPair, LoginError> {
        let mut username = input.username.clone();
        match LoginService::fetch_user_from_central(&input).await {
            Ok(user_info) => {
                let service_ctx =
                    service_provider.context("".to_string(), user_info.user.id.clone())?;
                username = user_info.user.name.clone();
                LoginService::update_user(&service_ctx, &input.password, user_info)
                    .map_err(|e| LoginError::UpdateUserError(e))?;
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
                FetchUserError::ConnectionError(_) => info!("{:?}", err),
                FetchUserError::InternalError(_) => info!("{:?}", err),
            },
        };
        let mut service_ctx = service_provider.basic_context()?;
        let user_service = UserAccountService::new(&service_ctx.connection);
        let user_account = match user_service.verify_password(&username, &input.password) {
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
                });
            }
        };
        service_ctx.user_id = user_account.id.clone();

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
        let max_age_token = chrono::Duration::minutes(60).num_seconds() as usize;
        let max_age_refresh = chrono::Duration::hours(6).num_seconds() as usize;

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

    pub async fn fetch_user_from_central(
        input: &LoginInput,
    ) -> Result<LoginUserInfoV4, FetchUserError> {
        // Prepare central login query
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

        // Try login with central
        let login_result = login_api
            .login(LoginInputV4 {
                username: username.clone(),
                password: password.clone(),
                login_type: LoginUserTypeV4::User,
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
                        "Failed to reach the central server to fetch data for {}: {:?}",
                        username, err
                    )))
                }
                LoginV4Error::ParseError(_) => {
                    return Err(FetchUserError::InternalError(format!(
                        "Failed to parse central server response for {}: {:?}",
                        username, err
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
        // convert user_info to internal format
        let user = UserAccountRow {
            id: user_info.user.id,
            username: user_info.user.name.to_string(),
            hashed_password: UserAccountService::hash_password(&password)
                .map_err(UpdateUserError::PasswordHashError)?,
            email: user_info.user.e_mail,
            language: match user_info.user.language {
                0 => Language::English,
                1 => Language::French,
                2 => Language::Spanish,
                3 => Language::Laos,
                4 => Language::Khmer,
                5 => Language::Portuguese,
                6 => Language::Russian,
                7 => Language::Tetum,
                _ => Language::English,
            },
            first_name: user_info.user.first_name,
            last_name: user_info.user.last_name,
            phone_number: user_info.user.phone1,
            job_title: user_info.user.job_title,
            last_successful_sync: Utc::now().naive_utc(),
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
                permission_set.insert(Permission::StoreAccess);
                let permissions = permission_set
                    .into_iter()
                    .map(|permission| UserPermissionRow {
                        id: uuid(),
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
            .map_err(|e| UpdateUserError::DatabaseError(e))?;
        Ok(())
    }
}

impl From<RepositoryError> for LoginError {
    fn from(err: RepositoryError) -> Self {
        LoginError::InternalError(format!("{:?}", err))
    }
}

fn permissions_to_domain(permissions: Vec<Permissions>) -> HashSet<Permission> {
    let mut output = HashSet::new();
    for per in permissions {
        match per {
            // admin
            Permissions::AccessServerAdministration => {
                output.insert(Permission::ServerAdmin);
            }
            // location
            Permissions::ManageLocations => {
                output.insert(Permission::LocationMutate);
            }
            // sensor
            Permissions::EditSensorLocation => {
                output.insert(Permission::SensorMutate);
            }
            Permissions::ViewSensorDetails => {
                output.insert(Permission::SensorQuery);
            }
            // stock line
            // stock line & stocktake lines
            Permissions::ViewStock => {
                output.insert(Permission::StockLineQuery);
                output.insert(Permission::StocktakeQuery);
            }
            Permissions::EditStock => {
                output.insert(Permission::StockLineMutate);
            }
            Permissions::CreateRepacksOrSplitStock => {
                output.insert(Permission::CreateRepack);
            }
            // stocktake
            Permissions::CreateStocktake => {
                output.insert(Permission::StocktakeMutate);
            }
            Permissions::DeleteStocktake => {
                output.insert(Permission::StocktakeMutate);
            }
            Permissions::AddStocktakeLines => {
                output.insert(Permission::StocktakeMutate);
            }
            Permissions::EditStocktakeLines => {
                output.insert(Permission::StocktakeMutate);
            }
            Permissions::DeleteStocktakeLines => {
                output.insert(Permission::StocktakeMutate);
            }
            // customer invoices
            Permissions::ViewCustomerInvoices => {
                output.insert(Permission::OutboundShipmentQuery);
                output.insert(Permission::InboundReturnQuery);
                output.insert(Permission::PrescriptionQuery);
            }
            Permissions::CreateCustomerInvoices => {
                output.insert(Permission::OutboundShipmentMutate);
                output.insert(Permission::PrescriptionMutate);
            }
            Permissions::EditCustomerInvoices => {
                output.insert(Permission::OutboundShipmentMutate);
                output.insert(Permission::PrescriptionMutate);
            }
            // supplier invoices
            Permissions::ViewSupplierInvoices => {
                output.insert(Permission::InboundShipmentQuery);
                output.insert(Permission::OutboundReturnQuery);
            }
            Permissions::EditSupplierInvoices => {
                output.insert(Permission::InboundShipmentMutate);
            }
            Permissions::CreateSupplierInvoices => {
                output.insert(Permission::InboundShipmentMutate);
            }
            // returns
            Permissions::ReturnStockFromSupplierInvoices => {
                output.insert(Permission::OutboundReturnMutate);
            }
            Permissions::ReturnStockFromCustomerInvoices => {
                output.insert(Permission::InboundReturnMutate);
            }
            // requisitions
            Permissions::ViewRequisitions => {
                output.insert(Permission::RequisitionQuery);
            }
            Permissions::CreateAndEditRequisitions => {
                output.insert(Permission::RequisitionMutate);
            }
            Permissions::ConfirmInternalOrderSent => {
                output.insert(Permission::RequisitionSend);
            }
            // reports
            Permissions::ViewReports => {
                output.insert(Permission::Report);
            }
            // log
            Permissions::ViewLog => {
                output.insert(Permission::LogQuery);
            }
            // patient
            Permissions::AddPatients => {
                output.insert(Permission::PatientMutate);
            }
            Permissions::EditPatientDetails => {
                output.insert(Permission::PatientMutate);
            }
            Permissions::ViewPatients => {
                output.insert(Permission::PatientQuery);
            }
            // items
            Permissions::EditItems => {
                output.insert(Permission::ItemMutate);
            }
            Permissions::EditItemNamesCodesAndUnits => {
                output.insert(Permission::ItemNamesCodesAndUnitsMutate);
            }
            // cold chain
            Permissions::ColdChainApi => {
                output.insert(Permission::ColdChainApi);
            }
            // assets
            Permissions::ViewAssets => {
                output.insert(Permission::AssetQuery);
            }
            Permissions::AddEditAssets => {
                output.insert(Permission::AssetMutate);
            }
            Permissions::SetupAssets => {
                output.insert(Permission::AssetCatalogueItemMutate);
            }
            _ => continue,
        }
    }
    output
}

#[cfg(test)]
mod test {
    use std::sync::{Arc, RwLock};

    use httpmock::{Method::POST, MockServer};
    use repository::{
        mock::MockDataInserts, test_db::setup_all, EqualFilter, UserFilter, UserPermissionFilter,
        UserPermissionRepository, UserRepository,
    };
    use util::assert_matches;

    use crate::{
        apis::login_v4::LoginResponseV4,
        auth_data::AuthData,
        login::{LoginError, LoginFailure, LoginInput},
        login_mock_data::LOGIN_V4_RESPONSE_1,
        service_provider::ServiceProvider,
        token_bucket::TokenBucket,
    };

    use super::LoginService;

    #[actix_rt::test]
    async fn central_login_test() {
        let (_, _, connection_manager, _) =
            setup_all("login_test", MockDataInserts::none().names().stores()).await;
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context("".to_string(), "".to_string())
            .unwrap();

        let auth_data = AuthData {
            auth_token_secret: "secret".to_string(),
            token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
            no_ssl: true,
            debug_no_access_control: false,
        };

        let expected: LoginResponseV4 = serde_json::from_str(LOGIN_V4_RESPONSE_1).unwrap();
        let expected_user_info = expected.user_info.unwrap();

        {
            let mock_server = MockServer::start();
            mock_server.mock(|when, then| {
                when.method(POST).path("/api/v4/login".to_string());
                then.status(200).body(LOGIN_V4_RESPONSE_1);
            });

            let central_server_url = mock_server.base_url();

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
            assert!(permissions.len() > 0);
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

            assert_matches!(result, Ok(_));
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
        // If central server is not accessible after trying to login with old password, make sure old password does not work
        // Issue #1101 in remote-server: Extra login protection when user password has changed
        // {
        //     let mock_server = MockServer::start();
        //     mock_server.mock(|when, then| {
        //         when.method(POST).path("/api/v4/login".to_string());
        //         then.status(500);
        //     });

        //     let central_server_url = mock_server.base_url();

        //     let result = LoginService::login(
        //         &service_provider,
        //         &auth_data,
        //         LoginInput {
        //             username: "Gryffindor".to_string(),
        //             password: "password".to_string(),
        //             central_server_url,
        //         },
        //         0,
        //     )
        //     .await;

        //     assert!(
        //         matches!(result, Err(LoginError::LoginFailure)),
        //         "expected LoginFailure, got {:#?}",
        //         result
        //     );
        // }
    }
}
