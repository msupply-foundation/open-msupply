use std::collections::BTreeMap;

use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// The store tags each report is displayed for on the Reports page, keyed by
/// report code (#2033). A report with no entry, or an empty list, is displayed
/// for every store. A store without any of a report's tags still has the
/// report, behind "Show all reports".
///
/// Keyed by code rather than report id so the setting carries over to every
/// version of a report, including ones installed later. Holds name tag ids, so
/// renaming a tag in legacy mSupply doesn't change which stores it applies to.
///
/// Edited through `updateReport`, not the preferences page.
pub struct ReportStoreTags;

pub type ReportStoreTagsValue = BTreeMap<String, Vec<String>>;

impl Preference for ReportStoreTags {
    type Value = ReportStoreTagsValue;

    fn key(&self) -> PrefKey {
        PrefKey::ReportStoreTags
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    // Nominal: the value type picks a renderer on the preferences page, and
    // this preference is never listed there (as GlobalTableConfigs).
    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::String
    }

    // Lenient: this is read every time the reports list loads, so a value this
    // server can't read shows every report rather than failing the list.
    fn deserialize(&self, data: &str) -> Result<Self::Value, serde_json::Error> {
        Ok(
            serde_json::from_str::<Self::Value>(data).unwrap_or_else(|e| {
                log::warn!("Ignoring report store tags that can't be read ({e}): {data}");
                Self::Value::default()
            }),
        )
    }
}
