use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AllowTrackingOfReceivedStockByDonor;

impl Preference for AllowTrackingOfReceivedStockByDonor {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AllowTrackingOfReceivedStockByDonor
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
