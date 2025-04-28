use repository::{PreferenceRow, RepositoryError, StorageConnection};
use serde::{de::DeserializeOwned, Serialize};

use thiserror::Error;

use super::{
    query_preference::{query_global, query_store},
    upsert_helpers::{upsert_global, upsert_store},
};

#[derive(Clone, Debug, PartialEq)]
pub enum PreferenceType {
    Global,
    Store,
    // User,
    // Machine,
}

pub enum PreferenceValueType {
    Boolean,
    Integer,
    // String,
    // Add scalar or custom value types here - mapped to frontend renderers
}

#[derive(Clone, Error, Debug, PartialEq)]
pub enum PreferenceError {
    #[error(transparent)]
    DatabaseError(RepositoryError),
    #[error("Failed to deserialize preference {0} from value {1}: {2}")]
    DeserializeError(String, String, String),
    #[error("Store ID is required for store preference")]
    StoreIdNotProvided,
}

#[derive(Clone, Error, Debug, PartialEq)]
pub enum UpsertPreferenceError {
    #[error(transparent)]
    DatabaseError(RepositoryError),
    #[error("Failed to serialize preference {0}: {1}")]
    SerializeError(String, String),
    #[error("Store ID is required for store preference")]
    StoreIdNotProvided,
}

pub trait Preference: Sync + Send {
    type Value: Default + DeserializeOwned + Serialize;

    fn key(&self) -> &'static str;

    fn preference_type(&self) -> PreferenceType;

    fn value_type(&self) -> PreferenceValueType;

    fn query(
        &self,
        connection: &StorageConnection,
        store_id: Option<String>,
    ) -> Result<Option<PreferenceRow>, PreferenceError> {
        let pref = match self.preference_type() {
            PreferenceType::Global => query_global(connection, self.key())?,
            PreferenceType::Store => {
                let store_id = store_id.ok_or(PreferenceError::StoreIdNotProvided)?;
                query_store(connection, self.key(), &store_id)?
            }
        };

        Ok(pref)
    }

    fn default_value(&self) -> Self::Value {
        Self::Value::default()
    }

    fn deserialize(&self, data: &str) -> Result<Self::Value, serde_json::Error> {
        serde_json::from_str::<Self::Value>(data)
    }

    fn load(
        &self,
        connection: &StorageConnection,
        // As we implement user/machine prefs, also accept those optional ids
        // self.query will determine which are actually required
        store_id: Option<String>,
    ) -> Result<Self::Value, PreferenceError> {
        let pref = self.query(connection, store_id)?;
        match pref {
            None => Ok(self.default_value()),
            Some(pref) => {
                let text_pref = pref.value.as_str();

                self.deserialize(text_pref).map_err(|e| {
                    PreferenceError::DeserializeError(pref.key, pref.value, e.to_string())
                })
            }
        }
    }

    // Implement custom upsert if you need further validation
    fn upsert(
        &self,
        connection: &StorageConnection,
        value: Self::Value,
        store_id: Option<String>,
    ) -> Result<(), UpsertPreferenceError> {
        let serialised_value = serde_json::to_string(&value).map_err(|e| {
            UpsertPreferenceError::SerializeError(self.key().to_string(), e.to_string())
        })?;

        match self.preference_type() {
            PreferenceType::Global => upsert_global(connection, self.key(), serialised_value)?,
            PreferenceType::Store => {
                let store_id = store_id.ok_or(UpsertPreferenceError::StoreIdNotProvided)?;
                upsert_store(connection, self.key(), serialised_value, store_id)?;
            }
        };

        Ok(())
    }
}

pub struct PreferenceDescription {
    pub key: String,
    pub preference_type: PreferenceType,
    pub value_type: PreferenceValueType,
    // pub serialised_value: String,
}

impl PreferenceDescription {
    pub fn from_preference<T: Preference>(pref: &T) -> Self {
        Self {
            key: pref.key().to_string(),
            preference_type: pref.preference_type(),
            value_type: pref.value_type(),
            // serialised_value: pref.query(connection, store_id),
        }
    }
}

impl From<RepositoryError> for PreferenceError {
    fn from(error: RepositoryError) -> Self {
        PreferenceError::DatabaseError(error)
    }
}
impl From<RepositoryError> for UpsertPreferenceError {
    fn from(error: RepositoryError) -> Self {
        UpsertPreferenceError::DatabaseError(error)
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::PreferenceRow;

    #[actix_rt::test]
    async fn test_preference() {
        #[derive(Debug, PartialEq)]
        struct TestPref;

        impl Preference for TestPref {
            type Value = i32;

            fn default_value(&self) -> Self::Value {
                42
            }

            fn key(&self) -> &'static str {
                "test_pref"
            }
            fn preference_type(&self) -> PreferenceType {
                PreferenceType::Store
            }
            fn value_type(&self) -> PreferenceValueType {
                PreferenceValueType::Integer
            }
            fn query(
                &self,
                _connection: &StorageConnection,
                store_id: Option<String>,
            ) -> Result<Option<PreferenceRow>, PreferenceError> {
                let mock_pref = PreferenceRow {
                    id: "test_pref_store_a".to_string(),
                    key: self.key().to_string(),
                    value: r#"6"#.to_string(),
                    store_id: Some(mock_store_a().id),
                };

                match store_id {
                    Some(id) if id == mock_store_a().id => Ok(Some(mock_pref)),
                    _ => Ok(None),
                }
            }
        }

        let (_, connection, _, _) = setup_all("load_preference", MockDataInserts::none()).await;

        let store_id = mock_store_a().id;

        // Should return 6 (mocked value for store A)
        let pref2 = TestPref.load(&connection, Some(store_id)).unwrap();
        assert_eq!(pref2, 6);

        // Should return default (42) (no loaded pref in mock above for store B)
        let pref = TestPref
            .load(&connection, Some("store_b".to_string()))
            .unwrap();
        assert_eq!(pref, 42);
    }
}
