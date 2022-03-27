use std::{collections::HashMap, sync::Arc};

use crate::{
    auth_data::AuthData,
    permissions::{ApiRole, PermissionServiceTrait, StoreRole, UserPermissions},
    service_provider::ServiceContext,
    token::{JWTValidationError, OmSupplyClaim, TokenService},
};

#[derive(Debug)]
pub enum PermissionDSL {
    HasApiRole(ApiRole),
    HasStoreAccess(StoreRole),
    And(Vec<PermissionDSL>),
    Any(Vec<PermissionDSL>),
}

/// Resources for permission checks
#[derive(Debug, PartialEq, Eq, Hash)]
pub enum Resource {
    RouteMe,
    // stocktake
    QueryStocktake,
    MutateStocktake,
    // requisition
    QueryRequisition,
    MutateRequisition,
    // stock take line
    InsertStockTakeLine,
    UpdateStockTakeLine,
    DeleteStockTakeLine,
    // outbound shipment
    MutateOutboundShipment,
    // inbound shipment
    MutateInboundShipment,
}

fn default() -> PermissionDSL {
    PermissionDSL::And(vec![
        PermissionDSL::HasApiRole(ApiRole::User),
        PermissionDSL::HasStoreAccess(StoreRole::User),
    ])
}

fn all_permissions() -> HashMap<Resource, PermissionDSL> {
    let mut map = HashMap::new();
    // me
    map.insert(Resource::RouteMe, PermissionDSL::HasApiRole(ApiRole::User));
    // stocktake
    map.insert(Resource::QueryStocktake, default());
    map.insert(Resource::MutateStocktake, default());
    // requisition
    map.insert(Resource::QueryRequisition, default());
    map.insert(Resource::MutateRequisition, default());
    // stock take line
    map.insert(Resource::InsertStockTakeLine, default());
    map.insert(Resource::UpdateStockTakeLine, default());
    map.insert(Resource::DeleteStockTakeLine, default());
    // outbound shipment
    map.insert(Resource::MutateOutboundShipment, default());
    // inbound shipment
    map.insert(Resource::MutateInboundShipment, default());
    map
}

