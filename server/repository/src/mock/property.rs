use crate::{PropertyOptionRow, PropertyRow, PropertyTableRow, PropertyType};

pub fn mock_property_text() -> PropertyRow {
    PropertyRow {
        id: "property_text".to_string(),
        r#type: PropertyType::Text.as_str().to_string(),
        name: "Text property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_option() -> PropertyRow {
    PropertyRow {
        id: "property_option".to_string(),
        r#type: PropertyType::Option.as_str().to_string(),
        name: "Option property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_table_text_on_name() -> PropertyTableRow {
    PropertyTableRow {
        id: "property_table_text_name".to_string(),
        property_id: mock_property_text().id,
        table_name: "name".to_string(),
    }
}

pub fn mock_property_table_text_on_item() -> PropertyTableRow {
    PropertyTableRow {
        id: "property_table_text_item".to_string(),
        property_id: mock_property_text().id,
        table_name: "item".to_string(),
    }
}

pub fn mock_property_table_option_on_name() -> PropertyTableRow {
    PropertyTableRow {
        id: "property_table_option_name".to_string(),
        property_id: mock_property_option().id,
        table_name: "name".to_string(),
    }
}

pub fn mock_property_option_a() -> PropertyOptionRow {
    PropertyOptionRow {
        id: "property_option_a".to_string(),
        property_id: mock_property_option().id,
        name: "Option A".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_option_b() -> PropertyOptionRow {
    PropertyOptionRow {
        id: "property_option_b".to_string(),
        property_id: mock_property_option().id,
        name: "Option B".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_properties() -> Vec<PropertyRow> {
    vec![mock_property_text(), mock_property_option()]
}

pub fn mock_property_tables() -> Vec<PropertyTableRow> {
    vec![
        mock_property_table_text_on_name(),
        mock_property_table_text_on_item(),
        mock_property_table_option_on_name(),
    ]
}

pub fn mock_property_options() -> Vec<PropertyOptionRow> {
    vec![mock_property_option_a(), mock_property_option_b()]
}
