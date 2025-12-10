use async_graphql::{Enum, Object, SimpleObject};
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
#[graphql(remote = "repository::db_diesel::user_permission_row::PermissionType")]
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
    GoodsReceivedQuery,
    GoodsReceivedMutate,
    GoodsReceivedAuthorise,
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

#[Object]
impl UserStorePermissionNode {
    pub async fn permissions(&self) -> Vec<UserPermission> {
        self.row()
            .permissions
            .clone()
            .into_iter()
            .map(|p| UserPermission::from(p.permission.clone()))
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
