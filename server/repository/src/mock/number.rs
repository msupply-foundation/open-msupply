use crate::{NumberRow, NumberRowType};

pub fn mock_inbound_shipment_number_store_a() -> NumberRow {
    NumberRow {
        id: String::from("inbound_shipment_number_store_a"),
        r#type: NumberRowType::InboundShipment,
        store_id: "store_a".to_owned(),
        value: 1000,
    }
}

pub fn mock_outbound_shipment_number_store_a() -> NumberRow {
    NumberRow {
        id: String::from("outbound_shipment_number_store_a"),
        r#type: NumberRowType::OutboundShipment,
        store_id: "store_a".to_owned(),
        value: 100,
    }
}

pub fn mock_numbers() -> Vec<NumberRow> {
    vec![
        mock_inbound_shipment_number_store_a(),
        mock_outbound_shipment_number_store_a(),
    ]
}
