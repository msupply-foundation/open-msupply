use super::{name_row::name::dsl::*, StorageConnection};
use crate::{
    item_link, name_link, repository_error::RepositoryError, EqualFilter, NameLinkRow,
    NameLinkRowRepository,
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
        gender -> Nullable<crate::db_diesel::name_row::GenderMapping>,
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
    }
}

table! {
    #[sql_name = "name"]
    name_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

allow_tables_to_appear_in_same_query!(name, item_link);
allow_tables_to_appear_in_same_query!(name, name_link);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum Gender {
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

impl Gender {
    pub fn equal_to(&self) -> EqualFilter<Gender> {
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

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum NameType {
    Facility,
    Patient,
    Build,
    Invad,
    Repack,
    Store,

    #[serde(other)]
    Others,
}

impl Default for NameType {
    fn default() -> Self {
        NameType::Store
    }
}

impl NameType {
    pub fn is_facility_or_store(&self) -> bool {
        *self == NameType::Facility || *self == NameType::Store
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "name"]
pub struct NameRow {
    pub id: String,
    #[column_name = "name_"]
    pub name: String,
    pub code: String,
    #[column_name = "type_"]
    pub r#type: NameType,
    pub is_customer: bool,
    pub is_supplier: bool,

    pub supplying_store_id: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,

    pub gender: Option<Gender>,
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
    #[column_name = "custom_data"]
    pub custom_data_string: Option<String>,
}

pub struct NameRowRepository<'a> {
    connection: &'a StorageConnection,
}

fn insert_or_ignore_name_link<'a>(
    connection: &'a StorageConnection,
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

    #[cfg(feature = "postgres")]
    fn _upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .on_conflict(id)
            .do_update()
            .set(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name)
            .values(name_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(
        &self,
        name_id: &str,
        is_sync_update: bool,
    ) -> Result<(), RepositoryError> {
        diesel::update(name_is_sync_update::table.find(name_id))
            .set(name_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &NameRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        insert_or_ignore_name_link(&self.connection, row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    pub fn delete(&self, name_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name.filter(id.eq(name_id))).execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name)
            .values(name_row)
            .execute(&self.connection.connection)?;
        insert_or_ignore_name_link(&self.connection, name_row)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, name_id: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq(name_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_code(&self, name_code: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name
            .filter(code.eq(name_code))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NameRow>, RepositoryError> {
        let result = name
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn sync_upsert_one(&self, row: &NameRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        insert_or_ignore_name_link(&self.connection, row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, name_id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = name_is_sync_update::table
            .find(name_id)
            .select(name_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct NameRowDelete(pub String);
// TODO soft delete
impl Delete for NameRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        NameRowRepository::new(con).delete(&self.0)
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
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        NameRowRepository::new(con).sync_upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use util::uuid::uuid;

    use crate::{mock::MockDataInserts, test_db::setup_all, NameRow, NameRowRepository};

    #[actix_rt::test]
    async fn name_is_sync_update() {
        let (_, connection, _, _) = setup_all(
            "name_is_sync_update",
            MockDataInserts::none().items().units(),
        )
        .await;

        let repo = NameRowRepository::new(&connection);

        // Two rows, to make sure is_sync_update update only affects one row
        let row = NameRow {
            id: uuid(),
            ..Default::default()
        };
        let row2 = NameRow {
            id: uuid(),
            ..Default::default()
        };

        // First insert
        repo.upsert_one(&row).unwrap();
        repo.upsert_one(&row2).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(true)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));
    }
}
