use std::collections::HashMap;

use repository::{
    EqualFilter, Pagination, Permission, RepositoryError, UserPermissionFilter,
    UserPermissionRepository, UserPermissionRow,
};
use util::{constants::PATIENT_CONTEXT_ID, uuid::uuid};

use crate::{
    auth_data::AuthData,
    service_provider::ServiceContext,
    settings::is_develop,
    token::{JWTValidationError, OmSupplyClaim, TokenService},
};

#[derive(Debug, Clone)]
pub enum PermissionDSL {
    HasPermission(Permission),
    /// The matching permission context for the Permission will be extracted and added to the user's
    /// capabilities.
    HasDynamicPermission(Permission),
    NoPermissionRequired,
    HasStoreAccess,
    And(Vec<PermissionDSL>),
    Any(Vec<PermissionDSL>),
}

/// Resources for permission checks
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Resource {
    RouteMe,
    // name
    QueryName,
    // location
    QueryLocation,
    MutateLocation,
    // sensor
    QuerySensor,
    MutateSensor,
    // temperature log
    QueryTemperatureLog,
    // temperature breach
    QueryTemperatureBreach,
    MutateTemperatureBreach,
    // store
    QueryStore,
    // master list
    QueryMasterList,
    // items
    QueryItems,
    MutateItems,
    MutateItemNamesCodesAndUnits,
    // stock
    StockCount,
    QueryStockLine,
    MutateStockLine,
    CreateRepack,
    // stocktake
    QueryStocktake,
    MutateStocktake,
    // requisition
    QueryRequisition,
    MutateRequisition,
    RequisitionChart,
    RequisitionStats,
    RequisitionSend,
    // stock take line
    InsertStocktakeLine,
    UpdateStocktakeLine,
    DeleteStocktakeLine,
    // invoice
    InvoiceCount,
    QueryInvoice,
    // outbound shipment
    MutateOutboundShipment,
    // inbound shipment
    MutateInboundShipment,
    // outbound return
    MutateOutboundReturn,
    // inbound return
    MutateInboundReturn,
    // prescription
    MutatePrescription,
    // reporting
    Report,
    ReportDev,
    QueryLog,
    // view/edit server setting
    ServerAdmin,
    // clinician
    QueryClinician,

    // document
    QueryDocument,
    MutateDocument,
    QueryDocumentRegistry,
    MutateDocumentRegistry,
    QueryJsonSchema,
    MutateJsonSchema,
    // patient
    QueryPatient,
    MutatePatient,
    // patient program
    QueryProgram,
    QueryEncounter,
    QueryContactTrace,
    MutateProgram,
    MutateEncounter,
    MutateContactTrace,
    SyncInfo,
    ManualSync,
    QueryInventoryAdjustmentReasons,
    QueryStorePreferences,
    ColdChainApi,
    // assets
    MutateAsset,
    MutateAssetCatalogueItem,
    QueryAsset,
}

