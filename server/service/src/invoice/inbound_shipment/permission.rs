use repository::{EqualFilter, Pagination, PermissionType, StorageConnection, UserPermissionFilter, UserPermissionRepository};

use crate::invoice::inbound_shipment::{
    DeleteInboundShipmentError, UpdateInboundShipmentError,
};

/// Check if user has permission to verify/authorise the given inbound shipment type
/// Returns error if user lacks required permission
pub fn check_inbound_shipment_verify_permission(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    is_external: bool,
) -> Result<(), PermissionError> {
    let required_permission = if is_external {
        PermissionType::InboundShipmentExternalAuthorise
    } else {
        PermissionType::InboundShipmentVerify
    };

    has_permission(connection, user_id, store_id, required_permission)
}

/// Check if user has permission to mutate the given inbound shipment type
/// Returns error if user lacks required permission
pub fn check_inbound_shipment_mutation_permission(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    is_external: bool,
) -> Result<(), PermissionError> {
    let required_permission = if is_external {
        PermissionType::InboundShipmentExternalMutate
    } else {
        PermissionType::InboundShipmentMutate
    };

    has_permission(connection, user_id, store_id, required_permission)
}

fn has_permission(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
    permission: PermissionType,
) -> Result<(), PermissionError> {
    // System operations (e.g. transfer processors) run without a user context
    if user_id.is_empty() {
        return Ok(());
    }

    let user_permissions = UserPermissionRepository::new(connection)
        .query(
            Pagination::all(),
            Some(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(user_id.to_string()))
                    .store_id(EqualFilter::equal_to(store_id.to_string())),
            ),
            None,
        )
        .map_err(|_| PermissionError::DatabaseError)?;

    if user_permissions.iter().any(|p| p.permission == permission) {
        Ok(())
    } else {
        Err(PermissionError::InsufficientPermission)
    }
}

#[derive(Debug)]
pub enum PermissionError {
    InsufficientPermission,
    DatabaseError,
}

impl From<PermissionError> for UpdateInboundShipmentError {
    fn from(error: PermissionError) -> Self {
        match error {
            PermissionError::InsufficientPermission => UpdateInboundShipmentError::AuthorisationDenied,
            PermissionError::DatabaseError => UpdateInboundShipmentError::AuthorisationDenied,
        }
    }
}

impl From<PermissionError> for DeleteInboundShipmentError {
    fn from(error: PermissionError) -> Self {
        match error {
            PermissionError::InsufficientPermission => DeleteInboundShipmentError::AuthorisationDenied,
            PermissionError::DatabaseError => DeleteInboundShipmentError::AuthorisationDenied,
        }
    }
}
