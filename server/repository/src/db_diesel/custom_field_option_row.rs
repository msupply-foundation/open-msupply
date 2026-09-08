use super::custom_field_option_row::custom_field_option::dsl::*;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::ChangelogRepository;
use crate::RepositoryError;
use crate::RowActionType;
use crate::SourceSiteId;
use crate::StorageConnection;
use crate::{ChangelogSyncType, Upsert};

table! {
    custom_field_option (id) {
        id -> Text,
        custom_field_id -> Text,
        key -> Text,
        name -> Text,
        parent_option_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
        sort_order -> Text,
    }
}

use super::custom_field_row::custom_field;
joinable!(custom_field_option -> custom_field (custom_field_id));
allow_tables_to_appear_in_same_query!(custom_field_option, custom_field);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = custom_field_option)]
#[diesel(treat_none_as_null = true)]
pub struct CustomFieldOptionRow {
    pub id: String,
    pub custom_field_id: String,
    pub key: String,
    pub name: String,
    pub parent_option_id: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
    pub sort_order: String,
}

pub struct CustomFieldOptionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CustomFieldOptionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CustomFieldOptionRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &CustomFieldOptionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(custom_field_option)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &CustomFieldOptionRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = CustomFieldOptionRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<CustomFieldOptionRow>, RepositoryError> {
        let result = custom_field_option.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        row_id: &str,
    ) -> Result<Option<CustomFieldOptionRow>, RepositoryError> {
        let result = custom_field_option
            .filter(id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<CustomFieldOptionRow>, RepositoryError> {
        Ok(custom_field_option::table
            .filter(custom_field_option::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// Used by the `CustomFieldNode.options` GraphQL dataloader to batch
    /// option lookups across many custom_fields in a single request. Rows are
    /// ordered by `sort_order` then `id` for a deterministic UI (unranked `''`
    /// sort_order falls back to `id` order).
    ///
    /// Soft-deleted options **are included**, and carry their
    /// `deleted_datetime` to the client. A stored value is only ever the
    /// option's id, so excluding deleted options here would make every record
    /// still holding one render a raw id instead of its name — for legacy
    /// categories (deleted whenever OG deletes one) as much as for the
    /// code-defined builtin vocabularies. Resolution therefore reads the whole
    /// list and the client filters deleted options out of its picker: readable
    /// forever, selectable no longer.
    pub fn find_many_by_custom_field_ids(
        &self,
        custom_field_ids: &[String],
    ) -> Result<Vec<CustomFieldOptionRow>, RepositoryError> {
        Ok(custom_field_option::table
            .filter(custom_field_option::custom_field_id.eq_any(custom_field_ids))
            .order((
                custom_field_option::sort_order.asc(),
                custom_field_option::id.asc(),
            ))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for CustomFieldOptionRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        CustomFieldOptionRowRepository::new(con)._upsert_one(self)?;

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
            CustomFieldOptionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        mock::MockDataInserts, test_db, CustomFieldKind, CustomFieldRow, CustomFieldRowRepository,
        CustomFieldValueType,
    };

    #[actix_rt::test]
    async fn options_ordered_by_sort_order_then_id() {
        // `find_many_by_custom_field_ids` (feeds the GraphQL dataloader) returns
        // options ordered by `sort_order` (lexical) then `id`; unranked (`''`)
        // options fall back to `id` order.
        let (_, connection, _, _) =
            test_db::setup_all("custom_field_option_ordering", MockDataInserts::none()).await;

        // FK parent for the options.
        CustomFieldRowRepository::new(&connection)
            .upsert_one(&CustomFieldRow {
                id: "field".to_string(),
                key: "field".to_string(),
                name: "Field".to_string(),
                value_type: CustomFieldValueType::Option,
                kind: CustomFieldKind::Legacy,
                deleted_datetime: None,
            })
            .unwrap();

        let repo = CustomFieldOptionRowRepository::new(&connection);
        // id order is a/b/c/d; ranks reorder to c, a, b, with unranked `d` (`''`)
        // sorting before all of them (empty string < any digit string).
        for (opt_id, rank) in [
            ("a", "000002"),
            ("b", "000003"),
            ("c", "000001"),
            ("d", ""),
        ] {
            repo.upsert_one(&CustomFieldOptionRow {
                id: opt_id.to_string(),
                custom_field_id: "field".to_string(),
                key: opt_id.to_string(),
                name: opt_id.to_string(),
                parent_option_id: None,
                deleted_datetime: None,
                sort_order: rank.to_string(),
            })
            .unwrap();
        }

        let ordered: Vec<_> = repo
            .find_many_by_custom_field_ids(&["field".to_string()])
            .unwrap()
            .into_iter()
            .map(|o| o.id)
            .collect();

        assert_eq!(ordered, vec!["d", "c", "a", "b"]);
    }
}
