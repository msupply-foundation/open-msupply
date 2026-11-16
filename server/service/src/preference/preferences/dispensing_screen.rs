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
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{preference::query_preference::query_store, sync::test_util_set_is_central_server};
    use repository::{
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

        // OMS-REG-DIS-12.115 / spec rules › dispensing preferences: Standard
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
}
