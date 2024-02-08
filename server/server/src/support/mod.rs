use actix_web::web::{self};
// use service::{
//     auth::{validate_auth, AuthDeniedKind, AuthError, Resource, ResourceAccessRequest},
//     auth_data::AuthData,
//     service_provider::{ServiceContext, ServiceProvider},
//     user_account::UserAccountService,
// };

mod database;
use database::get_database;

const URL_PATH: &str = "/support";

pub fn config_support(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{}{}", URL_PATH, "/database"),
        web::get().to(get_database),
    );
}

// fn validate_request(
//     request: HttpRequest,
//     service_provider: &ServiceProvider,
//     auth_data: &AuthData,
// ) -> Result<(String, String), AuthError> {
//     let service_context = service_provider
//         .basic_context()
//         .map_err(|err| AuthError::Denied(AuthDeniedKind::NotAuthenticated(err.to_string())))?;
//     let token = match request.cookie(COOKIE_NAME) {
//         Some(cookie) => Some(cookie.value().to_string()),
//         None => None,
//     };

//     validate_access(&service_provider, &service_context, &auth_data, token)
// }

// /// Validates current user is authenticated and authorized
// pub fn validate_access(
//     service_provider: &ServiceProvider,
//     service_context: &ServiceContext,
//     auth_data: &AuthData,
//     token: Option<String>,
// ) -> Result<(String, String), AuthError> {
//     let user_service = UserAccountService::new(&service_context.connection);
//     let validated_user = validate_auth(auth_data, &token)?;
//     let store_id = match user_service.find_user(&validated_user.user_id)? {
//         Some(user) => {
//             let store_id = match user.default_store() {
//                 Some(store) => store.store_row.id.clone(),
//                 None => return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
//                     "No default store found for user, or default store is not active on current site".to_string(),
//                 ))),
//             };
//             store_id
//         }
//         None => {
//             return Err(AuthError::InternalError(
//                 "User not found in database".to_string(),
//             ))
//         }
//     };

//     let access_request = ResourceAccessRequest {
//         resource: Resource::ColdChainApi,
//         store_id: Some(store_id.clone()),
//     };

//     let validated_user = service_provider.validation_service.validate(
//         service_context,
//         auth_data,
//         &token,
//         &access_request,
//     )?;
//     Ok((validated_user.user_id, store_id))
// }