#[derive(Debug)]
pub enum ValidationDeniedKind {
    NotAuthenticated(String),
    InsufficientPermission((String, UserPermissions)),
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

fn dummy_user_auth() -> ValidatedUserAuth {
    let user_id = "dummy_user";
    ValidatedUserAuth {
        user_id: user_id.to_string(),
        claims: OmSupplyClaim {
            exp: 0,
            aud: crate::token::Audience::Api,
            iat: 0,
            iss: "omSupply-debug".to_string(),
            sub: user_id.to_string(),
        },
    }
}

/// Validates user is auth (no permissions checked)
pub fn validate_auth(
    auth_data: &AuthData,
    auth_token: &Option<String>,
) -> Result<ValidatedUserAuth, ValidationError> {
    if auth_data.debug_no_access_control {
        return Ok(dummy_user_auth());
    }

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
    let claims = match service.verify_token(auth_token, None) {
        Ok(claims) => claims,
        Err(err) => {
            let e = match err {
                JWTValidationError::ExpiredSignature => ValidationError::Denied(
                    ValidationDeniedKind::NotAuthenticated("Expired signature".to_string()),
                ),
                JWTValidationError::NotAnApiToken => ValidationError::Denied(
                    ValidationDeniedKind::NotAuthenticated("Not an api token".to_string()),
                ),
                JWTValidationError::InvalidToken(_) => ValidationError::Denied(
                    ValidationDeniedKind::NotAuthenticated("Invalid token".to_string()),
                ),
                JWTValidationError::TokenInvalidated => {
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
}

/// Information about the resource a user wants to access
pub struct ResourceAccessRequest {
    pub resource: Resource,
    /// The store id if specified
    pub store_id: Option<String>,
}

fn validate_resource_permissions(
    user_id: &str,
    user_permissions: &UserPermissions,
    resource_request: &ResourceAccessRequest,
    resource_permission: &PermissionDSL,
) -> Result<(), String> {
    Ok(match resource_permission {
        PermissionDSL::HasApiRole(role) => {
            if user_permissions.api.contains(&ApiRole::Admin) {
                return Ok(());
            }
            if !user_permissions.api.contains(role) {
                return Err(format!("Missing api role: {:?}", role));
            }
        }
        PermissionDSL::HasStoreAccess(store_role) => {
            // give admin users access to any store
            if user_permissions.api.contains(&ApiRole::Admin) {
                return Ok(());
            }
            let store_id = match &resource_request.store_id {
                Some(id) => id,
                None => return Err("Store id not specified in request".to_string()),
            };
            let store_roles = match user_permissions.stores.get(store_id) {
                Some(roles) => roles,
                None => return Err(format!("Missing store role: {:?}", store_role)),
            };
            if !store_roles.contains(store_role) {
                return Err(format!("Missing store role: {:?}", store_role));
            }
        }
        PermissionDSL::And(children) => {
            for child in children {
                if let Err(err) = validate_resource_permissions(
                    user_id,
                    user_permissions,
                    resource_request,
                    child,
                ) {
                    return Err(err);
                }
            }
        }
        PermissionDSL::Any(children) => {
            for child in children {
                if let Ok(_) = validate_resource_permissions(
                    user_id,
                    user_permissions,
                    resource_request,
                    child,
                ) {
                    ()
                }
            }
            return Err(format!("No permissions for any of: {:?}", children));
        }
    })
}

pub trait ValidationServiceTrait: Send + Sync {
    fn validate(
        &self,
        ctx: &ServiceContext,
        auth_data: &AuthData,
        auth_token: &Option<String>,
        resource_request: &ResourceAccessRequest,
    ) -> Result<ValidatedUser, ValidationError>;
}

pub struct ValidationService {
    pub permission_service: Arc<dyn PermissionServiceTrait>,
    pub permissions: HashMap<Resource, PermissionDSL>,
}

impl ValidationService {
    pub fn new(permission_service: Arc<dyn PermissionServiceTrait>) -> Self {
        ValidationService {
            permission_service,
            permissions: all_permissions(),
        }
    }
}

impl ValidationServiceTrait for ValidationService {
    fn validate(
        &self,
        _: &ServiceContext,
        auth_data: &AuthData,
        auth_token: &Option<String>,
        resource_request: &ResourceAccessRequest,
    ) -> Result<ValidatedUser, ValidationError> {
        let validated_auth = validate_auth(auth_data, auth_token)?;
        let permissions = self.permission_service.permissions(&validated_auth.user_id);

        let resource_permissions = self.permissions.get(&resource_request.resource).ok_or(
            ValidationError::InternalError(format!(
                "Internal error: Resource {:?} has no permissions set!",
                resource_request.resource
            )),
        )?;

        match validate_resource_permissions(
            &validated_auth.user_id,
            &permissions,
            &resource_request,
            resource_permissions,
        ) {
            Ok(_) => {}
            Err(err) => {
                return Err(ValidationError::Denied(
                    ValidationDeniedKind::InsufficientPermission((err, permissions)),
                ));
            }
        };

        Ok(ValidatedUser {
            user_id: validated_auth.user_id,
            claims: validated_auth.claims,
            permissions,
        })
    }
}

#[cfg(test)]
mod permission_validation_test {
    use std::sync::RwLock;

    use super::*;
    use crate::{
        auth_data::AuthData, permissions::PermissionService, service_provider::ServiceProvider,
        token_bucket::TokenBucket,
    };
    use repository::{get_storage_connection_manager, test_db};

    #[actix_rt::test]
    async fn test_basic_permission_validation() {
        let auth_data = AuthData {
            auth_token_secret: "some secret".to_string(),
            token_bucket: RwLock::new(TokenBucket::new()),
            debug_no_ssl: true,
            debug_no_access_control: false,
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
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();

        let mut service = ValidationService::new(Arc::new(PermissionService {
            user_permissions: UserPermissions {
                api: vec![ApiRole::User],
                stores: HashMap::new(),
            },
        }));
        service.permissions.clear();
        service
            .permissions
            .insert(Resource::RouteMe, PermissionDSL::HasApiRole(ApiRole::Admin));
        let resource_access_request = ResourceAccessRequest {
            resource: Resource::RouteMe,
            store_id: None,
        };
        // validate user doesn't has Admin access
        assert!(service
            .validate(
                &context,
                &auth_data,
                &Some(token_pair.token.to_owned()),
                &resource_access_request
            )
            .is_err());

        // validate user has User access
        service
            .permissions
            .insert(Resource::RouteMe, PermissionDSL::HasApiRole(ApiRole::User));
        service
            .validate(
                &context,
                &auth_data,
                &Some(token_pair.token.to_owned()),
                &resource_access_request,
            )
            .unwrap();
    }
}
