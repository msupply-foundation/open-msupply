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
    RequisitionCreateOutboundShipment,
    RnrFormQuery,
    RnrFormMutate,
    OutboundShipmentQuery,
    OutboundShipmentMutate,
    InboundShipmentQuery,
    InboundShipmentMutate,
    InboundShipmentVerify,
    SupplierReturnQuery,
    SupplierReturnMutate,
    CustomerReturnQuery,
    CustomerReturnMutate,
    PrescriptionQuery,
    PrescriptionMutate,
    PurchaseOrderQuery,
    PurchaseOrderMutate,
    PurchaseOrderAuthorise,
    PurchaseOrderFinalise,
    InboundShipmentExternalQuery,
    InboundShipmentExternalMutate,
    InboundShipmentExternalAuthorise,
    InboundShipmentExternalVerify,
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
    AssetMutateViaDataMatrix,
    AssetQuery,
    AssetCatalogueItemMutate,
    AssetStatusMutate,
    NamePropertiesMutate,
    EditCentralData,
    ViewAndEditVvmStatus,
    MutateClinician,
    CancelFinalisedInvoices,
}

impl UserPermission {
    fn from_domain(value: &PermissionType) -> Option<Self> {
        Some(match value {
            PermissionType::ServerAdmin => UserPermission::ServerAdmin,
            PermissionType::StoreAccess => UserPermission::StoreAccess,
            PermissionType::LocationMutate => UserPermission::LocationMutate,
            PermissionType::SensorMutate => UserPermission::SensorMutate,
            PermissionType::SensorQuery => UserPermission::SensorQuery,
            PermissionType::TemperatureBreachQuery => UserPermission::TemperatureBreachQuery,
            PermissionType::TemperatureLogQuery => UserPermission::TemperatureLogQuery,
            PermissionType::StockLineQuery => UserPermission::StockLineQuery,
            PermissionType::StockLineMutate => UserPermission::StockLineMutate,
            PermissionType::CreateRepack => UserPermission::CreateRepack,
            PermissionType::StocktakeQuery => UserPermission::StocktakeQuery,
            PermissionType::StocktakeMutate => UserPermission::StocktakeMutate,
            PermissionType::InventoryAdjustmentMutate => UserPermission::InventoryAdjustmentMutate,
            PermissionType::RequisitionQuery => UserPermission::RequisitionQuery,
            PermissionType::RequisitionMutate => UserPermission::RequisitionMutate,
            PermissionType::RequisitionSend => UserPermission::RequisitionSend,
            PermissionType::RequisitionCreateOutboundShipment => {
                UserPermission::RequisitionCreateOutboundShipment
            }
            PermissionType::RnrFormQuery => UserPermission::RnrFormQuery,
            PermissionType::RnrFormMutate => UserPermission::RnrFormMutate,
            PermissionType::OutboundShipmentQuery => UserPermission::OutboundShipmentQuery,
            PermissionType::OutboundShipmentMutate => UserPermission::OutboundShipmentMutate,
            PermissionType::InboundShipmentQuery => UserPermission::InboundShipmentQuery,
            PermissionType::InboundShipmentMutate => UserPermission::InboundShipmentMutate,
            PermissionType::InboundShipmentVerify => UserPermission::InboundShipmentVerify,
            PermissionType::SupplierReturnQuery => UserPermission::SupplierReturnQuery,
            PermissionType::SupplierReturnMutate => UserPermission::SupplierReturnMutate,
            PermissionType::CustomerReturnQuery => UserPermission::CustomerReturnQuery,
            PermissionType::CustomerReturnMutate => UserPermission::CustomerReturnMutate,
            PermissionType::PrescriptionQuery => UserPermission::PrescriptionQuery,
            PermissionType::PrescriptionMutate => UserPermission::PrescriptionMutate,
            PermissionType::CancelFinalisedInvoices => UserPermission::CancelFinalisedInvoices,
            PermissionType::PurchaseOrderQuery => UserPermission::PurchaseOrderQuery,
            PermissionType::PurchaseOrderMutate => UserPermission::PurchaseOrderMutate,
            PermissionType::PurchaseOrderAuthorise => UserPermission::PurchaseOrderAuthorise,
            PermissionType::PurchaseOrderFinalise => UserPermission::PurchaseOrderFinalise,
            PermissionType::InboundShipmentExternalQuery => {
                UserPermission::InboundShipmentExternalQuery
            }
            PermissionType::InboundShipmentExternalMutate => {
                UserPermission::InboundShipmentExternalMutate
            }
            PermissionType::InboundShipmentExternalVerify => {
                UserPermission::InboundShipmentExternalVerify
            }
            PermissionType::InboundShipmentExternalAuthorise => {
                UserPermission::InboundShipmentExternalAuthorise
            }
            PermissionType::Report => UserPermission::Report,
            PermissionType::LogQuery => UserPermission::LogQuery,
            PermissionType::ItemMutate => UserPermission::ItemMutate,
            PermissionType::ItemNamesCodesAndUnitsMutate => {
                UserPermission::ItemNamesCodesAndUnitsMutate
            }
            PermissionType::PatientQuery => UserPermission::PatientQuery,
            PermissionType::PatientMutate => UserPermission::PatientMutate,
            PermissionType::DocumentQuery => UserPermission::DocumentQuery,
            PermissionType::DocumentMutate => UserPermission::DocumentMutate,
            PermissionType::ColdChainApi => UserPermission::ColdChainApi,
            PermissionType::AssetQuery => UserPermission::AssetQuery,
            PermissionType::AssetMutate => UserPermission::AssetMutate,
            PermissionType::AssetMutateViaDataMatrix => UserPermission::AssetMutateViaDataMatrix,
            PermissionType::AssetCatalogueItemMutate => UserPermission::AssetCatalogueItemMutate,
            PermissionType::AssetStatusMutate => UserPermission::AssetStatusMutate,
            PermissionType::NamePropertiesMutate => UserPermission::NamePropertiesMutate,
            PermissionType::EditCentralData => UserPermission::EditCentralData,
            PermissionType::ViewAndEditVvmStatus => UserPermission::ViewAndEditVvmStatus,
            PermissionType::MutateClinician => UserPermission::MutateClinician,
            PermissionType::Unknown(_) => return None,
        })
    }
}

#[Object]
impl UserStorePermissionNode {
    pub async fn permissions(&self) -> Vec<UserPermission> {
        self.row()
            .permissions
            .iter()
            .filter_map(|p| UserPermission::from_domain(&p.permission))
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
