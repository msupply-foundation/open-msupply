use super::{
    master_list_name_join::master_list_name_join,
    master_list_row::master_list,
    name_row::{name::dsl::*, name_oms_fields::dsl as name_oms_fields_dsl},
    name_store_join::name_store_join,
    program_row::program,
    store_row::store,
    StorageConnection,
};
use crate::{
    item_link, name_link, repository_error::RepositoryError, ChangeLogInsertRow,
    ChangelogRepository, ChangelogTableName, EqualFilter, NameLinkRow, NameLinkRowRepository,
    RowActionType,
};
use crate::{Delete, Upsert};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    #[sql_name = "name"]
    name (id) {
        id -> Text,
        #[sql_name = "name"]
        name_  -> Text,
        code -> Text,
        #[sql_name = "type"]
        type_ -> crate::db_diesel::name_row::NameTypeMapping,
        is_customer -> Bool,
        is_supplier -> Bool,

        supplying_store_id -> Nullable<Text>,
        first_name -> Nullable<Text>,
        last_name -> Nullable<Text>,
        gender -> Nullable<crate::db_diesel::name_row::GenderTypeMapping>,
        date_of_birth -> Nullable<Date>,
        phone -> Nullable<Text>,
        charge_code-> Nullable<Text>,
        comment -> Nullable<Text>,
        country -> Nullable<Text>,
        address1 -> Nullable<Text>,
        address2 -> Nullable<Text>,
        email -> Nullable<Text>,
        website -> Nullable<Text>,
        is_manufacturer -> Bool,
        is_donor -> Bool,
        on_hold -> Bool,
        created_datetime -> Nullable<Timestamp>,
        is_deceased -> Bool,
        national_health_number -> Nullable<Text>,
        date_of_death -> Nullable<Date>,
        custom_data -> Nullable<Text>,

        deleted_datetime -> Nullable<Timestamp>,
    }
}

table! {
    #[sql_name = "name"]
    name_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

table! {
    #[sql_name = "name"]
    name_oms_fields (id) {
        id -> Text,
        properties -> Nullable<Text>,
    }
}

alias!(name_oms_fields as name_oms_fields_alias: NameOmsFields);

joinable!(name_oms_fields -> name (id));
allow_tables_to_appear_in_same_query!(name, item_link);
allow_tables_to_appear_in_same_query!(name, name_link);
allow_tables_to_appear_in_same_query!(name, name_oms_fields);
// for names query
allow_tables_to_appear_in_same_query!(name_oms_fields, item_link);
allow_tables_to_appear_in_same_query!(name_oms_fields, name_link);
allow_tables_to_appear_in_same_query!(name_oms_fields, store);
allow_tables_to_appear_in_same_query!(name_oms_fields, name_store_join);
// for programs query
allow_tables_to_appear_in_same_query!(name_oms_fields, master_list_name_join);
allow_tables_to_appear_in_same_query!(name_oms_fields, master_list);
allow_tables_to_appear_in_same_query!(name_oms_fields, program);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum GenderType {
    Female,
    Male,
    Transgender,
    TransgenderMale,
    TransgenderMaleHormone,
    TransgenderMaleSurgical,
    TransgenderFemale,
    TransgenderFemaleHormone,
    TransgenderFemaleSurgical,
    Unknown,
    NonBinary,
}

impl GenderType {
    pub fn equal_to(&self) -> EqualFilter<GenderType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
            equal_any_or_null: None,
            is_null: None,
        }
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum NameType {
    Facility,
    Patient,
    Build,
    Invad,
    Repack,
    #[default]
    Store,

    #[serde(other)]
    Others,
}

impl NameType {
    pub fn is_facility_or_store(&self) -> bool {
        *self == NameType::Facility || *self == NameType::Store
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = name)]
pub struct NameRow {
    pub id: String,
    #[diesel(column_name = name_)]
    pub name: String,
    pub code: String,
    #[diesel(column_name = type_)]
    pub r#type: NameType,
    pub is_customer: bool,
    pub is_supplier: bool,

    pub supplying_store_id: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,

    pub gender: Option<GenderType>,
    pub date_of_birth: Option<NaiveDate>,
    pub phone: Option<String>,
    pub charge_code: Option<String>,

    pub comment: Option<String>,
    pub country: Option<String>,

    pub address1: Option<String>,
    pub address2: Option<String>,

    pub email: Option<String>,

    pub website: Option<String>,

    pub is_manufacturer: bool,
    pub is_donor: bool,
    pub on_hold: bool,

    pub created_datetime: Option<NaiveDateTime>,

    pub is_deceased: bool,
    pub national_health_number: Option<String>,
    pub date_of_death: Option<NaiveDate>,
    #[diesel(column_name = "custom_data")]
    pub custom_data_string: Option<String>,

    // Acts as a flag for soft deletion
    pub deleted_datetime: Option<NaiveDateTime>,
}

#[derive(
    Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = name_oms_fields)]
