use service::invoice::common::AddToShipmentFromMasterListInput as ServiceInput;

pub mod inbound_return;
pub mod inbound_shipment;
pub mod outbound_return;
pub mod outbound_shipment;
pub mod prescription;

#[derive(async_graphql::InputObject)]
pub struct AddToShipmentFromMasterListInput {
    pub shipment_id: String,
    pub master_list_id: String,
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
