use async_graphql::{Enum, Object, SimpleObject};
use repository::PermissionType;
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
    SensorMutate,
    SensorQuery,
    TemperatureBreachQuery,
    TemperatureLogQuery,
    StockLineQuery,
    CreateRepack,
    StocktakeQuery,
    StocktakeMutate,
    InventoryAdjustmentMutate,
    RequisitionQuery,
    RequisitionMutate,
    RequisitionSend,
    OutboundShipmentQuery,
    OutboundShipmentMutate,
    InboundShipmentQuery,
    InboundShipmentMutate,
    OutboundReturnQuery,
    OutboundReturnMutate,
    InboundReturnQuery,
    InboundReturnMutate,
    PrescriptionQuery,
    PrescriptionMutate,
    Report,
    LogQuery,
    StockLineMutate,
    ItemMutate,
    ItemNamesCodesAndUnitsMutate,
    PatientQuery,
    PatientMutate,
    DocumentQuery,
    DocumentMutate,
    ColdChainApi,
    AssetMutate,
    AssetQuery,
    AssetCatalogueItemMutate,
    NamePropertiesMutate,
    CentralServerAdmin,
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
            .filter_map(|c| c.context_id)
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
    pub fn from_domain(from: &PermissionType) -> UserPermission {
        match from {
            PermissionType::ServerAdmin => UserPermission::ServerAdmin,
            PermissionType::StoreAccess => UserPermission::StoreAccess,
            PermissionType::LocationMutate => UserPermission::LocationMutate,
            PermissionType::SensorMutate => UserPermission::SensorMutate,
            PermissionType::SensorQuery => UserPermission::SensorQuery,
            PermissionType::TemperatureBreachQuery => UserPermission::TemperatureBreachQuery,
            PermissionType::TemperatureLogQuery => UserPermission::TemperatureLogQuery,
            PermissionType::StockLineQuery => UserPermission::StockLineQuery,
            PermissionType::CreateRepack => UserPermission::CreateRepack,
            PermissionType::StocktakeQuery => UserPermission::StocktakeQuery,
            PermissionType::StocktakeMutate => UserPermission::StocktakeMutate,
            PermissionType::InventoryAdjustmentMutate => UserPermission::InventoryAdjustmentMutate,
            PermissionType::RequisitionQuery => UserPermission::RequisitionQuery,
            PermissionType::RequisitionMutate => UserPermission::RequisitionMutate,
            PermissionType::RequisitionSend => UserPermission::RequisitionSend,
            PermissionType::OutboundShipmentQuery => UserPermission::OutboundShipmentQuery,
            PermissionType::OutboundShipmentMutate => UserPermission::OutboundShipmentMutate,
            PermissionType::InboundShipmentQuery => UserPermission::InboundShipmentQuery,
            PermissionType::InboundShipmentMutate => UserPermission::InboundShipmentMutate,
            PermissionType::OutboundReturnQuery => UserPermission::OutboundReturnQuery,
            PermissionType::OutboundReturnMutate => UserPermission::OutboundReturnMutate,
            PermissionType::InboundReturnQuery => UserPermission::InboundReturnQuery,
            PermissionType::InboundReturnMutate => UserPermission::InboundReturnMutate,
            PermissionType::PrescriptionQuery => UserPermission::PrescriptionQuery,
            PermissionType::PrescriptionMutate => UserPermission::PrescriptionMutate,
            PermissionType::Report => UserPermission::Report,
            PermissionType::LogQuery => UserPermission::LogQuery,
            PermissionType::StockLineMutate => UserPermission::StockLineMutate,
            PermissionType::ItemMutate => UserPermission::ItemMutate,
            PermissionType::PatientQuery => UserPermission::PatientQuery,
            PermissionType::PatientMutate => UserPermission::PatientMutate,
            PermissionType::DocumentQuery => UserPermission::DocumentQuery,
            PermissionType::DocumentMutate => UserPermission::DocumentMutate,
            PermissionType::ItemNamesCodesAndUnitsMutate => {
                UserPermission::ItemNamesCodesAndUnitsMutate
            }

            PermissionType::ColdChainApi => UserPermission::ColdChainApi,
            PermissionType::AssetMutate => UserPermission::AssetMutate,
            PermissionType::AssetQuery => UserPermission::AssetQuery,
            PermissionType::AssetCatalogueItemMutate => UserPermission::AssetCatalogueItemMutate,
            PermissionType::NamePropertiesMutate => UserPermission::NamePropertiesMutate,
            PermissionType::CentralServerAdmin => UserPermission::CentralServerAdmin,
        }
    }

    pub fn to_domain(self) -> PermissionType {
        match self {
            UserPermission::ServerAdmin => PermissionType::ServerAdmin,
            UserPermission::StoreAccess => PermissionType::StoreAccess,
            UserPermission::LocationMutate => PermissionType::LocationMutate,
            UserPermission::SensorMutate => PermissionType::SensorMutate,
            UserPermission::SensorQuery => PermissionType::SensorQuery,
            UserPermission::TemperatureBreachQuery => PermissionType::TemperatureBreachQuery,
            UserPermission::TemperatureLogQuery => PermissionType::TemperatureLogQuery,
            UserPermission::StockLineQuery => PermissionType::StockLineQuery,
            UserPermission::CreateRepack => PermissionType::CreateRepack,
            UserPermission::StocktakeQuery => PermissionType::StocktakeQuery,
            UserPermission::StocktakeMutate => PermissionType::StocktakeMutate,
            UserPermission::InventoryAdjustmentMutate => PermissionType::InventoryAdjustmentMutate,
            UserPermission::RequisitionQuery => PermissionType::RequisitionQuery,
            UserPermission::RequisitionMutate => PermissionType::RequisitionMutate,
            UserPermission::RequisitionSend => PermissionType::RequisitionSend,
            UserPermission::OutboundShipmentQuery => PermissionType::OutboundShipmentQuery,
            UserPermission::OutboundShipmentMutate => PermissionType::OutboundShipmentMutate,
            UserPermission::InboundShipmentQuery => PermissionType::InboundShipmentQuery,
            UserPermission::InboundShipmentMutate => PermissionType::InboundShipmentMutate,
            UserPermission::OutboundReturnQuery => PermissionType::OutboundReturnQuery,
            UserPermission::OutboundReturnMutate => PermissionType::OutboundReturnMutate,
            UserPermission::InboundReturnQuery => PermissionType::InboundReturnQuery,
            UserPermission::InboundReturnMutate => PermissionType::InboundReturnMutate,
            UserPermission::PrescriptionQuery => PermissionType::PrescriptionQuery,
            UserPermission::PrescriptionMutate => PermissionType::PrescriptionMutate,
            UserPermission::Report => PermissionType::Report,
            UserPermission::LogQuery => PermissionType::LogQuery,
            UserPermission::StockLineMutate => PermissionType::StockLineMutate,
            UserPermission::ItemMutate => PermissionType::ItemMutate,
            UserPermission::PatientQuery => PermissionType::PatientQuery,
            UserPermission::PatientMutate => PermissionType::PatientMutate,
            UserPermission::DocumentQuery => PermissionType::DocumentQuery,
            UserPermission::DocumentMutate => PermissionType::DocumentMutate,
            UserPermission::ItemNamesCodesAndUnitsMutate => {
                PermissionType::ItemNamesCodesAndUnitsMutate
            }
            UserPermission::ColdChainApi => PermissionType::ColdChainApi,
            UserPermission::AssetMutate => PermissionType::AssetMutate,
            UserPermission::AssetQuery => PermissionType::AssetQuery,
            UserPermission::AssetCatalogueItemMutate => PermissionType::AssetCatalogueItemMutate,
            UserPermission::NamePropertiesMutate => PermissionType::NamePropertiesMutate,
            UserPermission::CentralServerAdmin => PermissionType::CentralServerAdmin,
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
                .map(UserStorePermissionNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(permissions: Vec<UserStorePermissions>) -> UserStorePermissionConnector {
        UserStorePermissionConnector {
            total_count: usize_to_u32(permissions.len()),
            nodes: permissions
                .into_iter()
                .map(UserStorePermissionNode::from_domain)
                .collect(),
        }
    }
}
