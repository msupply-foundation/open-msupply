use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ItemMarginOverridesSupplierMargin;

impl Preference for ItemMarginOverridesSupplierMargin {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ItemMarginOverridesSupplierMargin
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
