use async_graphql::*;

#[derive(InputObject)]
#[graphql(name = "DeleteInboundShipmentInput")]
pub struct DeleteInput {
    pub id: String,
}

impl DeleteInput {
    pub fn to_domain(self) -> service::invoice::inbound_shipment::DeleteInboundShipment {
        service::invoice::inbound_shipment::DeleteInboundShipment { id: self.id }
    }
}
