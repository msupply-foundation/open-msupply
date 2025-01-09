use crate::StorageConnection;

use crate::diesel_macros::apply_equal_filter;

use crate::{repository_error::RepositoryError, DBType, EqualFilter};
use diesel::{dsl::IntoBoxed, prelude::*};

use super::{diagnosis_row::diagnosis, DiagnosisRow};

pub type Diagnosis = DiagnosisRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct DiagnosisFilter {
    pub id: Option<EqualFilter<String>>,
    pub is_active: Option<bool>,
}

pub struct DiagnosisRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DiagnosisRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DiagnosisRepository { connection }
    }

    pub fn count(&self, filter: Option<DiagnosisFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: DiagnosisFilter,
    ) -> Result<Vec<Diagnosis>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<DiagnosisFilter>,
    ) -> Result<Vec<Diagnosis>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<Diagnosis>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<DiagnosisFilter>) -> BoxedDiagnosisQuery {
        let mut query = diagnosis::table.into_boxed();

        if let Some(f) = filter {
            let DiagnosisFilter { id, is_active } = f;
            apply_equal_filter!(query, id, diagnosis::id);
            if let Some(is_active) = is_active {
                let today = chrono::Utc::now().naive_utc().date();

                match is_active {
                    true => {
                        query = query.filter(
                            diagnosis::valid_till
                                .gt(today)
                                .or(diagnosis::valid_till.is_null()),
                        )
                    }
                    false => {
                        query = query.filter(
                            diagnosis::valid_till
                                .le(today)
                                .and(diagnosis::valid_till.is_not_null()),
                        )
                    }
                }
            }
        }

        query
    }
}

type BoxedDiagnosisQuery = IntoBoxed<'static, diagnosis::table, DBType>;

impl DiagnosisFilter {
    pub fn new() -> DiagnosisFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn is_active(mut self, filter: bool) -> Self {
        self.is_active = Some(filter);
        self
    }
}
