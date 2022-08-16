use async_graphql::{Enum, Object, SimpleObject};
use repository::{Permission, UserStorePermissions};
use service::{usize_to_u32, ListResult};

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
}

#[Object]
impl UserStorePermissionNode {
    pub async fn permissions(&self) -> Vec<UserPermissionNodePermission> {
        let mut permissions = Vec::new();
        for permission in self.user_store_permission.permissions.clone() {
            permissions.push(UserPermissionNodePermission::from_domain(
                &permission.permission,
            ));
        }
        permissions
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
