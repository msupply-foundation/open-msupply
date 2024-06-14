use chrono::NaiveDateTime;
use log::info;
use repository::{RepositoryError, UserAccountRow, UserAccountRowRepository};

use crate::{
    auth_data::AuthData,
    login::{FetchUserError, LoginError, LoginFailure, LoginInput, LoginService, UpdateUserError},
    service_provider::ServiceProvider,
};

pub struct SyncUser {}

// Re-login to central server with user credentials to update latest user info
// (mainly user permissions)
impl SyncUser {
    pub async fn update_user(
        service_provider: &ServiceProvider,
        auth_data: &AuthData,
        user_id: &str,
    ) -> Result<UserAccountRow, LoginError> {
        let ctx = service_provider.basic_context()?;

        let central_server_url = service_provider
            .settings
            .sync_settings(&ctx)?
            .ok_or(LoginError::InternalError(
                "Cannot find sync settings".to_string(),
            ))?
            .url;
        let username = UserAccountRowRepository::new(&ctx.connection)
            .find_one_by_id(user_id)?
            .ok_or(LoginError::FetchUserError(FetchUserError::InternalError(
                "Could not find user".to_string(),
            )))?
            .username;
        let password = get_password(auth_data, user_id);
        if password.is_empty() {
            return Err(LoginError::UpdateUserError(
                UpdateUserError::MissingCredentials,
            ));
        }

        match LoginService::fetch_user_from_central(&LoginInput {
            username,
            password: password.clone(),
            central_server_url,
        })
        .await
        {
            Ok(user_info) => {
                let service_ctx =
                    service_provider.context("".to_string(), user_info.user.id.clone())?;
                LoginService::update_user(&service_ctx, &password, user_info)
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
                FetchUserError::ConnectionError(_) => return Err(LoginError::FetchUserError(err)),
                FetchUserError::InternalError(_) => info!("{:?}", err),
            },
        };

        let user = UserAccountRowRepository::new(&ctx.connection)
            .find_one_by_id(user_id)?
            .ok_or(LoginError::DatabaseError(RepositoryError::NotFound))?;

        Ok(user)
    }

    pub fn get_latest_successful_user_sync(
        service_provider: &ServiceProvider,
        user_id: &str,
    ) -> Result<Option<NaiveDateTime>, RepositoryError> {
        let ctx: crate::service_provider::ServiceContext = service_provider.basic_context()?;

        let user = UserAccountRowRepository::new(&ctx.connection)
            .find_one_by_id(user_id)?
            .ok_or(RepositoryError::NotFound)?;

        Ok(user.last_successful_sync)
    }
}

fn get_password(auth_data: &AuthData, user_id: &str) -> String {
    let token_bucket = auth_data
        .token_bucket
        .read()
        .map_err(|_| LoginError::InternalError("Concurrent error".to_string()))
        .unwrap();

    token_bucket.get_password(user_id)
}
