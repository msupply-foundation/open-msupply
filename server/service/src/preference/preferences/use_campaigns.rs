use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct UseCampaigns;

impl Preference for UseCampaigns {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::UseCampaigns
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
