use super::StorageConnection;

use crate::diesel_macros::{
    apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter,
};
use crate::{
    db_diesel::{
        name_link_row::{name_link, name_link::dsl as name_link_dsl},
        name_row::{name, name::dsl as name_dsl},
    },
    NameLinkRow, NameRow,
};
use crate::{DBType, DatetimeFilter, EqualFilter, Pagination, RepositoryError, Sort, StringFilter};

use chrono::{DateTime, NaiveDateTime, Utc};
use diesel::helper_types::{InnerJoin, IntoBoxed, LeftJoin};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    document (id) {
        id -> Text,
        name -> Text,
        parent_ids -> Text,
        user_id -> Text,
        datetime -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        form_schema_id -> Nullable<Text>,
        status -> crate::db_diesel::document::DocumentStatusMapping,
        owner_name_link_id -> Nullable<Text>,
        context_id -> Text,
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
        owner_name_link_id -> Nullable<Text>,
        context_id -> Text,
    }
}

table! {
    #[sql_name = "document"]
    document_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}
joinable!(document -> name_link (owner_name_link_id));
allow_tables_to_appear_in_same_query!(document, name);
allow_tables_to_appear_in_same_query!(document, name_link);

joinable!(latest_document -> name_link (owner_name_link_id));
allow_tables_to_appear_in_same_query!(latest_document, name);
allow_tables_to_appear_in_same_query!(latest_document, name_link);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum DocumentStatus {
    #[default]
    Active,
    Deleted,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[cfg_attr(test, derive(Default))]
#[table_name = "document"]
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
    #[column_name = "type_"]
    pub r#type: String,
    /// The actual document data
    pub data: String,
    /// JSON schema id containing the schema for the data
    pub form_schema_id: Option<String>,
    /// Soft deletion status
    pub status: DocumentStatus,
    /// For example, the patient who owns the document
    pub owner_name_link_id: Option<String>,
    /// For example, program this document belongs to
    pub context_id: String,
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

pub type DocumentJoin = (DocumentRow, Option<(NameLinkRow, NameRow)>);

type BoxedDocumentQuery = IntoBoxed<
    'static,
    LeftJoin<latest_document::table, InnerJoin<name_link::table, name::table>>,
    DBType,
>;

fn create_latest_filtered_query<'a>(filter: Option<DocumentFilter>) -> BoxedDocumentQuery {
    let mut query = latest_document::dsl::latest_document
        .left_join(name_link_dsl::name_link.inner_join(name_dsl::name))
        .into_boxed();

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
        apply_equal_filter!(query, owner, name_dsl::id);
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
    fn _insert(&self, doc: &Document) -> Result<(), RepositoryError> {
        diesel::insert_into(document::dsl::document)
            .values(doc.to_row()?)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(document_is_sync_update::table.find(id))
            .set(document_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn insert(&self, doc: &Document) -> Result<(), RepositoryError> {
        diesel::insert_into(document::dsl::document)
            .values(doc.to_row()?)
            .execute(&self.connection.connection)?;
        self.toggle_is_sync_update(&doc.id, false)?;
        Ok(())
    }

    /// Get a specific document version
    pub fn find_one_by_id(&self, document_id: &str) -> Result<Option<Document>, RepositoryError> {
        let row: Option<DocumentJoin> = document::dsl::document
            .left_join(name_link_dsl::name_link.inner_join(name_dsl::name))
            .filter(document::dsl::id.eq(document_id))
            .first(&self.connection.connection)
            .optional()?;

        Ok(match row {
            Some(row) => Some(to_document(row)?),
            None => None,
        })
    }

    pub fn sync_insert(&self, row: &Document) -> Result<(), RepositoryError> {
        self.insert(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = document_is_sync_update::table
            .find(id)
            .select(document_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn count(&self, filter: Option<DocumentFilter>) -> Result<i64, RepositoryError> {
        let query = create_latest_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
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
                    apply_sort!(query, sort, name_dsl::id)
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
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load(&self.connection.connection)?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(to_document(row)?);
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
        let mut query = document::dsl::document
            .left_join(name_link_dsl::name_link.inner_join(name_dsl::name))
            .into_boxed();
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
            apply_equal_filter!(query, owner, name_dsl::id);
            apply_equal_filter!(query, context, document::dsl::context_id);
            apply_string_filter!(query, data, document::dsl::data);
        }
        let rows: Vec<DocumentJoin> = query
            .order(document::dsl::datetime.desc())
            .load(&self.connection.connection)?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(to_document(row)?);
        }
        Ok(result)
    }
}

fn to_document(join: DocumentJoin) -> Result<Document, RepositoryError> {
    let (
        DocumentRow {
            id,
            name,
            parent_ids,
            user_id,
            datetime,
            r#type,
            data,
            form_schema_id,
            status,
            owner_name_link_id: _,
            context_id,
        },
        owner_name_join,
    ) = join;

    let parents: Vec<String> =
        serde_json::from_str(&parent_ids).map_err(|err| RepositoryError::DBError {
            msg: "Invalid parents data".to_string(),
            extra: format!("{}", err),
        })?;
    let data: serde_json::Value =
        serde_json::from_str(&data).map_err(|err| RepositoryError::DBError {
            msg: "Invalid data".to_string(),
            extra: format!("{}", err),
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
        owner_name_id: owner_name_join.map(|(_, name_row)| name_row.id),
        context_id,
    };

    Ok(document)
}

impl Document {
    pub fn to_row(&self) -> Result<DocumentRow, RepositoryError> {
        let parents =
            serde_json::to_string(&self.parent_ids).map_err(|err| RepositoryError::DBError {
                msg: "Can't serialize parents".to_string(),
                extra: format!("{}", err),
            })?;
        let data = serde_json::to_string(&self.data).map_err(|err| RepositoryError::DBError {
            msg: "Can't serialize data".to_string(),
            extra: format!("{}", err),
        })?;
        Ok(DocumentRow {
            id: self.id.to_owned(),
            name: self.name.to_owned(),
            parent_ids: parents,
            user_id: self.user_id.to_owned(),
            datetime: self.datetime.naive_utc(),
            r#type: self.r#type.to_owned(),
            data,
            form_schema_id: self.form_schema_id.clone(),
            status: self.status.to_owned(),
            owner_name_link_id: self.owner_name_id.to_owned(),
            context_id: self.context_id.to_owned(),
        })
    }
}

#[cfg(test)]
mod test {
    use util::uuid::uuid;

    use crate::{
        document::to_document, mock::MockDataInserts, test_db::setup_all, ContextRow,
        ContextRowRepository, DocumentRepository, DocumentRow,
    };

    #[actix_rt::test]
    async fn document_is_sync_update() {
        let (_, connection, _, _) = setup_all(
            "document_is_sync_update",
            MockDataInserts::none().items().units(),
        )
        .await;

        let context_row = ContextRow {
            id: "id".to_string(),
            name: "name".to_string(),
        };
        ContextRowRepository::new(&connection)
            .upsert_one(&context_row)
            .unwrap();

        let repo = DocumentRepository::new(&connection);

        let base_row = DocumentRow {
            data: "{}".to_string(),
            parent_ids: "[]".to_string(),
            context_id: context_row.id.clone(),
            ..Default::default()
        };

        // Two rows, to make sure is_sync_update update only affects one row
        let row = DocumentRow {
            id: uuid(),
            parent_ids: "[]".to_string(),
            ..base_row.clone()
        };
        let row2 = DocumentRow {
            id: uuid(),
            parent_ids: "[]".to_string(),
            context_id: context_row.id.clone(),
            ..base_row.clone()
        };

        // First insert
        repo.insert(&to_document((row.clone(), None)).unwrap())
            .unwrap();
        repo.sync_insert(&to_document((row2.clone(), None)).unwrap())
            .unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(true)));
    }
}
