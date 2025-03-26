use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, RepositoryError, StorageConnection,
};
use serde::{de::DeserializeOwned, Serialize};

pub mod complex_pref;
use complex_pref::*;
mod preferred_store_name;
use preferred_store_name::*;
mod months_of_stock;
use months_of_stock::*;
mod show_contact_tracing;
use show_contact_tracing::*;

use crate::service_provider::ServiceContext;

// THESE ARE ALL MADE UP EXAMPLES FOR NOW
struct PreferenceRegistry {
    pub show_contact_tracing: ShowContactTracing,
    pub complex_one: ComplexOne,
    pub months_of_stock: MonthsOfStock,
    pub preferred_store_name: PreferredStoreName,
}

pub struct Preferences {
    pub show_contact_tracing: bool,
    pub complex: ComplexPref,
    pub months_of_stock: i32,
    pub preferred_store_name: String,
}

pub fn get_preferences(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Preferences, RepositoryError> {
    let connection = &ctx.connection;

    let PreferenceRegistry {
        show_contact_tracing,
        complex_one,
        months_of_stock,
        preferred_store_name,
    } = get_preference_registry();

    let prefs = Preferences {
        show_contact_tracing: show_contact_tracing.load(connection, store_id)?,
        complex: complex_one.load(connection, store_id)?,
        months_of_stock: months_of_stock.load(connection, store_id)?,
        preferred_store_name: preferred_store_name.load(connection, store_id)?,
    };

    Ok(prefs)
}

pub fn get_preference_descriptions() -> Vec<Box<dyn PreferenceDescription>> {
    let PreferenceRegistry {
        show_contact_tracing,
        complex_one,
        months_of_stock,
        preferred_store_name,
    } = get_preference_registry();

    vec![
        Box::new(show_contact_tracing),
        Box::new(complex_one),
        Box::new(months_of_stock),
        Box::new(preferred_store_name),
    ]
}

fn get_preference_registry() -> PreferenceRegistry {
    PreferenceRegistry {
        show_contact_tracing: ShowContactTracing,
        complex_one: ComplexOne,
        months_of_stock: MonthsOfStock,
        preferred_store_name: PreferredStoreName,
    }
}

pub trait Preference {
    type Value: Default + DeserializeOwned + Serialize;

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
    fn serialised_default(&self) -> String;
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
    fn serialised_default(&self) -> String {
        serde_json::to_string(&T::Value::default()).unwrap()
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
        #[derive(Debug, Default, Deserialize, Serialize, PartialEq)]
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
