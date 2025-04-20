use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, PreferenceRow, RepositoryError,
    StorageConnection,
};
use serde::{de::DeserializeOwned, Serialize};

use serde_json::json;

pub enum PreferenceType {
    Global,
    Store,
    // User,
    // Machine,
}

pub enum PreferenceValueType {
    Boolean,
    String,
    Number,
    // Add scalar or custom value types here - mapped to frontend renderers
}

pub trait Preference: Sync + Send {
    type Value: Default + DeserializeOwned + Serialize;

    fn key(&self) -> &'static str;

    fn preference_type(&self) -> PreferenceType;

    fn value_type(&self) -> PreferenceValueType;

    fn load_self(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<Option<PreferenceRow>, RepositoryError>;

    fn deserialize(&self, data: &str) -> Result<Self::Value, serde_json::Error> {
        serde_json::from_str::<Self::Value>(data)
    }

    // TODO: remove JSON forms, allow greater type safety
    // Completely hard-coded UI, or maybe still return scalar UI types? Depends on UI...

    /// Use this for scalar types - otherwise you should implement json_schema()
    fn json_forms_input_type(&self) -> String {
        "boolean".to_string()
    }

    /// IMPORTANT! The frontend does expect the properties > value structure
    /// Below that you can customise
    fn json_schema(&self) -> serde_json::Value {
        json!({
          "properties": {
            "value": {
                "type": &self.json_forms_input_type()
            }
          },
        })
    }

    fn ui_schema(&self) -> serde_json::Value {
        json!({
          "type": "Control",
          "label": "label.value",
          "scope": "#/properties/value"
        })
    }

    fn load(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<Self::Value, RepositoryError> {
        let pref = self.load_self(connection, store_id)?;
        match pref {
            None => Ok(Self::Value::default()),
            Some(pref) => {
                let text_pref = pref.value.as_str();

                self.deserialize(text_pref).map_err(|e| {
                    RepositoryError::as_db_error("Failed to deserialize preference", e)
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::{PreferenceRow, PreferenceRowRepository};
    use serde::{Deserialize, Serialize};

    #[actix_rt::test]
    async fn test_preference() {
        #[derive(Debug, Default, Deserialize, Serialize, PartialEq)]
        struct TestPref1 {
            a: i32,
            b: String,
        }

        impl Preference for TestPref1 {
            type Value = TestPref1;
            fn key(&self) -> &'static str {
                "test_pref_1"
            }
        }

        #[derive(Debug, PartialEq)]
        struct TestPref2;

        impl Preference for TestPref2 {
            type Value = i32;
            fn key(&self) -> &'static str {
                "test_pref_2"
            }
        }

        let (_, connection, _, _) =
            setup_all("load_preference", MockDataInserts::none().stores()).await;
        let prefs_repo = PreferenceRowRepository::new(&connection);

        // Insert a global pref
        prefs_repo
            .upsert_one(&PreferenceRow {
                id: "test_pref_2_global".to_string(),
                key: "test_pref_2".to_string(),
                value: r#"6"#.to_string(),
                store_id: None,
            })
            .unwrap();

        let store_id = mock_store_a().id;

        // Should return default, as no saved pref record exists for this pref type
        let pref = TestPref1::default().load(&connection, &store_id).unwrap();
        assert_eq!(pref, TestPref1::default());

        // Should return 6, the saved global pref
        let pref2 = TestPref2.load(&connection, &store_id).unwrap();
        assert_eq!(pref2, 6);

        // Insert a store pref
        prefs_repo
            .upsert_one(&PreferenceRow {
                id: "test_pref_2_store_a".to_string(),
                key: "test_pref_2".to_string(),
                value: r#"12"#.to_string(),
                store_id: Some(store_id.clone()),
            })
            .unwrap();

        // Should return 12, overriding the global pref
        let pref2 = TestPref2.load(&connection, &store_id).unwrap();
        assert_eq!(pref2, 12);
    }
}