fn all_permissions() -> HashMap<Resource, PermissionDSL> {
    // TODO use match instead of map (unless there is a specific case for map)
    let mut map = HashMap::new();
    // me: No permission needed
    map.insert(Resource::RouteMe, PermissionDSL::NoPermissionRequired);
    map.insert(
        Resource::ServerAdmin,
        PermissionDSL::HasPermission(Permission::ServerAdmin),
    );

    // name
    map.insert(Resource::QueryName, PermissionDSL::HasStoreAccess);

    // location
    map.insert(Resource::QueryLocation, PermissionDSL::HasStoreAccess);
    map.insert(
        Resource::MutateLocation,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::LocationMutate),
        ]),
    );

    // sensor
    map.insert(
        Resource::QuerySensor,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::SensorQuery),
        ]),
    );
    map.insert(
        Resource::MutateSensor,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::SensorMutate),
        ]),
    );

    // temperature breach (uses sensor permissions)
    map.insert(
        Resource::QueryTemperatureBreach,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::SensorQuery),
        ]),
    );

    map.insert(
        Resource::MutateTemperatureBreach,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::SensorMutate),
        ]),
    );

    // temperature log (uses sensor permissions)
    map.insert(
        Resource::QueryTemperatureLog,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::SensorQuery),
        ]),
    );

    // store: No permission needed
    map.insert(Resource::QueryStore, PermissionDSL::NoPermissionRequired);
    // master list
    map.insert(Resource::QueryMasterList, PermissionDSL::HasStoreAccess);

    // items
    map.insert(Resource::QueryItems, PermissionDSL::HasStoreAccess);
    map.insert(
        Resource::MutateItems,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::ItemMutate),
        ]),
    );
    map.insert(
        Resource::MutateItemNamesCodesAndUnits,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::ItemNamesCodesAndUnitsMutate),
        ]),
    );

    // stock
    map.insert(
        Resource::StockCount,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StockLineQuery),
        ]),
    );
    map.insert(
        Resource::QueryStockLine,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StockLineQuery),
        ]),
    );
    map.insert(
        Resource::MutateStockLine,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StockLineMutate),
        ]),
    );
    map.insert(
        Resource::CreateRepack,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::CreateRepack),
        ]),
    );
    // stocktake
    map.insert(
        Resource::QueryStocktake,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StocktakeQuery),
        ]),
    );
    map.insert(
        Resource::MutateStocktake,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StocktakeMutate),
        ]),
    );
    // stock take line
    map.insert(
        Resource::InsertStocktakeLine,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StocktakeMutate),
        ]),
    );
    map.insert(
        Resource::UpdateStocktakeLine,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StocktakeMutate),
        ]),
    );
    map.insert(
        Resource::DeleteStocktakeLine,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::StocktakeMutate),
        ]),
    );
    // requisition
    map.insert(
        Resource::QueryRequisition,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::RequisitionQuery),
        ]),
    );
    map.insert(
        Resource::MutateRequisition,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::RequisitionMutate),
        ]),
    );
    map.insert(
        Resource::RequisitionChart,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::RequisitionQuery),
        ]),
    );
    map.insert(
        Resource::RequisitionStats,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::RequisitionQuery),
        ]),
    );
    map.insert(
        Resource::RequisitionSend,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::RequisitionSend),
        ]),
    );
    // invoice
    map.insert(
        Resource::QueryInvoice,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::OutboundShipmentQuery),
            PermissionDSL::HasPermission(Permission::InboundShipmentQuery),
            PermissionDSL::HasPermission(Permission::PrescriptionQuery),
            PermissionDSL::HasPermission(Permission::OutboundReturnQuery),
            PermissionDSL::HasPermission(Permission::InboundReturnQuery),
        ]),
    );
    map.insert(
        Resource::InvoiceCount,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::OutboundShipmentQuery),
            PermissionDSL::HasPermission(Permission::InboundShipmentQuery),
        ]),
    );
    // outbound shipment
    map.insert(
        Resource::MutateOutboundShipment,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::OutboundShipmentMutate),
        ]),
    );
    // inbound shipment
    map.insert(
        Resource::MutateInboundShipment,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::InboundShipmentMutate),
        ]),
    );
    // outbound return
    map.insert(
        Resource::MutateOutboundReturn,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::OutboundReturnMutate),
        ]),
    );
    // inbound return
    map.insert(
        Resource::MutateInboundReturn,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::InboundReturnMutate),
        ]),
    );
    // prescription
    map.insert(
        Resource::MutatePrescription,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::PrescriptionMutate),
        ]),
    );

    // report
    map.insert(
        Resource::Report,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::Report),
        ]),
    );
    // report development
    map.insert(
        Resource::ReportDev,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            // SQL reports can do raw queries, i.e. you need to be server admin
            PermissionDSL::HasPermission(Permission::ServerAdmin),
        ]),
    );

    map.insert(
        Resource::QueryLog,
        PermissionDSL::HasPermission(Permission::LogQuery),
    );

    map.insert(Resource::QueryClinician, PermissionDSL::HasStoreAccess);

    // TODO add permissions from central
    map.insert(
        Resource::QueryDocument,
        PermissionDSL::HasDynamicPermission(Permission::DocumentQuery),
    );
    map.insert(
        Resource::MutateDocument,
        PermissionDSL::HasDynamicPermission(Permission::DocumentMutate),
    );
    map.insert(
        Resource::QueryDocumentRegistry,
        PermissionDSL::And(vec![
            PermissionDSL::HasDynamicPermission(Permission::DocumentQuery),
            PermissionDSL::HasStoreAccess,
        ]),
    );
    map.insert(
        Resource::MutateDocumentRegistry,
        PermissionDSL::HasDynamicPermission(Permission::DocumentMutate),
    );
    map.insert(
        Resource::QueryJsonSchema,
        PermissionDSL::NoPermissionRequired,
    );
    map.insert(
        Resource::MutateJsonSchema,
        PermissionDSL::NoPermissionRequired,
    );

    // patient
    map.insert(
        Resource::QueryPatient,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::PatientQuery),
            PermissionDSL::HasDynamicPermission(Permission::DocumentQuery),
        ]),
    );
    map.insert(
        Resource::MutatePatient,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasPermission(Permission::PatientMutate),
            // permission to read the related doc types when reading the mutated patient
            PermissionDSL::HasDynamicPermission(Permission::DocumentQuery),
        ]),
    );
    map.insert(
        Resource::QueryProgram,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasDynamicPermission(Permission::DocumentQuery),
        ]),
    );
    map.insert(
        Resource::QueryEncounter,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasDynamicPermission(Permission::DocumentQuery),
        ]),
    );
    map.insert(
        Resource::QueryContactTrace,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasDynamicPermission(Permission::DocumentQuery),
        ]),
    );
    map.insert(
        Resource::MutateProgram,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasDynamicPermission(Permission::DocumentMutate),
        ]),
    );
    map.insert(
        Resource::MutateEncounter,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasDynamicPermission(Permission::DocumentMutate),
        ]),
    );
    map.insert(
        Resource::MutateContactTrace,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasDynamicPermission(Permission::DocumentMutate),
        ]),
    );
    map.insert(
        Resource::ColdChainApi,
        PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::HasDynamicPermission(Permission::ColdChainApi),
        ]),
    );

    // sync info and manual sync, not permission needed
    map.insert(Resource::SyncInfo, PermissionDSL::NoPermissionRequired);
    map.insert(Resource::ManualSync, PermissionDSL::NoPermissionRequired);

    map.insert(
        Resource::QueryInventoryAdjustmentReasons,
        PermissionDSL::NoPermissionRequired,
    );
    map.insert(
        Resource::QueryStorePreferences,
        PermissionDSL::HasStoreAccess,
    );

    map.insert(
        Resource::MutateAsset,
        PermissionDSL::HasPermission(Permission::AssetMutate),
    );
    map.insert(
        Resource::MutateAssetCatalogueItem,
        PermissionDSL::HasPermission(Permission::AssetCatalogueItemMutate),
    );
    map.insert(
        Resource::QueryAsset,
        PermissionDSL::HasPermission(Permission::AssetQuery),
    );

    map
}

