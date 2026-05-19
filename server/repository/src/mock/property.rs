use chrono::NaiveDate;

use crate::{PropertyOptionRow, PropertyRow, PropertyTableRow, PropertyType, PropertyValueRow};

use super::{mock_name_a, mock_name_b, mock_name_c};

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

pub fn mock_property_number() -> PropertyRow {
    PropertyRow {
        id: "property_number".to_string(),
        r#type: PropertyType::Number.as_str().to_string(),
        name: "Number property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_real() -> PropertyRow {
    PropertyRow {
        id: "property_real".to_string(),
        r#type: PropertyType::Real.as_str().to_string(),
        name: "Real property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_date() -> PropertyRow {
    PropertyRow {
        id: "property_date".to_string(),
        r#type: PropertyType::Date.as_str().to_string(),
        name: "Date property".to_string(),
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
    vec![
        mock_property_text(),
        mock_property_option(),
        mock_property_number(),
        mock_property_real(),
        mock_property_date(),
    ]
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

// ---------------------------------------------------------------------------
// Property values attached to mock names — used by `NameRepository` filter
// tests to exercise the relational property path end-to-end.
//
// Layout:
//   name_a → text="abc", number=42, real=1.5, date=2024-01-15
//   name_b → text="xyz", option=option_a
//   name_c → option=option_b
// ---------------------------------------------------------------------------

pub fn mock_name_property_value_text_a() -> PropertyValueRow {
    PropertyValueRow {
        id: "name_property_value_text_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_text().id,
        value_text: Some("abc".to_string()),
        ..Default::default()
    }
}

pub fn mock_name_property_value_text_b() -> PropertyValueRow {
    PropertyValueRow {
        id: "name_property_value_text_b".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_b().id,
        property_id: mock_property_text().id,
        value_text: Some("xyz".to_string()),
        ..Default::default()
    }
}

pub fn mock_name_property_value_option_b() -> PropertyValueRow {
    PropertyValueRow {
        id: "name_property_value_option_b".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_b().id,
        property_id: mock_property_option().id,
        value_option_id: Some(mock_property_option_a().id),
        ..Default::default()
    }
}

pub fn mock_name_property_value_option_c() -> PropertyValueRow {
    PropertyValueRow {
        id: "name_property_value_option_c".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_c().id,
        property_id: mock_property_option().id,
        value_option_id: Some(mock_property_option_b().id),
        ..Default::default()
    }
}

pub fn mock_name_property_value_number_a() -> PropertyValueRow {
    PropertyValueRow {
        id: "name_property_value_number_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_number().id,
        value_number: Some(42),
        ..Default::default()
    }
}

pub fn mock_name_property_value_real_a() -> PropertyValueRow {
    PropertyValueRow {
        id: "name_property_value_real_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_real().id,
        value_real: Some(1.5),
        ..Default::default()
    }
}

pub fn mock_name_property_value_date_a() -> PropertyValueRow {
    PropertyValueRow {
        id: "name_property_value_date_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_date().id,
        value_date: NaiveDate::from_ymd_opt(2024, 1, 15),
        ..Default::default()
    }
}

pub fn mock_property_values() -> Vec<PropertyValueRow> {
    vec![
        mock_name_property_value_text_a(),
        mock_name_property_value_text_b(),
        mock_name_property_value_option_b(),
        mock_name_property_value_option_c(),
        mock_name_property_value_number_a(),
        mock_name_property_value_real_a(),
        mock_name_property_value_date_a(),
    ]
}
