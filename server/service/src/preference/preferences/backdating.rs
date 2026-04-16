use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct Backdating;

#[derive(Default, Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackdatingData {
    pub enabled: bool,
    pub max_days: i32,
}

impl Preference for Backdating {
    type Value = BackdatingData;

    fn key(&self) -> PrefKey {
        PrefKey::Backdating
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::BackdatingData
    }
}
