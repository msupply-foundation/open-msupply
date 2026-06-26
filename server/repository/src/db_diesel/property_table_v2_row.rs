use super::property_table_v2_row::property_table_v2::dsl::*;

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
    // How much UI presence a property gets on this table scope — a single
    // ordered axis, not two independent booleans (a hidden-but-prominent
    // property is meaningless). Stored as plain TEXT (not a native DB enum) for
    // the same v7 forwards-compatibility reason as `PropertyValueTypeV2`: a mode
    // added on a newer central but unknown here is captured into `Other(String)`
    // rather than rejected at insert. See the create_property_v2 migration.
    pub enum PropertyDisplayModeV2 {
        /// Not shown on this scope (read paths filter it out).
        Hidden,
        /// Shown wherever the scope lists its properties (e.g. the Properties tab).
        #[default]
        Visible,
        /// Visible, and additionally promoted to the scope's primary surface
        /// (e.g. the invoice detail-view toolbar).
        Prominent,
        // `transparent` makes `as_ref()`/Display (and so the custom Serialize and
        // the diesel ToSql) emit the captured inner string, not the variant name
        // "OTHER" — without it an unrecognised mode would round-trip to "OTHER"
        // and the original value would be lost. Matches PropertyValueTypeV2/
        // PropertyKindV2; pinned by the serde round-trip test below.
        #[strum(default, transparent)]
        Other(String),
    }
}

// Serialize to/from the plain string form on the sync wire, delegating to the
// strum representation so the SCREAMING_SNAKE_CASE naming and the `Other`
// catch-all match the DB (TEXT) storage exactly — a remote that receives an
// unrecognised mode deserialises it into `Other` rather than failing the record.
impl Serialize for PropertyDisplayModeV2 {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_ref())
    }
}

impl<'de> Deserialize<'de> for PropertyDisplayModeV2 {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(Self::from(String::deserialize(deserializer)?))
    }
}

table! {
    property_table_v2 (id) {
        id -> Text,
        property_id -> Text,
        table_name -> Text,
        display_mode -> diesel::sql_types::Text,
    }
}

use super::property_v2_row::property_v2;
joinable!(property_table_v2 -> property_v2 (property_id));
allow_tables_to_appear_in_same_query!(property_table_v2, property_v2);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_table_v2)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyTableV2Row {
    pub id: String,
    pub property_id: String,
    pub table_name: String,
    pub display_mode: PropertyDisplayModeV2,
}

pub struct PropertyTableV2RowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyTableV2RowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyTableV2RowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyTableV2Row) -> Result<(), RepositoryError> {
        diesel::insert_into(property_table_v2)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyTableV2Row) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PropertyTableV2Row::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyTableV2Row>, RepositoryError> {
        let result = property_table_v2.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<PropertyTableV2Row>, RepositoryError> {
        let result = property_table_v2
            .filter(id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, row_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property_table_v2)
            .filter(id.eq(row_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<PropertyTableV2Row>, RepositoryError> {
        Ok(property_table_v2::table
            .filter(property_table_v2::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for PropertyTableV2Row {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PropertyTableV2RowRepository::new(con)._upsert_one(self)?;

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
            PropertyTableV2RowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // The whole `property_table_v2` row is the sync wire format (see
    // service/src/sync/translations/property_table_v2.rs), so serde IS the wire
    // form for `display_mode`. Mirrors the PropertyValueTypeV2/PropertyKindV2
    // round-trip tests: pins the flat-string form and verifies a mode unknown to
    // this build (added on a newer central) survives losslessly.
    #[test]
    fn property_display_mode_v2_serde_wire_form() {
        // Known variants <-> flat SCREAMING_SNAKE_CASE string, matching the DB TEXT column.
        assert_eq!(
            serde_json::to_value(PropertyDisplayModeV2::Prominent).unwrap(),
            serde_json::json!("PROMINENT")
        );
        assert_eq!(
            serde_json::from_value::<PropertyDisplayModeV2>(serde_json::json!("HIDDEN")).unwrap(),
            PropertyDisplayModeV2::Hidden
        );

        // Unknown variant serialises to its raw inner string — NOT the variant
        // name "OTHER" (the bug `transparent` prevents) — and round-trips back.
        assert_eq!(
            serde_json::to_value(PropertyDisplayModeV2::Other("FUTURE_MODE".to_string())).unwrap(),
            serde_json::json!("FUTURE_MODE")
        );
        assert_eq!(
            serde_json::from_value::<PropertyDisplayModeV2>(serde_json::json!("FUTURE_MODE"))
                .unwrap(),
            PropertyDisplayModeV2::Other("FUTURE_MODE".to_string())
        );
    }
}
