use repository::SyncVersion;
use serde::{Deserialize, Deserializer};

pub(crate) fn deserialize_sync_version<'de, D: Deserializer<'de>>(
    d: D,
) -> Result<SyncVersion, D::Error> {
    let raw = Option::<String>::deserialize(d)?;
    Ok(SyncVersion::from_legacy_string(raw.as_deref()))
}
