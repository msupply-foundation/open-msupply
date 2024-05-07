use super::{document::document, program_row::program, StorageConnection};

use crate::{repository_error::RepositoryError, GenderType};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

table! {
    contact_trace (id) {
      id -> Text,
      program_id -> Text,
      document_id -> Text,
      datetime -> Timestamp,
      contact_trace_id -> Nullable<Text>,
      patient_link_id -> Text,
      contact_patient_link_id -> Nullable<Text>,
      first_name -> Nullable<Text>,
      last_name -> Nullable<Text>,
      gender -> Nullable<crate::db_diesel::name_row::GenderTypeMapping>,
      date_of_birth -> Nullable<Date>,
      store_id -> Nullable<Text>,
      relationship -> Nullable<Text>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = contact_trace)]
struct ContactTraceRawRow {
    pub id: String,
    pub program_id: String,
    /// The document version used to populate this row
    pub document_id: String,
    pub datetime: NaiveDateTime,
    /// User definable id of the contact trace
    pub contact_trace_id: Option<String>,
    /// Patient id of the patient this contact belongs to.
    pub patient_link_id: String,
    /// Linked patient id of the contact.
    pub contact_patient_link_id: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<GenderType>,
    pub date_of_birth: Option<NaiveDate>,
    pub store_id: Option<String>,
    pub relationship: Option<String>,
}

table! {
    contact_trace_name_link_view (id) {
      id -> Text,
      program_id -> Text,
      document_id -> Text,
      datetime -> Timestamp,
      contact_trace_id -> Nullable<Text>,
      patient_id -> Text,
      contact_patient_id -> Nullable<Text>,
      first_name -> Nullable<Text>,
      last_name -> Nullable<Text>,
      gender -> Nullable<crate::db_diesel::name_row::GenderTypeMapping>,
      date_of_birth -> Nullable<Date>,
      store_id -> Nullable<Text>,
      relationship -> Nullable<Text>,
    }
}

joinable!(contact_trace_name_link_view -> program (program_id));
allow_tables_to_appear_in_same_query!(contact_trace_name_link_view, program);
joinable!(contact_trace_name_link_view -> document (document_id));
allow_tables_to_appear_in_same_query!(contact_trace_name_link_view, document);

#[derive(Clone, Queryable, Debug, PartialEq, Eq)]
pub struct ContactTraceRow {
    pub id: String,
    pub program_id: String,
    /// The document version used to populate this row
    pub document_id: String,
    pub datetime: NaiveDateTime,
    /// User definable id of the contact trace
    pub contact_trace_id: Option<String>,
    /// Patient id of the patient this contact belongs to (name_id not the name_link_id).
    pub patient_id: String,
    /// Linked patient id of the contact (name_id not the name_link_id).
    pub contact_patient_id: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub gender: Option<GenderType>,
    pub date_of_birth: Option<NaiveDate>,
    pub store_id: Option<String>,
    pub relationship: Option<String>,
}

impl ContactTraceRow {
    fn to_raw(&self) -> ContactTraceRawRow {
        let ContactTraceRow {
            id,
            program_id,
            document_id,
            datetime,
            contact_trace_id,
            patient_id,
            contact_patient_id,
            first_name,
            last_name,
            gender,
            date_of_birth,
            store_id,
            relationship,
        } = self.clone();
        ContactTraceRawRow {
            id,
            program_id,
            document_id,
            datetime,
            contact_trace_id,
            // use name ids as name_link_ids
            patient_link_id: patient_id,
            contact_patient_link_id: contact_patient_id,
            first_name,
            last_name,
            gender,
            date_of_birth,
            store_id,
            relationship,
        }
    }
}

pub struct ContactTraceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ContactTraceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ContactTraceRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &ContactTraceRow) -> Result<(), RepositoryError> {
        diesel::insert_into(contact_trace::dsl::contact_trace)
            .values(row.to_raw())
            .on_conflict(contact_trace::dsl::id)
            .do_update()
            .set(row.to_raw())
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &ContactTraceRow) -> Result<(), RepositoryError> {
        diesel::replace_into(contact_trace::dsl::contact_trace)
            .values(row.to_raw())
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub async fn insert_one(&self, row: &ContactTraceRow) -> Result<(), RepositoryError> {
        diesel::insert_into(contact_trace::dsl::contact_trace)
            .values(row.to_raw())
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use crate::{
        contact_trace::ContactTraceRepository,
        contact_trace_row::ContactTraceRow,
        mock::{
            document_a, mock_merged_patient_name_link, mock_program_a, mock_store_a,
            MockDataInserts,
        },
        test_db, GenderType, Pagination,
    };

    use super::ContactTraceRowRepository;

    // This trivial looking test has been added to test name_id -> name_link_id changes
    #[actix_rt::test]
    async fn test_contact_trace_name_links() {
        let (_, connection, _, _) =
            test_db::setup_all("test_contact_trace_name_links", MockDataInserts::all()).await;

        let patient_link = mock_merged_patient_name_link();
        let row = ContactTraceRow {
            id: "ct1".to_string(),
            program_id: mock_program_a().id,
            document_id: document_a().id,
            datetime: NaiveDate::from_ymd_opt(2024, 1, 15)
                .unwrap()
                .and_hms_opt(00, 00, 00)
                .unwrap(),
            contact_trace_id: Some("id".to_string()),
            // use the link id here, i.e. the patient id of the soft deleted patient:
            patient_id: patient_link.id.clone(),
            contact_patient_id: Some(patient_link.id.clone()),
            first_name: Some("first".to_string()),
            last_name: Some("last".to_string()),
            gender: Some(GenderType::Female),
            date_of_birth: Some(NaiveDate::from_ymd_opt(2000, 1, 15).unwrap()),
            store_id: Some(mock_store_a().id),
            relationship: Some("rel".to_string()),
        };
        ContactTraceRowRepository::new(&connection)
            .upsert_one(&row)
            .unwrap();

        // the query result should point to the actual name_ids
        let mut expected = row;
        expected.patient_id = patient_link.name_id.clone();
        expected.contact_patient_id = Some(patient_link.name_id.clone());
        let contact_trace = ContactTraceRepository::new(&connection)
            .query(Pagination::all(), None, None)
            .unwrap()
            .pop()
            .unwrap()
            .contact_trace;
        assert_eq!(&expected, &contact_trace);
    }
}
