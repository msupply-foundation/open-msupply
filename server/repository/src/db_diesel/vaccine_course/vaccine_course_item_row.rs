use super::vaccine_course_item_row::vaccine_course_item::dsl::*;
use crate::db_diesel::item_link_row::item_link;
use crate::db_diesel::item_row::item;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::{
    ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    vaccine_course_item (id) {
        id -> Text,
        vaccine_course_id -> Text,
        item_link_id -> Text,
        deleted_datetime -> Nullable<Timestamp>,

    }
}

joinable!(vaccine_course_item -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(vaccine_course_item, item_link);
allow_tables_to_appear_in_same_query!(vaccine_course_item, item);

#[derive(
    Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default, Deserialize, Serialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = vaccine_course_item)]
pub struct VaccineCourseItemRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub item_link_id: String,
    pub deleted_datetime: Option<NaiveDateTime>,
}
pub struct VaccineCourseItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseItemRowRepository { connection }
    }

    pub fn _upsert_one(
        &self,
        vaccine_course_item_row: &VaccineCourseItemRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(vaccine_course_item)
            .values(vaccine_course_item_row)
            .on_conflict(id)
            .do_update()
            .set(vaccine_course_item_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        vaccine_course_item_row: &VaccineCourseItemRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(vaccine_course_item_row)?;
        let changelog = VaccineCourseItemRow::generate_changelog(
            vaccine_course_item_row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&mut self) -> Result<Vec<VaccineCourseItemRow>, RepositoryError> {
        let result = vaccine_course_item.load(self.connection.lock().connection());
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        vaccine_course_item_id: &str,
    ) -> Result<Option<VaccineCourseItemRow>, RepositoryError> {
        let result = vaccine_course_item
            .filter(id.eq(vaccine_course_item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn mark_deleted(&self, vaccine_course_item_id: &str) -> Result<(), RepositoryError> {
        diesel::update(vaccine_course_item.filter(id.eq(vaccine_course_item_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;

        // Upsert row action as this is a soft delete, not actual delete
        let changelog = VaccineCourseItemRow::generate_changelog(
            vaccine_course_item_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<VaccineCourseItemRow>, RepositoryError> {
        Ok(vaccine_course_item::table
            .filter(vaccine_course_item::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for VaccineCourseItemRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        VaccineCourseItemRowRepository::new(con)._upsert_one(self)?;

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
            VaccineCourseItemRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
