use super::{program_event_row::program_event, StorageConnection};

use crate::{
    db_diesel::{name_link_row::name_link, name_row::name},
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter},
    DBType, DatetimeFilter, EqualFilter, NameLinkRow, NameRow, Pagination, ProgramEventRow,
    RepositoryError, Sort, StringFilter,
};

use diesel::{
    dsl::IntoBoxed,
    helper_types::{InnerJoin, LeftJoin},
    prelude::*,
};

#[derive(Clone, Default)]
pub struct ProgramEventFilter {
    pub datetime: Option<DatetimeFilter>,
    pub active_start_datetime: Option<DatetimeFilter>,
    pub active_end_datetime: Option<DatetimeFilter>,
    pub patient_id: Option<EqualFilter<String>>,
    pub document_type: Option<EqualFilter<String>>,
    pub context_id: Option<EqualFilter<String>>,
    pub document_name: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<String>>,
    pub data: Option<StringFilter>,
}

impl ProgramEventFilter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn active_start_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.active_start_datetime = Some(filter);
        self
    }

    pub fn active_end_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.active_end_datetime = Some(filter);
        self
    }

    pub fn patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.patient_id = Some(filter);
        self
    }

    pub fn document_type(mut self, filter: EqualFilter<String>) -> Self {
        self.document_type = Some(filter);
        self
    }

    pub fn context_id(mut self, filter: EqualFilter<String>) -> Self {
        self.context_id = Some(filter);
        self
    }

    pub fn document_name(mut self, filter: EqualFilter<String>) -> Self {
        self.document_name = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn data(mut self, filter: StringFilter) -> Self {
        self.data = Some(filter);
        self
    }
}

pub enum ProgramEventSortField {
    Datetime,
    ActiveStartDatetime,
    ActiveEndDatetime,
    DocumentType,
    DocumentName,
    Type,
}

