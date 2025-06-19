use serde::{Deserialize, Serialize};

use crate::sync::sync_serde::object_fields_as_option;

#[cfg(test)]
mod tests {

    #[allow(non_snake_case)]
    #[derive(Deserialize, Serialize, Clone, Debug)]
    pub struct OmsFields {
        #[serde(default)]
        pub foreign_exchange_rate: Option<f64>,
        #[serde(default)]
        pub contract_signed_datetime: Option<NaiveDateTime>,
        #[serde(default)]
        pub advance_paid_datetime: Option<NaiveDateTime>,
    }

    #[allow(non_snake_case)]
    #[derive(Deserialize, Serialize, Debug)]
    pub struct LegacyRowWithOmsObjectField {
        #[serde(rename = "ID")]
        pub id: String,
        #[serde(default)]
        #[serde(deserialize_with = "object_fields_as_option")]
        pub oms_fields: Option<OmsFields>,
    }

    use super::*;
    use chrono::NaiveDateTime;
    use repository::{mock::MockDataInserts, test_db::setup_all};
    #[actix_rt::test]
    async fn test_handle_object_fields_translation() {
        // case with populated fields
        const LEGACY_ROW_1: (&str, &str) = (
            "LEGACY_ROW_1",
            r#"{
                "ID": "LEGACY_ROW_1",
                "oms_fields": {
                    "foreign_exchange_rate": 1.6,
                    "contract_signed_datetime": "2021-01-22T15:16:00"
                }
            }"#,
        );
        let a = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_1.1);
        assert!(a.is_ok());

        // case with empty object
        const LEGACY_ROW_2: (&str, &str) = (
            "LEGACY_ROW_2",
            r#"{
                "ID": "LEGACY_ROW_2",
                "oms_fields": {}
            }"#,
        );
        let b = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_2.1);
        assert!(b.is_ok());

        // case with empty string
        const LEGACY_ROW_3: (&str, &str) = (
            "LEGACY_ROW_3",
            r#"{
                "ID": "LEGACY_ROW_3",
                "oms_fields": ""
            }"#,
        );
        let c = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_3.1);
        assert!(c.is_ok());

        // case with null
        const LEGACY_ROW_4: (&str, &str) = (
            "LEGACY_ROW_4",
            r#"{
                "ID": "LEGACY_ROW_4",
                "oms_fields": null
            }"#,
        );
        let d = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_4.1);
        assert!(d.is_ok());

        // case with no value
        const LEGACY_ROW_5: (&str, &str) = (
            "LEGACY_ROW_5",
            r#"{
                "ID": "LEGACY_ROW_5",
                "oms_fields": {}
            }"#,
        );
        let e = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_5.1);
        assert!(e.is_ok());
    }
}
