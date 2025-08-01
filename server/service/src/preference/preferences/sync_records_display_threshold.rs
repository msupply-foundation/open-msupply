use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct SyncRecordsDisplayThreshold;

impl Preference for SyncRecordsDisplayThreshold {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::SyncRecordsDisplayThreshold
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