#[derive(Debug)]
pub enum AuthDeniedKind {
    NotAuthenticated(String),
    InsufficientPermission {
        msg: String,
        required_permissions: PermissionDSL,
    },
}

#[derive(Debug)]
pub enum AuthError {
    Denied(AuthDeniedKind),
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
) -> Result<ValidatedUserAuth, AuthError> {
    let auth_token = match auth_token {
        Some(token) => token,
        None => {
            if auth_data.debug_no_access_control {
                return Ok(dummy_user_auth());
            }
            return Err(AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                "Missing auth token".to_string(),
            )));
        }
    };
    let service = TokenService::new(
        &auth_data.token_bucket,
        auth_data.auth_token_secret.as_bytes(),
        !is_develop(),
    );
    let claims = match service.verify_token(auth_token, None) {
        Ok(claims) => claims,
        Err(err) => {
            let e = match err {
                JWTValidationError::ExpiredSignature => AuthError::Denied(
                    AuthDeniedKind::NotAuthenticated("Expired signature".to_string()),
                ),
                JWTValidationError::NotAnApiToken => AuthError::Denied(
                    AuthDeniedKind::NotAuthenticated("Not an api token".to_string()),
                ),
                JWTValidationError::InvalidToken(_) => AuthError::Denied(
                    AuthDeniedKind::NotAuthenticated("Invalid token".to_string()),
                ),
                JWTValidationError::TokenInvalidated => {
                    AuthError::Denied(AuthDeniedKind::NotAuthenticated(
                        "Token has been invalided on the server".to_string(),
                    ))
                }
                JWTValidationError::ConcurrencyLockError(_) => {
                    AuthError::InternalError("Lock error".to_string())
                }
            };
            return Err(e);
        }
    };
    let user_id = claims.sub.to_owned();
    Ok(ValidatedUserAuth { user_id, claims })
}

