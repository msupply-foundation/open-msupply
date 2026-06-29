use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::diesel_macros::diesel_string_enum;
use crate::ChangelogRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogSyncType, Upsert};

diesel_string_enum! {
    #[derive(Clone, Eq)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    // Stored as plain TEXT (not a native DB enum) for v7 forwards-compatibility:
    // a value type added on a newer central but unknown here is captured into
    // `Other(String)` rather than rejected at insert. See the create_custom_field
    // migration.
    pub enum CustomFieldValueType {
        #[default]
        Text,
        Integer,
        Date,
        Real,
        Option,
        Boolean,
        #[strum(default, transparent)]
        Other(String),
    }
}

// Serialize to/from the plain string form on the sync wire (and anywhere serde
// is used), delegating to the strum representation so the SCREAMING_SNAKE_CASE
// naming and the `Other` catch-all match the DB (TEXT) storage exactly. A
// remote that receives an unrecognised type deserialises it into `Other` rather
// than failing the sync record.
impl Serialize for CustomFieldValueType {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_ref())
    }
}

impl<'de> Deserialize<'de> for CustomFieldValueType {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(Self::from(String::deserialize(deserializer)?))
    }
}

diesel_string_enum! {
    #[derive(Clone, Eq)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    // Stored as plain TEXT (not a native DB enum) for v7 forwards-compatibility:
    // a custom_field kind added on a newer central but unknown here is captured into
    // `Other(String)` rather than rejected at insert. `Plugin`/`Builtin` can be
    // added as variants later with no DB migration (TEXT storage).
    pub enum CustomFieldKind {
        // A custom_field configured natively in open-mSupply.
        #[default]
        Standard,
        // Synced from legacy mSupply.
        Legacy,
        #[strum(default, transparent)]
        Other(String),
    }
}

// Same flat-string serde form as CustomFieldValueType (see above): the whole row
// is the sync wire format, so `kind` must serialise to/from the plain DB string
// and an unrecognised kind from a newer central deserialises into `Other`.
impl Serialize for CustomFieldKind {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_ref())
    }
}

impl<'de> Deserialize<'de> for CustomFieldKind {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(Self::from(String::deserialize(deserializer)?))
    }
}

table! {
    custom_field (id) {
        id -> Text,
        key -> Text,
        name -> Text,
        value_type -> diesel::sql_types::Text,
        kind -> diesel::sql_types::Text,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = custom_field)]
#[diesel(treat_none_as_null = true)]
pub struct CustomFieldRow {
    pub id: String,
    pub key: String,
    pub name: String,
    pub value_type: CustomFieldValueType,
    pub kind: CustomFieldKind,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct CustomFieldRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CustomFieldRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CustomFieldRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &CustomFieldRow) -> Result<(), RepositoryError> {
        diesel::insert_into(custom_field::table)
            .values(row)
            .on_conflict(custom_field::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &CustomFieldRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = CustomFieldRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<CustomFieldRow>, RepositoryError> {
        let result = custom_field::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        custom_field_id: &str,
    ) -> Result<Option<CustomFieldRow>, RepositoryError> {
        let result = custom_field::table
            .filter(custom_field::id.eq(custom_field_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, custom_field_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(custom_field::table)
            .filter(custom_field::id.eq(custom_field_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<CustomFieldRow>, RepositoryError> {
        Ok(custom_field::table
            .filter(custom_field::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for CustomFieldRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        CustomFieldRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CustomFieldRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // The custom_field sync translator serialises/deserialises the whole row via
    // serde_json (see service/src/sync/translations/custom_field.rs), so serde IS
    // the sync wire format for `value_type`. These tests pin that wire form and
    // verify a value type unknown to this build (added on a newer central)
    // survives the round-trip losslessly — the behaviour `#[strum(default,
    // transparent)]` plus the custom Serialize/Deserialize impls guarantee.

    #[test]
    fn custom_field_value_type_serde_wire_form() {
        // Known variant <-> flat SCREAMING_SNAKE_CASE string, matching the DB TEXT column.
        assert_eq!(
            serde_json::to_value(CustomFieldValueType::Integer).unwrap(),
            serde_json::json!("INTEGER")
        );
        assert_eq!(
            serde_json::from_value::<CustomFieldValueType>(serde_json::json!("INTEGER")).unwrap(),
            CustomFieldValueType::Integer
        );

        // Unknown variant serialises to its raw inner string — NOT the variant
        // name "OTHER", and NOT an externally-tagged object like {"Other": ...}.
        // Without `transparent` this would emit "OTHER" and silently lose the value.
        assert_eq!(
            serde_json::to_value(CustomFieldValueType::Other("FUTURE_TYPE".to_string())).unwrap(),
            serde_json::json!("FUTURE_TYPE")
        );
        assert_eq!(
            serde_json::from_value::<CustomFieldValueType>(serde_json::json!("FUTURE_TYPE"))
                .unwrap(),
            CustomFieldValueType::Other("FUTURE_TYPE".to_string())
        );
    }

    #[test]
    fn custom_field_kind_serde_wire_form() {
        // Known variants <-> flat SCREAMING_SNAKE_CASE string, matching the DB TEXT column.
        assert_eq!(
            serde_json::to_value(CustomFieldKind::Standard).unwrap(),
            serde_json::json!("STANDARD")
        );
        assert_eq!(
            serde_json::from_value::<CustomFieldKind>(serde_json::json!("STANDARD")).unwrap(),
            CustomFieldKind::Standard
        );
        assert_eq!(
            serde_json::to_value(CustomFieldKind::Legacy).unwrap(),
            serde_json::json!("LEGACY")
        );
        assert_eq!(
            serde_json::from_value::<CustomFieldKind>(serde_json::json!("LEGACY")).unwrap(),
            CustomFieldKind::Legacy
        );

        // A kind unknown to this build (e.g. PLUGIN/BUILTIN added on a newer
        // central) round-trips through its raw inner string, not lost as "OTHER".
        assert_eq!(
            serde_json::to_value(CustomFieldKind::Other("FUTURE_KIND".to_string())).unwrap(),
            serde_json::json!("FUTURE_KIND")
        );
        assert_eq!(
            serde_json::from_value::<CustomFieldKind>(serde_json::json!("FUTURE_KIND")).unwrap(),
            CustomFieldKind::Other("FUTURE_KIND".to_string())
        );
    }

    #[test]
    fn custom_field_row_sync_roundtrip_preserves_unknown_value_type() {
        let row = CustomFieldRow {
            id: "prop_1".to_string(),
            key: "some_key".to_string(),
            name: "Some Name".to_string(),
            value_type: CustomFieldValueType::Other("FUTURE_TYPE".to_string()),
            kind: CustomFieldKind::Standard,
            deleted_datetime: None,
        };

        // Mirror exactly what the sync translator does: row -> serde_json -> row.
        let wire = serde_json::to_value(&row).unwrap();
        // The unknown value type travels as the raw string, matching DB storage.
        assert_eq!(wire["value_type"], serde_json::json!("FUTURE_TYPE"));

        let parsed: CustomFieldRow = serde_json::from_value(wire).unwrap();
        assert_eq!(parsed, row);
    }
}
