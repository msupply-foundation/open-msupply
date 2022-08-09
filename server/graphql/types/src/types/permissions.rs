use async_graphql::{Enum, Object, SimpleObject};
use repository::{Permission, UserPermission};
use service::{usize_to_u32, ListResult};

#[derive(PartialEq, Debug)]
pub struct UserPermissionNode {
    user_permission: UserPermission,
}

#[derive(SimpleObject)]
pub struct UserPermissionConnector {
    total_count: u32,
    nodes: Vec<UserPermissionNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
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
impl UserPermissionNode {
    pub async fn permission(&self) -> UserPermissionNodePermission {
        UserPermissionNodePermission::from_domain(&self.row().permission)
    }

    pub async fn store_id(&self) -> &Option<String> {
        &self.row().store_id
    }
}

impl UserPermissionNode {
    pub fn from_domain(user_permission: UserPermission) -> Self {
        UserPermissionNode { user_permission }
    }

    pub fn row(&self) -> &UserPermission {
        &self.user_permission
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

impl UserPermissionConnector {
    pub fn from_domain(permissions: ListResult<UserPermission>) -> UserPermissionConnector {
        UserPermissionConnector {
            total_count: permissions.count,
            nodes: permissions
                .rows
                .into_iter()
                .map(UserPermissionNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(permissions: Vec<UserPermission>) -> UserPermissionConnector {
        UserPermissionConnector {
            total_count: usize_to_u32(permissions.len()),
            nodes: permissions
                .into_iter()
                .map(UserPermissionNode::from_domain)
                .collect(),
        }
    }
}
