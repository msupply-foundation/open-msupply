use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct SkipIntermediateStatusesInOutbound;

impl Preference for SkipIntermediateStatusesInOutbound {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::SkipIntermediateStatusesInOutbound
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
