use super::{
    StorageConnection, item_link_row::item_link,
    master_list_name_join::master_list_name_join::dsl::*, master_list_row::master_list,
    name_row::system_name_filter,
};

use crate::diesel_macros::{apply_equal_filter, apply_string_filter, define_linked_tables};
use crate::name_row::name;
use crate::repository_error::RepositoryError;
use crate::{
    ChangelogRepository, ChangelogSyncType, DBType, Delete, EqualFilter, NameRow, NameRowType,
    RowActionType, SourceSiteId, StringFilter, Upsert,
};
use diesel::{dsl::IntoBoxed, prelude::*};

define_linked_tables! {
    view: master_list_name_join = "master_list_name_join_view",
    core: master_list_name_join_with_links = "master_list_name_join",
    struct: MasterListNameJoinRow,
    repo: MasterListNameJoinRepository,
    shared: {
        master_list_id -> Text,
    },
    links: {
        name_link_id -> name_id,
    },
    optional_links: {
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = master_list_name_join)]
pub struct MasterListNameJoinRow {
    pub id: String,
    pub master_list_id: String,
    pub name_id: String,
}

joinable!(master_list_name_join -> master_list (master_list_id));
joinable!(master_list_name_join -> name (name_id));
allow_tables_to_appear_in_same_query!(master_list_name_join, item_link);

#[derive(Clone, Default, Debug, PartialEq)]
pub struct MasterListNameJoinFilter {
    pub master_list_id: Option<EqualFilter<String>>,
    pub name_id: Option<EqualFilter<String>>,
    pub name_type: Option<EqualFilter<NameRowType>>,
    /// As `NameRow::is_system_name`.
    pub is_system_name: Option<bool>,
    /// The master list's name or the name's code.
    pub master_list_name_or_name_code: Option<StringFilter>,
}

pub struct MasterListNameJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListNameJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListNameJoinRepository { connection }
    }

    pub fn upsert_one(&self, row: &MasterListNameJoinRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = MasterListNameJoinRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<MasterListNameJoinRow>, RepositoryError> {
        let result = master_list_name_join
            .filter(id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    /// The joins that give the master list to the name, in id order. With no name join.
    pub fn find_by_master_list_and_name(
        &self,
        list_id: &str,
        join_name_id: &str,
    ) -> Result<Vec<MasterListNameJoinRow>, RepositoryError> {
        Ok(master_list_name_join
            .filter(master_list_id.eq(list_id).and(name_id.eq(join_name_id)))
            .order(id.asc())
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<MasterListNameJoinRow>, RepositoryError> {
        Ok(master_list_name_join
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// Each join with its name, in id order.
    pub fn query_by_filter(
        &self,
        filter: MasterListNameJoinFilter,
    ) -> Result<Vec<(MasterListNameJoinRow, NameRow)>, RepositoryError> {
        Ok(create_filtered_query(filter)
            .order(master_list_name_join::id.asc())
            .load(self.connection.lock().connection())?)
    }

    pub fn count(&self, filter: MasterListNameJoinFilter) -> Result<i64, RepositoryError> {
        Ok(create_filtered_query(filter)
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    fn _delete(&self, record_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            master_list_name_join_with_links::table
                .filter(master_list_name_join_with_links::id.eq(record_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, record_id: &str) -> Result<(), RepositoryError> {
        self._delete(record_id)?;
        let changelog = MasterListNameJoinRow::generate_changelog(
            record_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    master_list_name_join::table.inner_join(name::table)
}

type BoxedQuery = IntoBoxed<'static, query, DBType>;

fn create_filtered_query(filter: MasterListNameJoinFilter) -> BoxedQuery {
    let MasterListNameJoinFilter {
        master_list_id: master_list_id_filter,
        name_id: name_id_filter,
        name_type,
        is_system_name,
        master_list_name_or_name_code,
    } = filter;
    let mut query = query().into_boxed();
    if let Some(text) = master_list_name_or_name_code {
        let mut master_lists = master_list::table.into_boxed::<DBType>();
        apply_string_filter!(master_lists, Some(text.clone()), master_list::name);
        let mut names = name::table.into_boxed::<DBType>();
        apply_string_filter!(names, Some(text), name::code);
        query = query.filter(
            master_list_name_join::master_list_id
                .eq_any(master_lists.select(master_list::id))
                .or(master_list_name_join::name_id.eq_any(names.select(name::id))),
        );
    }
    apply_equal_filter!(
        query,
        master_list_id_filter,
        master_list_name_join::master_list_id
    );
    apply_equal_filter!(query, name_id_filter, master_list_name_join::name_id);
    apply_equal_filter!(query, name_type, name::type_);
    if let Some(is_system_name) = is_system_name {
        query = query.filter(system_name_filter(is_system_name));
    }
    query
}

#[derive(Debug, Clone)]
pub struct MasterListNameJoinRowDelete(pub String);
impl Delete for MasterListNameJoinRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = MasterListNameJoinRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                MasterListNameJoinRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            MasterListNameJoinRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for MasterListNameJoinRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        MasterListNameJoinRepository::new(con)._upsert(self)?;

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
            MasterListNameJoinRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