pub struct ValidatedUser {
    pub user_id: String,
    pub claims: OmSupplyClaim,
    /// Contains a list of user permission contexts
    capabilities: Vec<String>,
}

impl<'a> ValidatedUser {
    pub fn capabilities(&'a self) -> &'a Vec<String> {
        &self.capabilities
    }
}

/// Information about the resource a user wants to access
#[derive(Debug, Clone)]
pub struct ResourceAccessRequest {
    pub resource: Resource,
    /// The store id if specified
    pub store_id: Option<String>,
}

fn validate_resource_permissions(
    user_id: &str,
    user_permissions: &[UserPermissionRow],
    resource_request: &ResourceAccessRequest,
    required_permissions: &PermissionDSL,
    dynamic_permissions: &mut Vec<String>,
) -> Result<(), String> {
    // When this code runs, user_permissions have already been filtered by store (if specified).
    // It is possible to mis-configure an API call and not specify a store_id when it is required which could result in incorrect permssion evaluation.
    // We use a StoreAccess permission to catch this case (As it checks both the permission and the store in the request)

    // println!(
    //     "validate_resource_permissions() user_permissions {:?} required {:?}",
    //     user_permissions, resource_permission
    // );

    Ok(match required_permissions {
        PermissionDSL::HasPermission(permission) => {
            if user_permissions.iter().any(|p| &p.permission == permission) {
                return Ok(());
            }
            return Err(format!("Missing permission: {:?}", permission));
        }
        PermissionDSL::HasDynamicPermission(permission) => {
            let user_permissions = user_permissions
                .iter()
                .filter(|p| &p.permission == permission)
                .collect::<Vec<_>>();
            if user_permissions.is_empty() {
                return Err(format!("Missing permission: {:?}", permission));
            }
            let mut contexts = user_permissions
                .iter()
                .filter_map(|p| p.context_id.clone())
                .collect::<Vec<_>>();

            dynamic_permissions.append(&mut contexts);

            return Ok(());
        }
        PermissionDSL::NoPermissionRequired => {
            return Ok(());
        }
        PermissionDSL::HasStoreAccess => {
            // The user_permissions are already filtered by store_id if resource_request.store_id
            // is specified. What remains to be checked is:
            // 1) that store_id is set, i.e. validate_auth() is used correctly with the required
            // parameters
            // 2) the filtered user_permissions contain StoreAccess
            let store_id = match &resource_request.store_id {
                Some(id) => id,
                None => return Err("Store id not specified in request".to_string()),
            };
            if user_permissions
                .iter()
                .any(|p| p.permission == Permission::StoreAccess)
            {
                return Ok(());
            }

            return Err(format!("Missing access to store: {}", store_id));
        }
        PermissionDSL::And(children) => {
            for child in children {
                if let Err(err) = validate_resource_permissions(
                    user_id,
                    user_permissions,
                    resource_request,
                    child,
                    dynamic_permissions,
                ) {
                    return Err(err);
                }
            }
        }
        PermissionDSL::Any(children) => {
            let mut found_any = false;
            for child in children {
                if let Ok(_) = validate_resource_permissions(
                    user_id,
                    user_permissions,
                    resource_request,
                    child,
                    dynamic_permissions,
                ) {
                    found_any = true;
                    // We could stop iterating children here but we want to collect all
                    // HasDynamicPermission instances that are valid in this Any list.
                }
            }
            if !found_any {
                return Err(format!("No permissions for any of: {:?}", children));
            }
            return Ok(());
        }
    })
}

