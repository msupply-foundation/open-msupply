use super::StorageConnection;

use crate::SourceSiteId;
use crate::diesel_macros::{
    apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter,
    define_linked_tables,
};
use crate::{ChangelogRepository, RowActionType};
use crate::{ChangelogSyncType, Upsert};
use crate::{DBType, DatetimeFilter, EqualFilter, Pagination, RepositoryError, Sort, StringFilter};

use chrono::{DateTime, NaiveDateTime, Utc};
use diesel::dsl::max;
use diesel::helper_types::IntoBoxed;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: document = "document_view",
    core: document_with_links = "document",
    struct: DocumentRow,
    repo: DocumentRepository,
    shared: {
        name -> Text,
        parent_ids -> Text,
        user_id -> Text,
        datetime -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        form_schema_id -> Nullable<Text>,
        status -> crate::db_diesel::document::DocumentStatusMapping,
        context_id -> Text,
    },
    links: {},
    optional_links: {
        owner_name_link_id -> owner_name_id,
    }
}

// view of the document table that only shows the latest document version
// grouped by document name
table! {
    latest_document (id) {
        id -> Text,
        name -> Text,
        parent_ids -> Text,
        user_id -> Text,
        datetime -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        form_schema_id -> Nullable<Text>,
        status -> crate::db_diesel::document::DocumentStatusMapping,
        context_id -> Text,
        owner_name_id -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum DocumentStatus {
    #[default]
    Active,
    Deleted,
}

#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    serde::Serialize,
    serde::Deserialize,
)]
#[cfg_attr(test, derive(Default))]
#[diesel(table_name = document)]
pub struct DocumentRow {
    /// The document data hash
    pub id: String,
    /// Document path and name
    pub name: String,
    /// Stringified array of parents
    pub parent_ids: String,
    /// Id of the author who edited this document version
    pub user_id: String,
    /// The timestamp of this document version
    pub datetime: NaiveDateTime,
    /// Type of the containing data
    #[diesel(column_name = type_)]
    pub r#type: String,
    /// The actual document data
    pub data: String,
    /// JSON schema id containing the schema for the data
    pub form_schema_id: Option<String>,
    /// Soft deletion status
    pub status: DocumentStatus,
    /// For example, program this document belongs to
    pub context_id: String,
    // Resolved from name_link - must be last to match view column order
    /// For example, the patient who owns the document
    pub owner_name_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Document {
    /// The document data hash
    pub id: String,
    /// Document path and name
    pub name: String,
    /// Document parents
    pub parent_ids: Vec<String>,
    /// Id of the author who edited this document version
    pub user_id: String,
    /// The timestamp of this document version
    pub datetime: DateTime<Utc>,
    /// Type of the containing data
    pub r#type: String,
    /// The actual document data
    pub data: serde_json::Value,
    pub form_schema_id: Option<String>,
    pub status: DocumentStatus,
    pub owner_name_id: Option<String>,
    pub context_id: String,
}

#[derive(Clone, Default)]
pub struct DocumentFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub r#type: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub owner: Option<EqualFilter<String>>,
    pub context_id: Option<EqualFilter<String>>,
    pub data: Option<StringFilter>,
}

impl DocumentFilter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn id(mut self, value: EqualFilter<String>) -> Self {
        self.id = Some(value);
        self
    }

    pub fn name(mut self, value: StringFilter) -> Self {
        self.name = Some(value);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn owner(mut self, filter: EqualFilter<String>) -> Self {
        self.owner = Some(filter);
        self
    }

    pub fn context_id(mut self, filter: EqualFilter<String>) -> Self {
        self.context_id = Some(filter);
        self
    }

    pub fn data(mut self, filter: StringFilter) -> Self {
        self.data = Some(filter);
        self
    }
}

pub enum DocumentSortField {
    Name,
    Type,
    Owner,
    Context,
    Datetime,
}

pub type DocumentSort = Sort<DocumentSortField>;

pub type DocumentJoin = DocumentRow;

