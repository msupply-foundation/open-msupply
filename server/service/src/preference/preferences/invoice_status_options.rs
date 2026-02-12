use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};
use repository::InvoiceStatus;

pub struct InvoiceStatusOptions;

impl Preference for InvoiceStatusOptions {
    type Value = Vec<InvoiceStatus>;

    fn key(&self) -> PrefKey {
        PrefKey::InvoiceStatusOptions
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::MultiChoice
    }

    fn default_value(&self) -> Self::Value {
        vec![
            InvoiceStatus::New,
            InvoiceStatus::Allocated,
            InvoiceStatus::Picked,
            InvoiceStatus::Shipped,
            InvoiceStatus::Received,
            InvoiceStatus::Delivered,
            InvoiceStatus::Verified,
        ]
    }
}