pub trait AuthServiceTrait: Send + Sync {
    fn validate(
        &self,
        ctx: &ServiceContext,
        auth_data: &AuthData,
        auth_token: &Option<String>,
        resource_request: &ResourceAccessRequest,
    ) -> Result<ValidatedUser, AuthError>;
}

pub struct AuthService {
    pub resource_permissions: HashMap<Resource, PermissionDSL>,
}

impl AuthService {
    pub fn new() -> Self {
        AuthService {
            resource_permissions: all_permissions(),
        }
    }
}

impl AuthServiceTrait for AuthService {
    fn validate(
        &self,
        context: &ServiceContext,
        auth_data: &AuthData,
        auth_token: &Option<String>,
        resource_request: &ResourceAccessRequest,
    ) -> Result<ValidatedUser, AuthError> {
        let validated_auth = validate_auth(auth_data, auth_token)?;
        let connection = &context.connection;

        let mut permission_filter =
            UserPermissionFilter::new().user_id(EqualFilter::equal_to(&validated_auth.user_id));
        if let Some(store_id) = &resource_request.store_id {
            permission_filter = permission_filter.store_id(EqualFilter::equal_to(store_id));
        }
        let mut user_permissions = UserPermissionRepository::new(connection).query(
            Pagination::all(),
            Some(permission_filter),
            None,
        )?;

        // Dynamically add Patient context permissions if the user has PatientQuery/PatientMutate
        // permissions.
        if user_permissions
            .iter()
            .find(|item| item.permission == Permission::PatientQuery)
            .is_some()
        {
            user_permissions.push(UserPermissionRow {
                id: uuid(),
                user_id: context.user_id.clone(),
                store_id: Some(context.store_id.clone()),
                permission: Permission::DocumentQuery,
                context_id: Some(PATIENT_CONTEXT_ID.to_string()),
            })
        }
        if user_permissions
            .iter()
            .find(|item| item.permission == Permission::PatientMutate)
            .is_some()
        {
            user_permissions.push(UserPermissionRow {
                id: uuid(),
                user_id: context.user_id.clone(),
                store_id: Some(context.store_id.clone()),
                permission: Permission::DocumentMutate,
                context_id: Some(PATIENT_CONTEXT_ID.to_string()),
            })
        }

        let required_permissions = match self.resource_permissions.get(&resource_request.resource) {
            Some(required_permissions) => required_permissions,
            None => {
                //The requested resource doesn't have a permission mapping assigned (server error)
                return Err(AuthError::InternalError(format!(
                    "Unable to identify required permissions for resource {:?}",
                    &resource_request.resource
                )));
            }
        };

        let mut dynamic_permissions = Vec::new();
        match validate_resource_permissions(
            &validated_auth.user_id,
            &user_permissions,
            resource_request,
            required_permissions,
            &mut dynamic_permissions,
        ) {
            Ok(_) => {}
            Err(msg) => {
                if auth_data.debug_no_access_control {
                    return Ok(ValidatedUser {
                        user_id: validated_auth.user_id,
                        claims: validated_auth.claims,
                        capabilities: Vec::new(),
                    });
                }
                return Err(AuthError::Denied(AuthDeniedKind::InsufficientPermission {
                    msg,
                    required_permissions: required_permissions.clone(),
                }));
            }
        };

        Ok(ValidatedUser {
            user_id: validated_auth.user_id,
            claims: validated_auth.claims,
            capabilities: dynamic_permissions,
        })
    }
}

