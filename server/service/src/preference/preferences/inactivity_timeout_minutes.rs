use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct InactivityTimeoutMinutes;

impl Preference for InactivityTimeoutMinutes {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::InactivityTimeoutMinutes
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }

    fn default_value(&self) -> Self::Value {
        // matches old behaviour
        60
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session_store::{lifetime_from_minutes, SessionStore};
    use chrono::{Duration, Utc};
    use repository::{
        mock::MockDataInserts, test_db::setup_all, PreferenceRow, PreferenceRowRepository,
    };

    #[actix_rt::test]
    async fn inactivity_timeout_preference_drives_session_lifetime() {
        let (_, connection, _, _) = setup_all(
            "inactivity_timeout_preference_drives_session_lifetime",
            MockDataInserts::none(),
        )
        .await;

        // No preference set -> default of 60 minutes
        let default_minutes = InactivityTimeoutMinutes.load(&connection, None).unwrap();
        assert_eq!(default_minutes, 60);

        let key = InactivityTimeoutMinutes.key_str();
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: format!("{key}_global"),
                key,
                value: "5".to_string(),
                store_id: None,
            })
            .unwrap();

        let configured_minutes = InactivityTimeoutMinutes.load(&connection, None).unwrap();
        assert_eq!(configured_minutes, 5);

        let lifetime = lifetime_from_minutes(configured_minutes);
        let mut store = SessionStore::new();
        let (_token, expires_at) = store.create("user-1", "pw", lifetime);

        assert!(
            expires_at < Utc::now() + Duration::hours(1),
            "a 5-minute preference should yield a session far shorter than the 1h default"
        );
    }
}
