use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AllowEditingSellingPriceOnCustomerInvoiceLines;

impl Preference for AllowEditingSellingPriceOnCustomerInvoiceLines {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AllowEditingSellingPriceOnCustomerInvoiceLines
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
