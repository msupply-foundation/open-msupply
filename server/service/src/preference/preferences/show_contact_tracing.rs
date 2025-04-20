use repository::{PreferenceRow, RepositoryError, StorageConnection};

use super::{load_global, Preference, PreferenceType, PreferenceValueType};

pub struct ShowContactTracing;

impl Preference for ShowContactTracing {
    type Value = bool;

    fn key(&self) -> &'static str {
        "show_contact_tracing"
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }

    fn load_self(
        &self,
        connection: &StorageConnection,
        _store_id: Option<String>,
    ) -> Result<Option<PreferenceRow>, RepositoryError> {
        load_global(connection, self.key())
    }
}
