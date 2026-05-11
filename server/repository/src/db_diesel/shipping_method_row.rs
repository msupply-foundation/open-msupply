use crate::{
    ChangelogRepository, ChangelogSyncType, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    shipping_method (id) {
        id -> Text,
        method -> Text,
        deleted_datetime -> Nullable<Timestamp>
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, AsChangeset, Serialize, Deserialize, Default, PartialEq,
)]
#[diesel(table_name = shipping_method)]
#[diesel(treat_none_as_null = true)]
pub struct ShippingMethodRow {
    pub id: String,
    pub method: String,
    // deleted_datetime is set with a value through legacy mSupply isActive field
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct ShippingMethodRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ShippingMethodRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ShippingMethodRowRepository { connection }
    }

    fn _upsert_one(&self, row: &ShippingMethodRow) -> Result<(), RepositoryError> {
        diesel::insert_into(shipping_method::table)
            .values(row)
            .on_conflict(shipping_method::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ShippingMethodRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ShippingMethodRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ShippingMethodRow>, RepositoryError> {
        let result = shipping_method::table
            .filter(shipping_method::id.eq(id))
            .first::<ShippingMethodRow>(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ShippingMethodRow>, RepositoryError> {
        Ok(shipping_method::table
            .filter(shipping_method::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for ShippingMethodRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ShippingMethodRowRepository::new(con)._upsert_one(self)?;

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

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ShippingMethodRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