macro_rules! apply_program_event_filters {
    ($query:ident, $filter:expr ) => {{
        if let Some(f) = $filter {
            apply_date_time_filter!($query, f.datetime, program_event::datetime);
            apply_date_time_filter!(
                $query,
                f.active_start_datetime,
                program_event::active_start_datetime
            );
            apply_date_time_filter!(
                $query,
                f.active_end_datetime,
                program_event::active_end_datetime
            );
            apply_equal_filter!($query, f.context_id, program_event::context_id);
            apply_equal_filter!($query, f.document_type, program_event::document_type);
            apply_equal_filter!($query, f.document_name, program_event::document_name);
            apply_equal_filter!($query, f.r#type, program_event::type_);
            apply_string_filter!($query, f.data, program_event::data);
        }
        $query
    }};
}

// This part is split out because otherwise apply_program_event_filters doesn't work for deletes.
// See special patient id filter handling in ProgramEventRepository::delete...
macro_rules! apply_patient_id_filters {
    ($query:ident, $filter:expr ) => {{
        if let Some(f) = $filter {
            apply_equal_filter!($query, f.patient_id, name_link::name_id);
        }
        $query
    }};
}

pub type ProgramEventSort = Sort<ProgramEventSortField>;
pub type ProgramEventJoin = (ProgramEventRow, Option<(NameLinkRow, NameRow)>);
pub struct ProgramEvent {
    pub program_event_row: ProgramEventRow,
    pub name_row: Option<NameRow>,
}

type BoxedProgramEventQuery = IntoBoxed<
    'static,
    LeftJoin<program_event::table, InnerJoin<name_link::table, name::table>>,
    DBType,
>;

fn create_filtered_query(filter: Option<ProgramEventFilter>) -> BoxedProgramEventQuery {
    let mut query = program_event::table
        .left_join(name_link::table.inner_join(name::table))
        .into_boxed();
    query = apply_program_event_filters!(query, filter.clone());
    apply_patient_id_filters!(query, filter)
}

pub struct ProgramEventRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramEventRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramEventRepository { connection }
    }

    pub fn count(&self, filter: Option<ProgramEventFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ProgramEventFilter,
    ) -> Result<Vec<ProgramEvent>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ProgramEventFilter>,
        sort: Option<ProgramEventSort>,
    ) -> Result<Vec<ProgramEvent>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ProgramEventSortField::Datetime => {
                    apply_sort!(query, sort, program_event::datetime)
                }
                ProgramEventSortField::ActiveStartDatetime => {
                    apply_sort!(query, sort, program_event::active_start_datetime)
                }
                ProgramEventSortField::ActiveEndDatetime => {
                    apply_sort!(query, sort, program_event::active_end_datetime)
                }
                ProgramEventSortField::DocumentType => {
                    apply_sort!(query, sort, program_event::document_type)
                }
                ProgramEventSortField::DocumentName => {
                    apply_sort!(query, sort, program_event::document_name)
                }
                ProgramEventSortField::Type => apply_sort!(query, sort, program_event::type_),
            }
        } else {
            query = query.order(program_event::datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ProgramEventJoin>(self.connection.lock().connection())?
            .into_iter()
            .map(|it| ProgramEvent {
                program_event_row: it.0,
                name_row: it.1.map(|(_, name_row)| name_row),
            })
            .collect();

        Ok(result)
    }

    pub fn delete(&self, filter: ProgramEventFilter) -> Result<(), RepositoryError> {
        let mut query = diesel::delete(program_event::table).into_boxed();
        if let Some(patient_id) = &filter.patient_id {
            let mut sub_query = name_link::table.into_boxed();
            apply_equal_filter!(sub_query, Some(patient_id.clone()), name_link::name_id);
            query = query.filter(
                program_event::patient_link_id.eq_any(sub_query.select(name_link::id).nullable()),
            );
        }
        query = apply_program_event_filters!(query, Some(filter));
        query.execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use chrono::DateTime;

    use crate::{
        mock::{context_program_a, mock_patient, mock_patient_b, MockDataInserts},
        test_db::setup_all,
        EqualFilter, Pagination, ProgramEventFilter, ProgramEventRepository, ProgramEventRow,
        ProgramEventRowRepository,
    };

    #[actix_rt::test]
    async fn program_event_delete() {
        let (_, connection, _, _) = setup_all("program_event_delete", MockDataInserts::all()).await;

        let row_repo = ProgramEventRowRepository::new(&connection);
        row_repo
            .upsert_one(&ProgramEventRow {
                id: "event1".to_string(),
                datetime: DateTime::from_timestamp(5, 0).unwrap().naive_utc(),
                active_start_datetime: DateTime::from_timestamp(5, 0).unwrap().naive_utc(),
                active_end_datetime: DateTime::from_timestamp(1000, 0).unwrap().naive_utc(),
                patient_link_id: Some(mock_patient().id),
                context_id: context_program_a().id,
                document_type: "type1".to_string(),
                document_name: None,
                r#type: "data type".to_string(),
                data: None,
            })
            .unwrap();
        row_repo
            .upsert_one(&ProgramEventRow {
                id: "event2".to_string(),
                datetime: DateTime::from_timestamp(5, 0).unwrap().naive_utc(),
                active_start_datetime: DateTime::from_timestamp(5, 0).unwrap().naive_utc(),
                active_end_datetime: DateTime::from_timestamp(1000, 0).unwrap().naive_utc(),
                patient_link_id: Some(mock_patient_b().id),
                context_id: context_program_a().id,
                document_type: "type2".to_string(),
                document_name: None,
                r#type: "data type".to_string(),
                data: None,
            })
            .unwrap();

        let repo = ProgramEventRepository::new(&connection);
        assert_eq!(repo.query(Pagination::all(), None, None).unwrap().len(), 2);

        // test deleting by patient id
        repo.delete(
            ProgramEventFilter::new()
                .document_type(EqualFilter::equal_to("type1"))
                .patient_id(EqualFilter::equal_to(&mock_patient().id)),
        )
        .unwrap();
        assert_eq!(
            repo.query(Pagination::all(), None, None)
                .unwrap()
                .pop()
                .unwrap()
                .name_row
                .unwrap()
                .id,
            mock_patient_b().id
        );

        // delete the second event without patient filter
        repo.delete(ProgramEventFilter::new().document_type(EqualFilter::equal_to("type2")))
            .unwrap();
        assert_eq!(repo.query(Pagination::all(), None, None).unwrap().len(), 0);
    }
}
