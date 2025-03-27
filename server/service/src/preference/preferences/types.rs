use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, RepositoryError, StorageConnection,
};
use serde::{de::DeserializeOwned, Serialize};

use serde_json::json;

pub trait Preference: Sync + Send {
    type Value: Default + DeserializeOwned + Serialize;

    fn key() -> &'static str;

    fn global_only() -> bool {
        false
    }

    /// Use this for scalar types - otherwise you should implement json_schema()
    fn json_forms_input_type() -> String {
        "boolean".to_string()
    }

    /// IMPORTANT! The frontend does expect the properties > value structure
    /// Below that you can customise
    fn json_schema() -> serde_json::Value {
        json!({
          "properties": {
            "value": {
                "type": Self::json_forms_input_type()
            }
          },
        })
    }

    fn ui_schema() -> serde_json::Value {
        json!({
          "type": "Control",
          "label": "label.value",
          "scope": "#/properties/value"
        })
    }

    fn deserialize(data: &str) -> Result<Self::Value, serde_json::Error> {
        serde_json::from_str::<Self::Value>(data)
    }

    fn load(
        &self,
        connection: &StorageConnection,
        store_id: &str,
    ) -> Result<Self::Value, RepositoryError> {
        let prefs_by_key = PreferenceRepository::new(connection).query_by_filter(
            PreferenceFilter::new()
                .store_id(EqualFilter::equal_any_or_null(vec![store_id.to_string()]))
                .key(EqualFilter::equal_to(Self::key())),
        )?;

        // If there is a store-specific preference, that should override any global preference
        let store_pref = prefs_by_key.iter().find(|pref| pref.store_id.is_some());
        let global_pref = prefs_by_key.iter().find(|pref| pref.store_id.is_none());

        let configured_pref = store_pref.or(global_pref);

        match configured_pref {
            None => Ok(Self::Value::default()),
            Some(pref) => {
                let text_pref = pref.value.as_str();

                Self::deserialize(text_pref).map_err(|e| {
                    RepositoryError::as_db_error("Failed to deserialize preference", e)
                })
            }
        }
    }
}

pub trait PreferenceDescription: Send + Sync {
    fn key(&self) -> String;
    fn global_only(&self) -> bool;
    fn serialised_default(&self) -> String;
    fn json_schema(&self) -> serde_json::Value;
    fn ui_schema(&self) -> serde_json::Value;
}

impl<T: 'static + Preference> PreferenceDescription for T {
    fn key(&self) -> String {
        T::key().to_string()
    }
    fn global_only(&self) -> bool {
        T::global_only()
    }
    fn json_schema(&self) -> serde_json::Value {
        T::json_schema()
    }
    fn ui_schema(&self) -> serde_json::Value {
        T::ui_schema()
    }
    fn serialised_default(&self) -> String {
        serde_json::to_string(&T::Value::default()).unwrap()
    }
}
