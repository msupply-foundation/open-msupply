use async_graphql::{Interface, Object, SimpleObject, Union};
use graphql_core::simple_generic_errors::{CannotEditInvoice, RecordNotFound};
use graphql_types::types::InvoiceLineConnector;
use service::invoice::common::AddToShipmentFromMasterListInput as ServiceInput;

pub mod inbound_shipment;
pub mod outbound_shipment;

#[derive(async_graphql::InputObject)]
pub struct AddToShipmentFromMasterListInput {
    pub shipment_id: String,
    pub master_list_id: String,
}

pub struct MasterListNotFoundForThisName;
#[Object]
impl MasterListNotFoundForThisName {
    pub async fn description(&self) -> &'static str {
        "Master list not found (might not be visible to this name)"
    }
}

#[derive(Interface)]
#[graphql(name = "AddToShipmentFromMasterListErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    MasterListNotFoundForThisName(MasterListNotFoundForThisName),
    CannotEditInvoice(CannotEditInvoice),
}

#[derive(SimpleObject)]
#[graphql(name = "AddToShipmentFromMasterListError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "AddToShipmentFromMasterListResponse")]
pub enum AddFromMasterListResponse {
    Error(DeleteError),
    Response(InvoiceLineConnector),
}

impl AddToShipmentFromMasterListInput {
    pub fn to_domain(self) -> ServiceInput {
        let AddToShipmentFromMasterListInput {
            shipment_id,
            master_list_id,
        } = self;
        ServiceInput {
            shipment_id,
            master_list_id,
        }
    }
}