type BoxedDocumentQuery = IntoBoxed<'static, latest_document::table, DBType>;

fn create_latest_filtered_query(filter: Option<DocumentFilter>) -> BoxedDocumentQuery {
    let mut query = latest_document::dsl::latest_document.into_boxed();

    if let Some(f) = filter {
        let DocumentFilter {
            id,
            name,
            r#type,
            datetime,
            owner,
            context_id: context,
            data,
        } = f;

        apply_equal_filter!(query, id, latest_document::dsl::id);
        apply_string_filter!(query, name, latest_document::dsl::name);
        apply_equal_filter!(query, r#type, latest_document::dsl::type_);
        apply_date_time_filter!(query, datetime, latest_document::dsl::datetime);
        apply_equal_filter!(query, owner, latest_document::dsl::owner_name_id);
        apply_equal_filter!(query, context, latest_document::dsl::context_id);
        apply_string_filter!(query, data, latest_document::dsl::data);
    }
    query
}

pub struct DocumentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DocumentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DocumentRepository { connection }
    }

    /// Inserts a document
    pub fn insert(&self, doc: &Document) -> Result<(), RepositoryError> {
        let row = doc.to_row()?;
        self._upsert(&row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    /// Get a specific document version
    pub fn find_one_by_id(&self, document_id: &str) -> Result<Option<Document>, RepositoryError> {
        let row: Option<DocumentRow> = document::dsl::document
            .filter(document::dsl::id.eq(document_id))
            .first(self.connection.lock().connection())
            .optional()?;

        Ok(match row {
            Some(row) => Some(to_document(row)?),
            None => None,
        })
    }

    pub fn count(&self, filter: Option<DocumentFilter>) -> Result<i64, RepositoryError> {
        let query = create_latest_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    /// How many documents of a type are pinned to each schema id, by each document's latest
    /// version, leaving out deleted documents and those pinned to no schema.
    pub fn count_by_form_schema_id(
        &self,
        document_type: &str,
    ) -> Result<Vec<(String, i64)>, RepositoryError> {
        let counts: Vec<(Option<String>, i64)> = latest_document::table
            .filter(latest_document::type_.eq(document_type))
            .filter(latest_document::status.ne(DocumentStatus::Deleted))
            .filter(latest_document::form_schema_id.is_not_null())
            .group_by(latest_document::form_schema_id)
            .select((latest_document::form_schema_id, diesel::dsl::count_star()))
            .order_by(latest_document::form_schema_id.asc())
            .load(self.connection.lock().connection())?;
        Ok(counts
            .into_iter()
            .filter_map(|(id, count)| id.map(|id| (id, count)))
            .collect())
    }

    /// Get the latest version of some documents
    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<DocumentFilter>,
        sort: Option<DocumentSort>,
    ) -> Result<Vec<Document>, RepositoryError> {
        let mut query = create_latest_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                DocumentSortField::Name => {
                    apply_sort!(query, sort, latest_document::dsl::name)
                }
                DocumentSortField::Type => {
                    apply_sort!(query, sort, latest_document::dsl::type_)
                }
                DocumentSortField::Owner => {
                    apply_sort!(query, sort, latest_document::dsl::owner_name_id)
                }
                DocumentSortField::Context => {
                    apply_sort!(query, sort, latest_document::dsl::context_id)
                }
                DocumentSortField::Datetime => {
                    apply_sort!(query, sort, latest_document::dsl::datetime)
                }
            }
        } else {
            query = query.order(latest_document::dsl::datetime.asc())
        }

        // Debug diesel query
        //println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let rows: Vec<DocumentJoin> = query
            // Stable tiebreaker so paginated results don't shuffle or drop rows
            // when the primary sort column has ties.
            .then_order_by(latest_document::id.asc())
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load(self.connection.lock().connection())?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(to_document(row)?);
        }
        Ok(result)
    }

    /// The latest version of each named document.
    ///
    /// Reads the document table itself, not the `latest_document` view: the view
    /// groups every version in the table by name, so a filter on it is only cheap
    /// where the planner moves the filter inside the grouping. Postgres does that
    /// for one name compared with `=`, but not for a list of names on every
    /// version, and then a batched read scans the whole table (#1562). Two index
    /// lookups by name instead: the newest datetime of each name, then those
    /// rows, so no other version's data is read.
    pub fn find_many_latest_by_names(
        &self,
        names: &[String],
    ) -> Result<Vec<Document>, RepositoryError> {
        let newest: Vec<(String, Option<NaiveDateTime>)> = document::dsl::document
            .filter(document::dsl::name.eq_any(names))
            .group_by(document::dsl::name)
            .select((document::dsl::name, max(document::dsl::datetime)))
            .load(self.connection.lock().connection())?;
        let datetimes: Vec<NaiveDateTime> = newest.iter().filter_map(|(_, d)| *d).collect();
        if datetimes.is_empty() {
            return Ok(Vec::new());
        }

        let rows: Vec<DocumentRow> = document::dsl::document
            .filter(document::dsl::name.eq_any(names))
            .filter(document::dsl::datetime.eq_any(&datetimes))
            .order((document::dsl::name.asc(), document::dsl::id.desc()))
            .load(self.connection.lock().connection())?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            let is_newest = newest
                .iter()
                .any(|(name, datetime)| *name == row.name && *datetime == Some(row.datetime));
            let already_kept = result.last().is_some_and(|d| d.name == row.name);
            if is_newest && !already_kept {
                result.push(to_document(row)?);
            }
        }
        Ok(result)
    }

    pub fn query_by_filter(
        &self,
        filter: DocumentFilter,
    ) -> Result<Vec<Document>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    /// Gets all document versions
    pub fn document_history(
        &self,
        filter: Option<DocumentFilter>,
    ) -> Result<Vec<Document>, RepositoryError> {
        let mut query = document::dsl::document.into_boxed();
        if let Some(f) = filter {
            let DocumentFilter {
                id,
                name,
                r#type,
                datetime,
                owner,
                context_id: context,
                data,
            } = f;

            apply_equal_filter!(query, id, document::dsl::id);
            apply_string_filter!(query, name, document::dsl::name);
            apply_equal_filter!(query, r#type, document::dsl::type_);
            apply_date_time_filter!(query, datetime, document::dsl::datetime);
            apply_equal_filter!(query, owner, document::dsl::owner_name_id);
            apply_equal_filter!(query, context, document::dsl::context_id);
            apply_string_filter!(query, data, document::dsl::data);
        }
        let rows: Vec<DocumentRow> = query
            .order(document::dsl::datetime.desc())
            .load(self.connection.lock().connection())?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(to_document(row)?);
        }
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<DocumentRow>, RepositoryError> {
        Ok(document::table
            .filter(document::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

fn to_document(row: DocumentRow) -> Result<Document, RepositoryError> {
    let DocumentRow {
        id,
        name,
        parent_ids,
        user_id,
        datetime,
        r#type,
        data,
        form_schema_id,
        status,
        context_id,
        owner_name_id,
    } = row;

    let parents: Vec<String> =
        serde_json::from_str(&parent_ids).map_err(|err| RepositoryError::DBError {
            msg: "Invalid parents data".to_string(),
            extra: format!("{err}"),
        })?;
    let data: serde_json::Value =
        serde_json::from_str(&data).map_err(|err| RepositoryError::DBError {
            msg: "Invalid data".to_string(),
            extra: format!("{err}"),
        })?;

    let document = Document {
        id,
        name,
        parent_ids: parents,
        user_id,
        datetime: DateTime::<Utc>::from_naive_utc_and_offset(datetime, Utc),
        r#type,
        data,
        form_schema_id,
        status,
        owner_name_id,
        context_id,
    };

    Ok(document)
}

impl Upsert for DocumentRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        DocumentRepository::new(con)._upsert(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
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
        let stored = DocumentRepository::new(con)
            .find_many_by_id(&[self.id.clone()])
            .expect("document lookup");
        assert_eq!(stored.first(), Some(self));
    }
}

impl Document {
    pub fn to_row(&self) -> Result<DocumentRow, RepositoryError> {
        let parents =
            serde_json::to_string(&self.parent_ids).map_err(|err| RepositoryError::DBError {
                msg: "Can't serialize parents".to_string(),
                extra: format!("{err}"),
            })?;
        let data = serde_json::to_string(&self.data).map_err(|err| RepositoryError::DBError {
            msg: "Can't serialize data".to_string(),
            extra: format!("{err}"),
        })?;
        Ok(DocumentRow {
            id: self.id.to_string(),
            name: self.name.to_owned(),
            parent_ids: parents,
            user_id: self.user_id.to_string(),
            datetime: self.datetime.naive_utc(),
            r#type: self.r#type.to_owned(),
            data,
            form_schema_id: self.form_schema_id.clone(),
            status: self.status.to_owned(),
            context_id: self.context_id.to_string(),
            owner_name_id: self.owner_name_id.to_owned(),
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all};
    use chrono::{Duration, TimeZone};

    fn version(id: &str, name: &str, minutes: i64, status: DocumentStatus) -> Document {
        Document {
            id: id.to_string(),
            name: name.to_string(),
            parent_ids: vec![],
            user_id: "user".to_string(),
            datetime: Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap()
                + Duration::minutes(minutes),
            r#type: "Patient".to_string(),
            data: serde_json::json!({ "version": id }),
            form_schema_id: None,
            status,
            owner_name_id: None,
            context_id: "Patient".to_string(),
        }
    }

    /// The direct read answers as the `latest_document` view did: the newest
    /// version of each name, the highest id among versions tied on datetime, a
    /// deleted newest version included, a name with no versions left out.
    #[actix_rt::test]
    async fn find_many_latest_by_names_matches_the_view() {
        let (_, connection, _, _) = setup_all(
            "find_many_latest_by_names_matches_the_view",
            MockDataInserts::none(),
        )
        .await;
        let repo = DocumentRepository::new(&connection);
        for doc in [
            version("a1", "p/a/Patient", 0, DocumentStatus::Active),
            version("a2", "p/a/Patient", 1, DocumentStatus::Active),
            version("a3", "p/a/Patient", 2, DocumentStatus::Active),
            version("b1", "p/b/Patient", 0, DocumentStatus::Active),
            version("b9", "p/b/Patient", 5, DocumentStatus::Active),
            version("b5", "p/b/Patient", 5, DocumentStatus::Active),
            version("c1", "p/c/Patient", 0, DocumentStatus::Active),
            version("c2", "p/c/Patient", 1, DocumentStatus::Deleted),
            version("d1", "p/d/Patient", 0, DocumentStatus::Active),
        ] {
            repo.insert(&doc).unwrap();
        }
        let names: Vec<String> = [
            "p/a/Patient",
            "p/b/Patient",
            "p/c/Patient",
            "p/none/Patient",
        ]
        .into_iter()
        .map(String::from)
        .collect();

        let direct: Vec<(String, String)> = repo
            .find_many_latest_by_names(&names)
            .unwrap()
            .into_iter()
            .map(|d| (d.name, d.id))
            .collect();
        // The view answers two rows for versions tied on datetime; the loader
        // kept the last one it saw, as a map by name does.
        let mut by_name = std::collections::BTreeMap::new();
        for d in repo
            .query(
                Pagination::all(),
                Some(DocumentFilter::new().name(StringFilter::equal_any(names.clone()))),
                None,
            )
            .unwrap()
        {
            by_name.insert(d.name, d.id);
        }
        let through_view: Vec<(String, String)> = by_name.into_iter().collect();

        assert_eq!(
            direct,
            vec![
                ("p/a/Patient".to_string(), "a3".to_string()),
                ("p/b/Patient".to_string(), "b9".to_string()),
                ("p/c/Patient".to_string(), "c2".to_string()),
            ]
        );
        assert_eq!(direct, through_view);
    }
}
