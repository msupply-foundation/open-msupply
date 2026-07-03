use super::custom_field_scope_row::custom_field_scope::dsl::*;

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
    // How much UI presence a custom_field gets on this table scope — a single
    // ordered axis, not two independent booleans (a hidden-but-prominent
    // custom_field is meaningless). Stored as plain TEXT (not a native DB enum) for
    // the same v7 forwards-compatibility reason as `CustomFieldValueType`: a mode
    // added on a newer central but unknown here is captured into `Other(String)`
    // rather than rejected at insert. See the create_custom_field migration.
    pub enum CustomFieldDisplayMode {
        /// Not shown on this scope (read paths filter it out).
        Hidden,
        /// Shown wherever the scope lists its custom_fields (e.g. the CustomFields tab).
        #[default]
        Visible,
        /// Visible, and additionally promoted to the scope's primary surface
        /// (e.g. the invoice detail-view toolbar).
        Prominent,
        // `transparent` makes `as_ref()`/Display (and so the custom Serialize and
        // the diesel ToSql) emit the captured inner string, not the variant name
        // "OTHER" — without it an unrecognised mode would round-trip to "OTHER"
        // and the original value would be lost. Matches CustomFieldValueType/
        // CustomFieldKind; pinned by the serde round-trip test below.
        #[strum(default, transparent)]
        Other(String),
    }
}

// Serialize to/from the plain string form on the sync wire, delegating to the
// strum representation so the SCREAMING_SNAKE_CASE naming and the `Other`
// catch-all match the DB (TEXT) storage exactly — a remote that receives an
// unrecognised mode deserialises it into `Other` rather than failing the record.
impl Serialize for CustomFieldDisplayMode {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_ref())
    }
}

impl<'de> Deserialize<'de> for CustomFieldDisplayMode {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(Self::from(String::deserialize(deserializer)?))
    }
}

table! {
    custom_field_scope (id) {
        id -> Text,
        custom_field_id -> Text,
        scope -> Text,
        display_mode -> diesel::sql_types::Text,
    }
}

use super::custom_field_row::custom_field;
joinable!(custom_field_scope -> custom_field (custom_field_id));
allow_tables_to_appear_in_same_query!(custom_field_scope, custom_field);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = custom_field_scope)]
#[diesel(treat_none_as_null = true)]
pub struct CustomFieldScopeRow {
    pub id: String,
    pub custom_field_id: String,
    pub scope: String,
    pub display_mode: CustomFieldDisplayMode,
}

pub struct CustomFieldScopeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CustomFieldScopeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CustomFieldScopeRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &CustomFieldScopeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(custom_field_scope)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &CustomFieldScopeRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = CustomFieldScopeRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<CustomFieldScopeRow>, RepositoryError> {
        let result = custom_field_scope.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<CustomFieldScopeRow>, RepositoryError> {
        let result = custom_field_scope
            .filter(id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(custom_field_scope)
            .filter(id.eq(row_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<CustomFieldScopeRow>, RepositoryError> {
        Ok(custom_field_scope::table
            .filter(custom_field_scope::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// Look up the single scope row for a `(custom_field, scope)` pair — the
    /// table's unique key. Used by the config UI's update path, where the
    /// client sends `custom_field_id` + `scope` rather than the row id.
    pub fn find_one_by_field_id_and_scope(
        &self,
        field_id: &str,
        scope_str: &str,
    ) -> Result<Option<CustomFieldScopeRow>, RepositoryError> {
        let result = custom_field_scope
            .filter(custom_field_id.eq(field_id))
            .filter(scope.eq(scope_str))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for CustomFieldScopeRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        CustomFieldScopeRowRepository::new(con)._upsert_one(self)?;

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
            CustomFieldScopeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // The whole `custom_field_scope` row is the sync wire format (see
    // service/src/sync/translations/custom_field_scope.rs), so serde IS the wire
    // form for `display_mode`. Mirrors the CustomFieldValueType/CustomFieldKind
    // round-trip tests: pins the flat-string form and verifies a mode unknown to
    // this build (added on a newer central) survives losslessly.
    #[test]
    fn custom_field_display_mode_serde_wire_form() {
        // Known variants <-> flat SCREAMING_SNAKE_CASE string, matching the DB TEXT column.
        assert_eq!(
            serde_json::to_value(CustomFieldDisplayMode::Prominent).unwrap(),
            serde_json::json!("PROMINENT")
        );
        assert_eq!(
            serde_json::from_value::<CustomFieldDisplayMode>(serde_json::json!("HIDDEN")).unwrap(),
            CustomFieldDisplayMode::Hidden
        );

        // Unknown variant serialises to its raw inner string — NOT the variant
        // name "OTHER" (the bug `transparent` prevents) — and round-trips back.
        assert_eq!(
            serde_json::to_value(CustomFieldDisplayMode::Other("FUTURE_MODE".to_string())).unwrap(),
            serde_json::json!("FUTURE_MODE")
        );
        assert_eq!(
            serde_json::from_value::<CustomFieldDisplayMode>(serde_json::json!("FUTURE_MODE"))
                .unwrap(),
            CustomFieldDisplayMode::Other("FUTURE_MODE".to_string())
        );
    }
}
