use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, RepositoryError, StorageConnection,
};
use serde::de::DeserializeOwned;

mod complex_pref;
use complex_pref::*;
mod use_payments_in_prescriptions;
use use_payments_in_prescriptions::*;

use crate::service_provider::ServiceContext;

pub struct Preferences {
    pub use_payments_in_prescriptions: bool,
    pub complex: ComplexPref,
}

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let prefs = Preferences {
        use_payments_in_prescriptions: UsePaymentsInPrescriptions::load(connection, store_id)?,
        complex: ComplexPref::load(connection, store_id)?,
    };

    Ok(prefs)
}

pub trait Preference<T: Default + DeserializeOwned> {
    fn key() -> &'static str;

    fn deserialize(data: &str) -> Result<T, serde_json::Error> {
        serde_json::from_str::<T>(data)
    }

    fn load(connection: &StorageConnection, store_id: &str) -> Result<T, RepositoryError> {
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
            None => Ok(T::default()),
            Some(pref) => {
                let text_pref = pref.value.as_str();

                let parsed = Self::deserialize(text_pref).map_err(|e| {
                    RepositoryError::as_db_error("Failed to deserialize preference", e)
                });

                parsed
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
    use serde::Deserialize;

    #[actix_rt::test]
    async fn test_preference() {
        #[derive(Debug, Default, Deserialize, PartialEq)]
        struct TestPref1 {
            a: i32,
            b: String,
        }

        impl Preference<TestPref1> for TestPref1 {
            fn key() -> &'static str {
                "test_pref_1"
            }
        }

        #[derive(Debug, PartialEq)]
        struct TestPref2;

        impl Preference<i32> for TestPref2 {
            fn key() -> &'static str {
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
        let pref = TestPref1::load(&connection, &store_id).unwrap();
        assert_eq!(pref, TestPref1::default());

        // Should return 6, the saved global pref
        let pref2 = TestPref2::load(&connection, &store_id).unwrap();
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
        let pref2 = TestPref2::load(&connection, &store_id).unwrap();
        assert_eq!(pref2, 12);
    }
}
