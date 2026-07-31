use super::vaccine_course_item_row::vaccine_course_item::dsl::*;
use crate::db_diesel::item_row::item;
use crate::diesel_macros::define_linked_tables;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::{
    ChangelogRepository, ChangelogSyncType, RowActionType,
    SourceSiteId, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: vaccine_course_item = "vaccine_course_item_view",
    core: vaccine_course_item_with_links = "vaccine_course_item",
    struct: VaccineCourseItemRow,
    repo: VaccineCourseItemRowRepository,
    shared: {
        vaccine_course_id -> Text,
        deleted_datetime -> Nullable<Timestamp>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(vaccine_course_item -> item (item_id));
allow_tables_to_appear_in_same_query!(vaccine_course_item, item);

#[derive(
    Clone, Queryable, Debug, PartialEq, Default, Deserialize, Serialize,
)]
#[diesel(table_name = vaccine_course_item)]
pub struct VaccineCourseItemRow {
    pub id: String,
    pub vaccine_course_id: String,
    pub deleted_datetime: Option<NaiveDateTime>,
    // Resolved from item_link - must be last to match view column order.
    // Serialises as `item_id`; the sync translator also emits the legacy `item_link_id`
    // alias for cross-version compatibility (see `RenamedKeys`).
    pub item_id: String,
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
        // Write goes through the linked-tables core table (`vaccine_course_item_with_links`)
        // via the macro-generated `_upsert`, since `vaccine_course_item` is a read-only view.
        self._upsert(vaccine_course_item_row)?;
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
        // Update the linked-tables core table (`vaccine_course_item_with_links`); the
        // `vaccine_course_item` view is read-only.
        diesel::update(
            vaccine_course_item_with_links::table
                .filter(vaccine_course_item_with_links::id.eq(vaccine_course_item_id)),
        )
        .set(vaccine_course_item_with_links::deleted_datetime.eq(Some(
            chrono::Utc::now().naive_utc(),
        )))
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