impl From<RepositoryError> for AuthError {
    fn from(error: RepositoryError) -> Self {
        AuthError::InternalError(format!("{:#?}", error))
    }
}

#[cfg(test)]
mod validate_resource_permissions_test {
    use repository::{Permission, UserPermissionRow};

    use super::{validate_resource_permissions, PermissionDSL, Resource, ResourceAccessRequest};

    #[actix_rt::test]
    async fn test_validate_resource_permissions() {
        let user_id = "test_user_id";
        let store_id = "test_store_id";

        let user_permissions: Vec<UserPermissionRow> = vec![];
        let resource_request = ResourceAccessRequest {
            resource: Resource::MutateLocation,
            store_id: Some(store_id.to_string()),
        };
        let required_permissions = PermissionDSL::HasPermission(Permission::ServerAdmin);

        //Ensure validation fails if user has no permissions
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_err());

        //Ensure validation succeeds if user has single required permission
        let user_permissions: Vec<UserPermissionRow> = vec![UserPermissionRow {
            id: "dummy_id".to_string(),
            user_id: user_id.to_string(),
            permission: Permission::ServerAdmin,
            store_id: None,
            context_id: None,
        }];
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());

        //Test DSL user has 1 out of any 1 permission - any(1 perm)
        let required_permissions =
            PermissionDSL::Any(vec![PermissionDSL::HasPermission(Permission::ServerAdmin)]);
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());

        //Test DSL user has 1 out of any 2 permissions - any(2 perm)
        let required_permissions = PermissionDSL::Any(vec![
            PermissionDSL::HasPermission(Permission::ServerAdmin),
            PermissionDSL::HasPermission(Permission::StocktakeMutate),
        ]);
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());

        //Test DSL user has 0 out of any 1 permission - any(1 perm)
        let required_permissions = PermissionDSL::Any(vec![PermissionDSL::HasPermission(
            Permission::StocktakeMutate,
        )]);
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_err());

        //Test DSL user has 1 out of 2 required permission - And(2 perm)
        let user_permissions: Vec<UserPermissionRow> = vec![UserPermissionRow {
            id: "dummy_id2".to_string(),
            user_id: user_id.to_string(),
            permission: Permission::StocktakeMutate,
            store_id: Some(store_id.to_string()),
            context_id: None,
        }];
        let required_permissions = PermissionDSL::And(vec![
            PermissionDSL::HasPermission(Permission::ServerAdmin),
            PermissionDSL::HasPermission(Permission::StocktakeMutate),
        ]);
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_err());

        //Test DSL user has 2 out of 2 required permission - And(2 perm)
        let user_permissions: Vec<UserPermissionRow> = vec![
            UserPermissionRow {
                id: "dummy_id1".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::ServerAdmin,
                store_id: None,
                context_id: None,
            },
            UserPermissionRow {
                id: "dummy_id2".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::StocktakeMutate,
                store_id: Some(store_id.to_string()),
                context_id: None,
            },
        ];
        let required_permissions = PermissionDSL::And(vec![
            PermissionDSL::HasPermission(Permission::ServerAdmin),
            PermissionDSL::HasPermission(Permission::StocktakeMutate),
        ]);
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());

        //Test DSL user has Any(1,And(1,2))
        let required_permissions = PermissionDSL::Any(vec![
            PermissionDSL::HasPermission(Permission::ServerAdmin),
            PermissionDSL::And(vec![
                PermissionDSL::HasPermission(Permission::StocktakeMutate),
                PermissionDSL::HasStoreAccess,
            ]),
        ]);
        let user_permissions: Vec<UserPermissionRow> = vec![
            UserPermissionRow {
                id: "dummy_id2".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::StocktakeMutate,
                store_id: Some(store_id.to_string()),
                context_id: None,
            },
            UserPermissionRow {
                id: "dummy_id2".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::StoreAccess,
                store_id: Some(store_id.to_string()),
                context_id: None,
            },
        ];
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());

        let required_permissions = PermissionDSL::Any(vec![
            PermissionDSL::HasPermission(Permission::ServerAdmin),
            PermissionDSL::And(vec![
                PermissionDSL::HasPermission(Permission::StocktakeMutate),
                PermissionDSL::HasStoreAccess,
            ]),
        ]);
        let user_permissions: Vec<UserPermissionRow> = vec![UserPermissionRow {
            id: "dummy_id2".to_string(),
            user_id: user_id.to_string(),
            permission: Permission::ServerAdmin,
            store_id: None,
            context_id: None,
        }];
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());

        //Test DSL user has And(1,Any(1,2))
        let required_permissions = PermissionDSL::And(vec![
            PermissionDSL::HasStoreAccess,
            PermissionDSL::Any(vec![
                PermissionDSL::HasPermission(Permission::ServerAdmin),
                PermissionDSL::HasPermission(Permission::StocktakeMutate),
            ]),
        ]);
        let user_permissions: Vec<UserPermissionRow> = vec![
            UserPermissionRow {
                id: "dummy_id2".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::StocktakeMutate,
                store_id: Some(store_id.to_string()),
                context_id: None,
            },
            UserPermissionRow {
                id: "dummy_id2".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::StoreAccess,
                store_id: Some(store_id.to_string()),
                context_id: None,
            },
        ];
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());

        let user_permissions: Vec<UserPermissionRow> = vec![
            UserPermissionRow {
                id: "dummy_id2".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::ServerAdmin,
                store_id: None,
                context_id: None,
            },
            UserPermissionRow {
                id: "dummy_id2".to_string(),
                user_id: user_id.to_string(),
                permission: Permission::StoreAccess,
                store_id: Some(store_id.to_string()),
                context_id: None,
            },
        ];
        let validation_result = validate_resource_permissions(
            user_id,
            &user_permissions,
            &resource_request,
            &required_permissions,
            &mut Vec::new(),
        );
        assert!(validation_result.is_ok());
    }
}

