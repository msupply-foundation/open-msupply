use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// Shared table layouts for the Solid front end (`frontend/`), set on the
/// central server and used as every user's defaults.
///
/// Shape: `tableId -> { base?, compact? }`, one table config per screen-size
/// band. The server stores the JSON as given and doesn't validate it.
///
/// The React front end (`client/`) keeps its own layouts, in a different shape,
/// in [`super::GlobalTableConfigs`]. The two are edited independently.
pub struct GlobalTableDefaultConfigs;

impl Preference for GlobalTableDefaultConfigs {
    type Value = serde_json::Value;

    fn key(&self) -> PrefKey {
        PrefKey::GlobalTableDefaultConfigs
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::String
    }

    fn default_value(&self) -> Self::Value {
        serde_json::Value::Object(Default::default())
    }
}
