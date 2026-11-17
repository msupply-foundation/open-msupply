use serde::{Deserialize, Serialize};

use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// Which screen dispensing opens on (spec/prescriptions rules › dispensing
/// preferences): the list, or the Simple screen.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DispensingScreenOption {
    #[default]
    Standard,
    Simple,
}

/// Set for every store on the central server; a store may have its own value.
pub struct DispensingScreen;

impl Preference for DispensingScreen {
    type Value = DispensingScreenOption;

    fn key(&self) -> PrefKey {
        PrefKey::DispensingScreen
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn allows_store_override(&self) -> bool {
        true
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::DispensingScreen
    }

    // Lenient: the store's preferences are read on the way into the store, so
    // a value this server can't read (a screen a later version added, set on
    // central before this site upgraded) would keep everyone out. It opens the
    // default screen instead.
    fn deserialize(&self, data: &str) -> Result<Self::Value, serde_json::Error> {
        Ok(serde_json::from_str(data).unwrap_or_else(|e| {
            log::warn!("Reading a dispensing screen that can't be read ({e}) as Standard: {data}");
            DispensingScreenOption::default()
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{preference::query_preference::query_store, sync::test_util_set_is_central_server};
    use repository::{
        PreferenceRow, PreferenceRowRepository,
        mock::{MockDataInserts, mock_store_a, mock_store_b},
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn dispensing_screen_defaults_to_standard_and_a_store_can_override_it() {
        let (_, connection, _, _) = setup_all(
            "dispensing_screen_store_override",
            MockDataInserts::none().names().stores(),
        )
        .await;
        test_util_set_is_central_server(true);

        let store_a = mock_store_a().id;
        let store_b = mock_store_b().id;
        let load = |store_id: Option<&str>| {
            DispensingScreen
                .load(&connection, store_id.map(str::to_string))
                .unwrap()
        };

        // OMS-REG-DIS-12.186 / spec rules › dispensing preferences: Standard
        // unless an administrator says otherwise.
        assert_eq!(load(None), DispensingScreenOption::Standard);
        assert_eq!(load(Some(&store_a)), DispensingScreenOption::Standard);

        // Simple globally, Standard for store A: A keeps its own value.
        DispensingScreen
            .upsert(&connection, DispensingScreenOption::Simple, None)
            .unwrap();
        DispensingScreen
            .upsert(
                &connection,
                DispensingScreenOption::Standard,
                Some(store_a.clone()),
            )
            .unwrap();
        assert_eq!(load(Some(&store_a)), DispensingScreenOption::Standard);
        assert_eq!(load(Some(&store_b)), DispensingScreenOption::Simple);

        // Stored as the same word the API sends.
        let key = DispensingScreen.key_str();
        assert_eq!(
            query_store(&connection, &key, &store_a)
                .unwrap()
                .unwrap()
                .value,
            "\"STANDARD\""
        );

        // Clearing the override hands the store back to the global value.
        DispensingScreen
            .clear_store_override(&connection, store_a.clone())
            .unwrap();
        assert_eq!(load(Some(&store_a)), DispensingScreenOption::Simple);
    }

    #[actix_rt::test]
    async fn a_dispensing_screen_that_cant_be_read_opens_standard() {
        let (_, connection, _, _) = setup_all(
            "dispensing_screen_cant_be_read",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let store_a = mock_store_a().id;
        let save_raw = |store_id: Option<&str>, value: &str| {
            PreferenceRowRepository::new(&connection)
                .upsert_one(&PreferenceRow {
                    id: match store_id {
                        Some(store_id) => format!("{}_{store_id}", PrefKey::DispensingScreen),
                        None => format!("{}_global", PrefKey::DispensingScreen),
                    },
                    key: PrefKey::DispensingScreen.to_string(),
                    value: value.to_string(),
                    store_id: store_id.map(str::to_string),
                })
                .unwrap();
        };

        // OMS-REG-DIS-12.181: a screen a later version added, globally and
        // for the store, and a value that isn't JSON at all. The store still
        // opens, on the default screen.
        for value in [r#""TODAY""#, "not json"] {
            save_raw(None, value);
            save_raw(Some(&store_a), value);
            assert_eq!(
                DispensingScreen.load(&connection, Some(store_a.clone())),
                Ok(DispensingScreenOption::Standard),
                "{value}"
            );
            assert!(
                DispensingScreen
                    .as_description(&connection, Some(store_a.clone()))
                    .is_ok(),
                "{value}"
            );
        }
    }
}
