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
pub enum UserPermissionNodePermission {
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
    PatientQuery,
    PatientMutate,
}

#[Object]
impl UserStorePermissionNode {
    pub async fn permissions(&self) -> Vec<UserPermissionNodePermission> {
        self.user_store_permission
            .permissions
            .clone()
            .into_iter()
            .map(|p| UserPermissionNodePermission::from_domain(&p.permission))
            .collect()
    }

    pub async fn store_id(&self) -> String {
        self.row().store_row.id.clone()
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

impl UserPermissionNodePermission {
    pub fn from_domain(from: &Permission) -> UserPermissionNodePermission {
        match from {
            Permission::ServerAdmin => UserPermissionNodePermission::ServerAdmin,
            Permission::StoreAccess => UserPermissionNodePermission::StoreAccess,
            Permission::LocationMutate => UserPermissionNodePermission::LocationMutate,
            Permission::StockLineQuery => UserPermissionNodePermission::StockLineQuery,
            Permission::StocktakeQuery => UserPermissionNodePermission::StocktakeQuery,
            Permission::StocktakeMutate => UserPermissionNodePermission::StocktakeMutate,
            Permission::RequisitionQuery => UserPermissionNodePermission::RequisitionQuery,
            Permission::RequisitionMutate => UserPermissionNodePermission::RequisitionMutate,
            Permission::OutboundShipmentQuery => {
                UserPermissionNodePermission::OutboundShipmentQuery
            }
            Permission::OutboundShipmentMutate => {
                UserPermissionNodePermission::OutboundShipmentMutate
            }
            Permission::InboundShipmentQuery => UserPermissionNodePermission::InboundShipmentQuery,
            Permission::InboundShipmentMutate => {
                UserPermissionNodePermission::InboundShipmentMutate
            }
            Permission::Report => UserPermissionNodePermission::Report,
            Permission::LogQuery => UserPermissionNodePermission::LogQuery,
            Permission::Document => UserPermissionNodePermission::PatientQuery,
            Permission::PatientQuery => UserPermissionNodePermission::PatientQuery,
            Permission::PatientMutate => UserPermissionNodePermission::PatientMutate,
        }
    }

    pub fn to_domain(self) -> Permission {
        match self {
            UserPermissionNodePermission::ServerAdmin => Permission::ServerAdmin,
            UserPermissionNodePermission::StoreAccess => Permission::StoreAccess,
            UserPermissionNodePermission::LocationMutate => Permission::LocationMutate,
            UserPermissionNodePermission::StockLineQuery => Permission::StockLineQuery,
            UserPermissionNodePermission::StocktakeQuery => Permission::StocktakeQuery,
            UserPermissionNodePermission::StocktakeMutate => Permission::StocktakeMutate,
            UserPermissionNodePermission::RequisitionQuery => Permission::RequisitionQuery,
            UserPermissionNodePermission::RequisitionMutate => Permission::RequisitionMutate,
            UserPermissionNodePermission::OutboundShipmentQuery => {
                Permission::OutboundShipmentQuery
            }
            UserPermissionNodePermission::OutboundShipmentMutate => {
                Permission::OutboundShipmentMutate
            }
            UserPermissionNodePermission::InboundShipmentQuery => Permission::InboundShipmentQuery,
            UserPermissionNodePermission::InboundShipmentMutate => {
                Permission::InboundShipmentMutate
            }
            UserPermissionNodePermission::Report => Permission::Report,
            UserPermissionNodePermission::LogQuery => Permission::LogQuery,
            UserPermissionNodePermission::PatientQuery => Permission::PatientQuery,
            UserPermissionNodePermission::PatientMutate => Permission::PatientMutate,
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