pub struct NameOmsFieldsRow {
    pub id: String,
    pub properties: Option<String>,
}

pub struct NameRowRepository<'a> {
    connection: &'a StorageConnection,
}

fn insert_or_ignore_name_link(
    connection: &StorageConnection,
    name_row: &NameRow,
) -> Result<(), RepositoryError> {
    let name_link_row = NameLinkRow {
        id: name_row.id.clone(),
        name_id: name_row.id.clone(),
    };
    NameLinkRowRepository::new(connection).insert_one_or_ignore(&name_link_row)?;
    Ok(())
}

impl<'a> NameRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameRowRepository { connection }
    }

    fn _upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .on_conflict(id)
            .do_update()
            .set(name_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &NameRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        insert_or_ignore_name_link(self.connection, row)?;

        self.insert_changelog(row.id.clone(), RowActionType::Upsert)
    }

    pub fn mark_deleted(&self, name_id: &str) -> Result<i64, RepositoryError> {
        diesel::update(name.filter(id.eq(name_id)))
            .set(deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(name_id.to_owned(), RowActionType::Delete)
    }

    pub async fn insert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .execute(self.connection.lock().connection())?;
        insert_or_ignore_name_link(self.connection, name_row)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, name_id: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq(name_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_code(&self, name_code: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(code.eq(name_code))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_oms_fields_by_id(
        &self,
        name_id: &str,
    ) -> Result<Option<NameOmsFieldsRow>, RepositoryError> {
        let result = name_oms_fields_dsl::name_oms_fields
            .filter(name_oms_fields_dsl::id.eq(name_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn update_properties(
        &self,
        name_id: &str,
        properties: &Option<String>,
    ) -> Result<i64, RepositoryError> {
        diesel::update(name_oms_fields::table.find(name_id))
            .set(name_oms_fields::properties.eq(properties))
            .execute(self.connection.lock().connection())?;

        self.insert_changelog_oms_fields(name_id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: String,
        row_action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Name,
            record_id,
            row_action,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    fn insert_changelog_oms_fields(
        &self,
        record_id: String,
        row_action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::NameOmsFields,
            record_id,
            row_action,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }
}

#[derive(Debug, Clone)]
pub struct NameRowDelete(pub String);
// TODO soft delete
impl Delete for NameRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = NameRowRepository::new(con).mark_deleted(&self.0)?;
        Ok(Some(change_log_id))
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            NameRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for NameRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = NameRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

impl Upsert for NameOmsFieldsRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id =
            NameRowRepository::new(con).update_properties(&self.id, &self.properties)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameRowRepository::new(con).find_one_oms_fields_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use util::uuid::uuid;

    use crate::{
        mock::MockDataInserts, test_db::setup_all, EqualFilter, NameFilter, NameRepository,
        NameRow, NameRowRepository,
    };

    #[actix_rt::test]
    async fn name_sync_update_does_not_overwrite_properties() {
        let (_, connection, _, _) = setup_all(
            "name_sync_update_does_not_overwrite_properties",
            MockDataInserts::none(),
        )
        .await;

        let row_repo = NameRowRepository::new(&connection);

        let name_repo = NameRepository::new(&connection);

        let row = NameRow {
            id: uuid(),
            ..Default::default()
        };

        // First insert
        row_repo.upsert_one(&row).unwrap();

        let properties = Some("{\"key\": \"test\"}".to_string());

        // Add properties to name
        row_repo.update_properties(&row.id, &properties).unwrap();

        let name_filter = NameFilter::new().id(EqualFilter::equal_to(&row.id));
        let name = name_repo
            .query_one("store_id", name_filter.clone())
            .unwrap()
            .unwrap();

        // Check properties have been set
        assert_eq!(name.properties, properties);

        // upsert name_row
        row_repo.upsert_one(&row).unwrap();

        let name = name_repo
            .query_one("store_id", name_filter)
            .unwrap()
            .unwrap();

        // Properties have not been overwritten
        assert_eq!(name.properties, properties);
    }
}