#[cfg(test)]
mod permission_validation_test {
    use std::sync::{Arc, RwLock};

    use super::*;
    use crate::{service_provider::ServiceProvider, token_bucket::TokenBucket};
    use repository::{
        mock::{mock_user_account_a, MockData, MockDataInserts},
        test_db::{setup_all, setup_all_with_data},
        NameRow, StoreRow, UserAccountRow, UserPermissionRowRepository,
    };
    use util::inline_init;

    #[actix_rt::test]
    async fn test_basic_permission_validation() {
        let auth_data = AuthData {
            auth_token_secret: "some secret".to_string(),
            token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
            no_ssl: true,
            debug_no_access_control: false,
        };
        let user_id = "test_user_id";
        let password = "pass";
        let mut service = TokenService::new(
            &auth_data.token_bucket,
            auth_data.auth_token_secret.as_bytes(),
            true,
        );
        let token_pair = service.jwt_token(user_id, password, 60, 120).unwrap();

        let (_, _, connection_manager, _) = setup_all(
            "basic_permission_validation",
            MockDataInserts::none().names().stores().user_accounts(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        let context = service_provider
            .context("".to_string(), user_id.to_string())
            .unwrap();
        let permission_repo = UserPermissionRowRepository::new(&context.connection);

        let mut service = AuthService::new();
        service.resource_permissions.clear();

        // validate user doesn't has access without resource -> permissions mapping
        assert!(service
            .validate(
                &context,
                &auth_data,
                &Some(token_pair.token.to_owned()),
                &ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: None,
                }
            )
            .is_err());

        service.resource_permissions.insert(
            Resource::QueryStocktake,
            PermissionDSL::And(vec![
                PermissionDSL::HasStoreAccess,
                PermissionDSL::HasPermission(Permission::StocktakeQuery),
            ]),
        );

        // validate user doesn't has access
        assert!(service
            .validate(
                &context,
                &auth_data,
                &Some(token_pair.token.to_owned()),
                &ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: None,
                }
            )
            .is_err());

        // validate user can't log in with wrong permission
        permission_repo
            .upsert_one(&UserPermissionRow {
                id: "permission1".to_string(),
                user_id: mock_user_account_a().id,
                store_id: Some("store_a".to_string()),
                permission: Permission::InboundShipmentMutate,
                context_id: None,
            })
            .unwrap();
        assert!(service
            .validate(
                &context,
                &auth_data,
                &Some(token_pair.token.to_owned()),
                &ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: Some("store_a".to_string()),
                }
            )
            .is_err());

