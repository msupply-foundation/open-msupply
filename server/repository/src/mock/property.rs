use crate::{types::PropertyValueType, PropertyRow};

pub fn mock_property_a() -> PropertyRow {
    PropertyRow {
        id: "property_a".to_string(),
        value_type: PropertyValueType::String,
        key: "property_a".to_string(),
        name: "Property A".to_string(),
        allowed_values: None,
    }
}

pub fn mock_properties() -> Vec<PropertyRow> {
    vec![mock_property_a()]
}
