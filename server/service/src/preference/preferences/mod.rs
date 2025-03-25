use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, RepositoryError, StorageConnection,
};
use serde::de::DeserializeOwned;

pub mod complex_pref;
use complex_pref::*;
mod show_contact_tracing;
use show_contact_tracing::*;

use crate::service_provider::ServiceContext;

type PreferenceRegistry = (ShowContactTracing, ComplexOne);

pub struct Preferences {
    pub show_contact_tracing: bool,
    pub complex: ComplexPref,
}

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let (show_contact_tracing, complex_one) = get_preference_registry();

    let prefs = Preferences {
        show_contact_tracing: show_contact_tracing.load(connection, store_id)?,
        complex: complex_one.load(connection, store_id)?,
    };

    Ok(prefs)
}

pub fn get_preference_descriptions() -> Vec<Box<dyn PreferenceDescription>> {
    let (show_contact_tracing, complex_one) = get_preference_registry();

    vec![Box::new(show_contact_tracing), Box::new(complex_one)]
}

fn get_preference_registry() -> PreferenceRegistry {
    (ShowContactTracing, ComplexOne)
}

pub trait Preference {
    type Value: Default + DeserializeOwned;

    fn key() -> &'static str;

    fn global_only() -> bool {
        false
    }

    fn json_forms_input_type() -> String;

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

                let parsed = Self::deserialize(text_pref).map_err(|e| {
                    RepositoryError::as_db_error("Failed to deserialize preference", e)
                });

                parsed
            }
        }
    }
}

pub trait PreferenceDescription {
    fn key(&self) -> String;
    fn global_only(&self) -> bool;
    fn json_forms_input_type(&self) -> String;
}

impl<T: 'static + Preference> PreferenceDescription for T {
    fn key(&self) -> String {
        T::key().to_string()
    }
    fn global_only(&self) -> bool {
        T::global_only()
    }
    fn json_forms_input_type(&self) -> String {
        T::json_forms_input_type()
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

        impl Preference for TestPref1 {
            type Value = TestPref1;
            fn json_forms_input_type() -> String {
                "n/a".to_string()
            }

            fn key() -> &'static str {
                "test_pref_1"
            }
        }

        #[derive(Debug, PartialEq)]
        struct TestPref2;

        impl Preference for TestPref2 {
            type Value = i32;
            fn json_forms_input_type() -> String {
                "n/a".to_string()
            }

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
