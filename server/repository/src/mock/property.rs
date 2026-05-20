use chrono::NaiveDate;

use crate::{
    types::PropertyValueType, PropertyRow, PropertyV2OptionRow, PropertyV2Row, PropertyV2TableRow,
    PropertyV2Type, PropertyV2ValueRow,
};

use super::{mock_name_a, mock_name_b, mock_name_c};

// ---------------------------------------------------------------------------
// Legacy property/name_property mocks (parallel to V2 below, kept for the
// restored legacy name_property surface).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// V2 (KDD prototype) property mocks
// ---------------------------------------------------------------------------

pub fn mock_property_text() -> PropertyV2Row {
    PropertyV2Row {
        id: "property_text".to_string(),
        r#type: PropertyV2Type::Text.as_str().to_string(),
        name: "Text property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_option() -> PropertyV2Row {
    PropertyV2Row {
        id: "property_option".to_string(),
        r#type: PropertyV2Type::Option.as_str().to_string(),
        name: "Option property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_number() -> PropertyV2Row {
    PropertyV2Row {
        id: "property_number".to_string(),
        r#type: PropertyV2Type::Number.as_str().to_string(),
        name: "Number property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_real() -> PropertyV2Row {
    PropertyV2Row {
        id: "property_real".to_string(),
        r#type: PropertyV2Type::Real.as_str().to_string(),
        name: "Real property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_date() -> PropertyV2Row {
    PropertyV2Row {
        id: "property_date".to_string(),
        r#type: PropertyV2Type::Date.as_str().to_string(),
        name: "Date property".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_table_text_on_name() -> PropertyV2TableRow {
    PropertyV2TableRow {
        id: "property_table_text_name".to_string(),
        property_id: mock_property_text().id,
        table_name: "name".to_string(),
    }
}

pub fn mock_property_table_text_on_item() -> PropertyV2TableRow {
    PropertyV2TableRow {
        id: "property_table_text_item".to_string(),
        property_id: mock_property_text().id,
        table_name: "item".to_string(),
    }
}

pub fn mock_property_table_option_on_name() -> PropertyV2TableRow {
    PropertyV2TableRow {
        id: "property_table_option_name".to_string(),
        property_id: mock_property_option().id,
        table_name: "name".to_string(),
    }
}

pub fn mock_property_option_a() -> PropertyV2OptionRow {
    PropertyV2OptionRow {
        id: "property_option_a".to_string(),
        property_id: mock_property_option().id,
        name: "Option A".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_property_option_b() -> PropertyV2OptionRow {
    PropertyV2OptionRow {
        id: "property_option_b".to_string(),
        property_id: mock_property_option().id,
        name: "Option B".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub fn mock_properties_v2() -> Vec<PropertyV2Row> {
    vec![
        mock_property_text(),
        mock_property_option(),
        mock_property_number(),
        mock_property_real(),
        mock_property_date(),
    ]
}

pub fn mock_property_tables() -> Vec<PropertyV2TableRow> {
    vec![
        mock_property_table_text_on_name(),
        mock_property_table_text_on_item(),
        mock_property_table_option_on_name(),
    ]
}

pub fn mock_property_options() -> Vec<PropertyV2OptionRow> {
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

pub fn mock_name_property_value_text_a() -> PropertyV2ValueRow {
    PropertyV2ValueRow {
        id: "name_property_value_text_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_text().id,
        value_text: Some("abc".to_string()),
        ..Default::default()
    }
}

pub fn mock_name_property_value_text_b() -> PropertyV2ValueRow {
    PropertyV2ValueRow {
        id: "name_property_value_text_b".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_b().id,
        property_id: mock_property_text().id,
        value_text: Some("xyz".to_string()),
        ..Default::default()
    }
}

pub fn mock_name_property_value_option_b() -> PropertyV2ValueRow {
    PropertyV2ValueRow {
        id: "name_property_value_option_b".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_b().id,
        property_id: mock_property_option().id,
        value_option_id: Some(mock_property_option_a().id),
        ..Default::default()
    }
}

pub fn mock_name_property_value_option_c() -> PropertyV2ValueRow {
    PropertyV2ValueRow {
        id: "name_property_value_option_c".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_c().id,
        property_id: mock_property_option().id,
        value_option_id: Some(mock_property_option_b().id),
        ..Default::default()
    }
}

pub fn mock_name_property_value_number_a() -> PropertyV2ValueRow {
    PropertyV2ValueRow {
        id: "name_property_value_number_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_number().id,
        value_number: Some(42),
        ..Default::default()
    }
}

pub fn mock_name_property_value_real_a() -> PropertyV2ValueRow {
    PropertyV2ValueRow {
        id: "name_property_value_real_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_real().id,
        value_real: Some(1.5),
        ..Default::default()
    }
}

pub fn mock_name_property_value_date_a() -> PropertyV2ValueRow {
    PropertyV2ValueRow {
        id: "name_property_value_date_a".to_string(),
        table_name: "name".to_string(),
        record_id: mock_name_a().id,
        property_id: mock_property_date().id,
        value_date: NaiveDate::from_ymd_opt(2024, 1, 15),
        ..Default::default()
    }
}

pub fn mock_property_values() -> Vec<PropertyV2ValueRow> {
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
