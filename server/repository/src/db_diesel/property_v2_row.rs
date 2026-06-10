use super::property_v2_row::property_v2::dsl::*;

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
    // `Other(String)` rather than rejected at insert. See the create_property_v2
    // migration.
    pub enum PropertyValueTypeV2 {
        #[default]
        Number,
        Text,
        Date,
        Real,
        Option,
        Boolean,
        #[strum(default)]
        Other(String),
    }
}

// Serialize to/from the plain string form on the sync wire (and anywhere serde
// is used), delegating to the strum representation so the SCREAMING_SNAKE_CASE
// naming and the `Other` catch-all match the DB (TEXT) storage exactly. A
// remote that receives an unrecognised type deserialises it into `Other` rather
// than failing the sync record.
impl Serialize for PropertyValueTypeV2 {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_ref())
    }
}

impl<'de> Deserialize<'de> for PropertyValueTypeV2 {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(Self::from(String::deserialize(deserializer)?))
    }
}

table! {
    property_v2 (id) {
        id -> Text,
        key -> Text,
        name -> Text,
        value_type -> diesel::sql_types::Text,
        is_legacy -> Bool,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_v2)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyV2Row {
    pub id: String,
    pub key: String,
    pub name: String,
    pub value_type: PropertyValueTypeV2,
    pub is_legacy: bool,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct PropertyV2RowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyV2RowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyV2RowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyV2Row) -> Result<(), RepositoryError> {
        diesel::insert_into(property_v2)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyV2Row) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = PropertyV2Row::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyV2Row>, RepositoryError> {
        let result = property_v2.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        property_id: &str,
    ) -> Result<Option<PropertyV2Row>, RepositoryError> {
        let result = property_v2
            .filter(id.eq(property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property_v2)
            .filter(id.eq(property_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<PropertyV2Row>, RepositoryError> {
        Ok(property_v2::table
            .filter(property_v2::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for PropertyV2Row {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        PropertyV2RowRepository::new(con)._upsert_one(self)?;

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
            PropertyV2RowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