        // validate user can't log in with right permission but wrong store
        permission_repo
            .upsert_one(&UserPermissionRow {
                id: "permission1".to_string(),
                user_id: mock_user_account_a().id,
                store_id: Some("store_a".to_string()),
                permission: Permission::StocktakeQuery,
                context_id: None,
            })
            .unwrap();
        assert!(service
            .validate(
                &context,
                &auth_data,
                &Some(token_pair.token.to_owned()),
                &ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: Some("store_b".to_string()),
                }
            )
            .is_err());

        // validate user can log in with right permission and right store
        assert!(service
            .validate(
                &context,
                &auth_data,
                &Some(token_pair.token.to_owned()),
                &ResourceAccessRequest {
                    resource: Resource::QueryStocktake,
                    store_id: Some("store_a".to_string()),
                }
            )
            .is_err());
    }

    #[actix_rt::test]
    async fn test_basic_user_store_permissions() {
        fn name() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "name".to_string();
            })
        }

        fn store() -> StoreRow {
            inline_init(|s: &mut StoreRow| {
                s.id = "store".to_string();
                s.name_id = name().id;
                s.code = "n/a".to_string();
            })
        }

        fn user() -> UserAccountRow {
            inline_init(|r: &mut UserAccountRow| {
                r.id = "user".to_string();
                r.username = "user".to_string();
            })
        }

        fn user_without_permission() -> UserAccountRow {
            inline_init(|r: &mut UserAccountRow| {
                r.id = "user_without_permission".to_string();
                r.username = "user".to_string();
            })
        }

        fn permissions() -> Vec<UserPermissionRow> {
            vec![
                UserPermissionRow {
                    id: "permission_requisition_mutation".to_string(),
                    user_id: user().id,
                    store_id: Some(store().id),
                    permission: Permission::RequisitionMutate,
                    context_id: None,
                },
                UserPermissionRow {
                    id: "permission_store_access".to_string(),
                    user_id: user().id,
                    store_id: Some(store().id),
                    permission: Permission::StoreAccess,
                    context_id: None,
                },
            ]
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_basic_user_store_permissions",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.stores = vec![store()];
                r.names = vec![name()];
                r.user_accounts = vec![user(), user_without_permission()];
                r.user_permissions = permissions()
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let password = "pass";

        let auth_data = AuthData {
            auth_token_secret: "some secret".to_string(),
            token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
            no_ssl: true,
            debug_no_access_control: false,
        };

        let token = TokenService::new(
            &auth_data.token_bucket,
            auth_data.auth_token_secret.as_bytes(),
            true,
        )
        .jwt_token(&user().id, password, 60, 120)
        .unwrap()
        .token;

        assert!(service_provider
            .validation_service
            .validate(
                &context,
                &auth_data,
                &Some(token),
                &ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some(store().id)
                }
            )
            .is_ok());

        let token = TokenService::new(
            &auth_data.token_bucket,
            auth_data.auth_token_secret.as_bytes(),
            true,
        )
        .jwt_token(&user_without_permission().id, password, 60, 120)
        .unwrap()
        .token;
        assert!(service_provider
            .validation_service
            .validate(
                &context,
                &auth_data,
                &Some(token),
                &ResourceAccessRequest {
                    resource: Resource::MutateRequisition,
                    store_id: Some(store().id)
                }
            )
            .is_err());
    }
}
