use log::error;
use repository::{StorageConnection, StorageConnectionManager};

use crate::{
    auth_data::AuthData,
    permissions::{ApiRole, PermissionService, UserPermissions},
    token::{JWTValidationError, OmSupplyClaim, TokenService},
};

pub struct ValidationUserData {
    pub user_id: String,
    pub permissions: UserPermissions,
}

/// Returns the permission name and an error if validation failed
pub type PermissionChecker = Box<dyn FnOnce(&ValidationUserData) -> (String, Option<String>)>;

pub fn any(checkers: Vec<PermissionChecker>) -> PermissionChecker {
    let checker: PermissionChecker = Box::new(|data: &ValidationUserData| {
        let mut checked_msg = "any of:".to_string();
        for c in checkers {
            let (name, error) = c(data);
            if let None = error {
                return (name, None);
            }
            checked_msg.push_str(&name);
        }
        (checked_msg.to_owned(), Some(format!("Not {}", checked_msg)))
    });
    checker
}

pub fn has_api_role(role: ApiRole) -> PermissionChecker {
    Box::new(move |data: &ValidationUserData| {
        let name = "api role".to_string();
        if let Some(_) = data.permissions.api.iter().find(|r| r == &&ApiRole::Admin) {
            return (name, None);
        }
        if let Some(_) = data.permissions.api.iter().find(|r| r == &&role) {
            return (name, None);
        }
        (name, Some("Missing api role".to_string()))
    })
}

#[derive(Debug)]
pub enum ValidationDeniedKind {
    NotAuthenticated(String),
    InsufficientPermission((String, UserPermissions)),
}

pub fn validation_denied_kind_to_string(kind: ValidationDeniedKind) -> String {
    match kind {
        ValidationDeniedKind::NotAuthenticated(msg) => format!("Not authenticated: {}", msg),
        ValidationDeniedKind::InsufficientPermission((msg, _)) => {
            format!("Insufficient permission: {}", msg)
        }
    }
}

#[derive(Debug)]
pub enum ValidationError {
    Denied(ValidationDeniedKind),
    InternalError(String),
}

pub struct ValidatedUserAuth {
    pub user_id: String,
    pub claims: OmSupplyClaim,
}

/// Validates user is auth (no permissions checked)
pub fn validate_auth(
    auth_data: &AuthData,
    auth_token: &Option<String>,
) -> Result<ValidatedUserAuth, ValidationError> {
    let auth_token = match auth_token {
        Some(token) => token,
        None => {
            return Err(ValidationError::Denied(
                ValidationDeniedKind::NotAuthenticated("Missing auth token".to_string()),
            ))
        }
    };
    let service = TokenService::new(
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
    );
    let claims = match service.verify_token(auth_token) {
        Ok(claims) => claims,
        Err(err) => {
            let e = match err {
                JWTValidationError::ExpiredSignature => todo!(),
                JWTValidationError::NotAnApiToken => ValidationError::Denied(
                    ValidationDeniedKind::NotAuthenticated("Not an api token".to_string()),
                ),
                JWTValidationError::InvalidToken(_) => ValidationError::Denied(
                    ValidationDeniedKind::NotAuthenticated("Invalid token".to_string()),
                ),
                JWTValidationError::TokenInvalided => {
                    ValidationError::Denied(ValidationDeniedKind::NotAuthenticated(
                        "Token has been invalided on the server".to_string(),
                    ))
                }
                JWTValidationError::ConcurrencyLockError(_) => {
                    ValidationError::InternalError("Lock error".to_string())
                }
            };
            return Err(e);
        }
    };
    let user_id = claims.sub.to_owned();
    return Ok(ValidatedUserAuth { user_id, claims });
}

pub struct ValidatedUser {
    pub user_id: String,
    pub claims: OmSupplyClaim,
    pub permissions: UserPermissions,
    /// For convenience the connection that is used to validate the user is passed on for further
    /// use.
    pub connection: StorageConnection,
}

/// Validates user is authenticated and authorized
pub fn validate(
    connection_manager: &StorageConnectionManager,
    auth_data: &AuthData,
    auth_token: &Option<String>,
    checkers: Vec<PermissionChecker>,
) -> Result<ValidatedUser, ValidationError> {
    let validated_auth = validate_auth(auth_data, auth_token)?;

    // TODO not used yet here but will be needed later for the PermissionService
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            error!("validate: Failed to get connection: {}", err);
            return Err(ValidationError::InternalError(
                "Failed to connect to database".to_string(),
            ));
        }
    };
    let permission_service = PermissionService::new();
    let permissions = permission_service.permissions(&validated_auth.user_id);
    let validation_data = ValidationUserData {
        user_id: validated_auth.user_id,
        permissions,
    };
    for c in checkers {
        let (_, error) = c(&validation_data);
        if let Some(msg) = error {
            return Err(ValidationError::Denied(
                ValidationDeniedKind::InsufficientPermission((msg, validation_data.permissions)),
            ));
        }
    }

    Ok(ValidatedUser {
        user_id: validation_data.user_id,
        claims: validated_auth.claims,
        permissions: validation_data.permissions,
        connection,
    })
}

#[cfg(test)]
mod permission_validation_test {
    use std::sync::RwLock;

    use super::*;
    use crate::{auth_data::AuthData, token_bucket::TokenBucket};
    use repository::{get_storage_connection_manager, test_db};

    #[actix_rt::test]
    async fn test_basic_permission_validation() {
        let auth_data = AuthData {
            auth_token_secret: "some secret".to_string(),
            token_bucket: RwLock::new(TokenBucket::new()),
            debug_no_ssl: true,
        };
        let user_id = "test_user_id";
        let mut service = TokenService::new(
            &auth_data.token_bucket,
            auth_data.auth_token_secret.as_bytes(),
        );
        let token_pair = service.jwt_token(user_id, 60, 120).unwrap();

        let settings =
            test_db::get_test_db_settings("omsupply-database-basic_permission_validation");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);

        // validate user doesn't has Admin access
        assert!(validate(
            &connection_manager,
            &auth_data,
            &Some(token_pair.token.to_owned()),
            vec![has_api_role(ApiRole::Admin)],
        )
        .is_err());

        // validate user has User access
        validate(
            &connection_manager,
            &auth_data,
            &Some(token_pair.token.to_owned()),
            vec![has_api_role(ApiRole::User)],
        )
        .unwrap();
    }
}
