use super::vaccine_course_item_row::vaccine_course_item::dsl::*;
use crate::db_diesel::item_row::item;
use crate::diesel_macros::define_linked_tables;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType, Upsert};

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
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct VaccineCourseItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseItemRowRepository { connection }
    }

    pub fn upsert_one(
        &self,
        vaccine_course_item_row: &VaccineCourseItemRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert(vaccine_course_item_row)?;

        self.insert_changelog(
            vaccine_course_item_row.id.to_string(),
            RowActionType::Upsert,
        )
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourseItem,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
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

    pub fn mark_deleted(&self, vaccine_course_item_id: &str) -> Result<i64, RepositoryError> {
        diesel::update(
            vaccine_course_item_with_links::table
                .filter(vaccine_course_item_with_links::id.eq(vaccine_course_item_id)),
        )
        .set(vaccine_course_item_with_links::deleted_datetime.eq(Some(
            chrono::Utc::now().naive_utc(),
        )))
        .execute(self.connection.lock().connection())?;

        self.insert_changelog(vaccine_course_item_id.to_string(), RowActionType::Upsert)
    }
}

impl Upsert for VaccineCourseItemRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = VaccineCourseItemRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            VaccineCourseItemRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
