use async_graphql::{Enum, Object, SimpleObject};
use repository::Permission;
use service::{permission::UserStorePermissions, usize_to_u32, ListResult};

#[derive(PartialEq, Debug)]
pub struct UserStorePermissionNode {
    user_store_permission: UserStorePermissions,
}

#[derive(SimpleObject)]
pub struct UserStorePermissionConnector {
    total_count: u32,
    nodes: Vec<UserStorePermissionNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UserPermission {
    ServerAdmin,
    StoreAccess,
    LocationMutate,
    StockLineQuery,
    StocktakeQuery,
    StocktakeMutate,
    RequisitionQuery,
    RequisitionMutate,
    OutboundShipmentQuery,
    OutboundShipmentMutate,
    InboundShipmentQuery,
    InboundShipmentMutate,
    Report,
    LogQuery,
    StockLineMutate,
    PatientQuery,
    PatientMutate,
    DocumentQuery,
    DocumentMutate,
}

#[Object]
impl UserStorePermissionNode {
    pub async fn permissions(&self) -> Vec<UserPermission> {
        self.row()
            .permissions
            .clone()
            .into_iter()
            .map(|p| UserPermission::from_domain(&p.permission))
            .collect()
    }

    pub async fn store_id(&self) -> String {
        self.row().store_row.id.clone()
    }

    pub async fn context(&self) -> Vec<String> {
        self.row()
            .permissions
            .clone()
            .into_iter()
            .filter_map(|c| c.context)
            .collect()
    }
}

impl UserStorePermissionNode {
    pub fn from_domain(user_store_permission: UserStorePermissions) -> Self {
        UserStorePermissionNode {
            user_store_permission,
        }
    }

    pub fn row(&self) -> &UserStorePermissions {
        &self.user_store_permission
    }
}

impl UserPermission {
    pub fn from_domain(from: &Permission) -> UserPermission {
        match from {
            Permission::ServerAdmin => UserPermission::ServerAdmin,
            Permission::StoreAccess => UserPermission::StoreAccess,
            Permission::LocationMutate => UserPermission::LocationMutate,
            Permission::StockLineQuery => UserPermission::StockLineQuery,
            Permission::StocktakeQuery => UserPermission::StocktakeQuery,
            Permission::StocktakeMutate => UserPermission::StocktakeMutate,
            Permission::RequisitionQuery => UserPermission::RequisitionQuery,
            Permission::RequisitionMutate => UserPermission::RequisitionMutate,
            Permission::OutboundShipmentQuery => UserPermission::OutboundShipmentQuery,
            Permission::OutboundShipmentMutate => UserPermission::OutboundShipmentMutate,
            Permission::InboundShipmentQuery => UserPermission::InboundShipmentQuery,
            Permission::InboundShipmentMutate => UserPermission::InboundShipmentMutate,
            Permission::Report => UserPermission::Report,
            Permission::LogQuery => UserPermission::LogQuery,
            Permission::StockLineMutate => UserPermission::StockLineMutate,
            Permission::PatientQuery => UserPermission::PatientQuery,
            Permission::PatientMutate => UserPermission::PatientMutate,
            Permission::DocumentQuery => UserPermission::DocumentQuery,
            Permission::DocumentMutate => UserPermission::DocumentMutate,
        }
    }

    pub fn to_domain(self) -> Permission {
        match self {
            UserPermission::ServerAdmin => Permission::ServerAdmin,
            UserPermission::StoreAccess => Permission::StoreAccess,
            UserPermission::LocationMutate => Permission::LocationMutate,
            UserPermission::StockLineQuery => Permission::StockLineQuery,
            UserPermission::StocktakeQuery => Permission::StocktakeQuery,
            UserPermission::StocktakeMutate => Permission::StocktakeMutate,
            UserPermission::RequisitionQuery => Permission::RequisitionQuery,
            UserPermission::RequisitionMutate => Permission::RequisitionMutate,
            UserPermission::OutboundShipmentQuery => Permission::OutboundShipmentQuery,
            UserPermission::OutboundShipmentMutate => Permission::OutboundShipmentMutate,
            UserPermission::InboundShipmentQuery => Permission::InboundShipmentQuery,
            UserPermission::InboundShipmentMutate => Permission::InboundShipmentMutate,
            UserPermission::Report => Permission::Report,
            UserPermission::LogQuery => Permission::LogQuery,
            UserPermission::StockLineMutate => Permission::StockLineMutate,
            UserPermission::PatientQuery => Permission::PatientQuery,
            UserPermission::PatientMutate => Permission::PatientMutate,
            UserPermission::DocumentQuery => Permission::DocumentQuery,
            UserPermission::DocumentMutate => Permission::DocumentMutate,
        }
    }
}

impl UserStorePermissionConnector {
    pub fn from_domain(
        permissions: ListResult<UserStorePermissions>,
    ) -> UserStorePermissionConnector {
        UserStorePermissionConnector {
            total_count: permissions.count,
            nodes: permissions
                .rows
                .into_iter()
                .map(|row| UserStorePermissionNode::from_domain(row))
                .collect(),
        }
    }

    pub fn from_vec(permissions: Vec<UserStorePermissions>) -> UserStorePermissionConnector {
        UserStorePermissionConnector {
            total_count: usize_to_u32(permissions.len()),
            nodes: permissions
                .into_iter()
                .map(|row| UserStorePermissionNode::from_domain(row))
                .collect(),
        }
    }
}
