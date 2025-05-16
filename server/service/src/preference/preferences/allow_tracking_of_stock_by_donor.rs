use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AllowTrackingOfStockByDonor;

impl Preference for AllowTrackingOfStockByDonor {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AllowTrackingOfStockByDonor
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
