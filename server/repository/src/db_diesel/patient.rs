use super::{
    DBType, NameRow, StorageConnection,
    name_row::name,
    name_search::{NameColumn, words_start_with},
    name_store_join::name_store_join,
};

use crate::{
    DateFilter, EqualFilter, GenderType, NameCondition, NameRowType, Pagination,
    ProgramEnrolmentFilter, ProgramEnrolmentRepository, Sort, StringFilter,
    diesel_extensions::date_coalesce,
    diesel_macros::{
        apply_date_filter, apply_equal_filter, apply_sort, apply_sort_no_case, apply_string_filter,
        apply_string_or_filter,
    },
    repository_error::RepositoryError,
};

use chrono::NaiveDate;
use diesel::{dsl::IntoBoxed, prelude::*};
use serde::{Deserialize, Serialize};

pub type Patient = NameRow;

#[derive(Clone, Default, PartialEq, Debug, Serialize, Deserialize)]
pub struct PatientFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub code: Option<StringFilter>,
    pub code_2: Option<StringFilter>,
    pub first_name: Option<StringFilter>,
    pub last_name: Option<StringFilter>,
    pub gender: Option<EqualFilter<GenderType>>,
    pub date_of_birth: Option<DateFilter>,
    pub date_of_death: Option<DateFilter>,
    pub phone: Option<StringFilter>,
    pub address1: Option<StringFilter>,
    pub address2: Option<StringFilter>,
    pub country: Option<StringFilter>,
    pub email: Option<StringFilter>,
    pub next_of_kin_name: Option<StringFilter>,

    /// Filter for any identifier associated with a name entry.
    /// Currently:
    /// - name::code
    /// - name::name
    /// - name::national_health_number
    /// - program_enrolment::program_enrolment_id
    pub identifier: Option<StringFilter>,
    /// The code or the secondary code (name::national_health_number) matches.
    /// Each is looked up on its own and the results combined, so the filter
    /// stays one condition that ANDs with the rest.
    pub code_or_code_2: Option<StringFilter>,
    pub program_enrolment_name: Option<StringFilter>,

    /// Client-provided dynamic filter AST (currently property conditions only).
    /// ANDs with the other filters. Keys must be validated against the "patient"
    /// table scope's allowed property keys in the service layer.
    pub dynamic_filter: Option<NameCondition::Inner>,

    /// The patient is (or isn't) visible in a store: the store has a visible
    /// name_store_join for them. Unset, patients are returned whichever store
    /// they belong to, as a lookup by id needs.
    pub visible_in_store: Option<VisibleInStore>,
}

#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
pub struct VisibleInStore {
    pub store_id: String,
    pub is_visible: bool,
}

#[derive(PartialEq, Debug)]
pub enum PatientSortField {
    Name,
    Code,
    Code2,
    FirstName,
    LastName,
    Gender,
    DateOfBirth,
    Phone,
    Address1,
    Address2,
    Country,
    Email,
    DateOfDeath,
    CreatedDatetime,
}

pub type PatientSort = Sort<PatientSortField>;

pub struct PatientRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PatientRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PatientRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<PatientFilter>,
        allowed_ctx: Option<&[String]>,
    ) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter, allowed_ctx);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    /// Counts the matching patients, but stops at `limit`: a short search on a
    /// big site can match most of it, and counting all of them is the slow
    /// part. Returns `limit` when there are at least that many.
    pub fn count_up_to(
        &self,
        filter: Option<PatientFilter>,
        allowed_ctx: Option<&[String]>,
        limit: u32,
    ) -> Result<i64, RepositoryError> {
        let ids: Vec<String> = Self::create_filtered_query(filter, allowed_ctx)
            .select(name::id)
            .limit(limit as i64)
            .load(self.connection.lock().connection())?;
        Ok(ids.len() as i64)
    }

    pub fn query_by_filter(
        &self,
        filter: PatientFilter,
        allowed_ctx: Option<&[String]>,
    ) -> Result<Vec<Patient>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None, allowed_ctx)
    }

    pub fn query_one(
        &self,
        filter: PatientFilter,
        allowed_ctx: Option<&[String]>,
    ) -> Result<Option<Patient>, RepositoryError> {
        Ok(self.query_by_filter(filter, allowed_ctx)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PatientFilter>,
        sort: Option<PatientSort>,
        allowed_ctx: Option<&[String]>,
    ) -> Result<Vec<Patient>, RepositoryError> {
        self.load_page(
            Self::create_filtered_query(filter, allowed_ctx),
            pagination,
            sort,
        )
    }

    /// The most matches a page of patient search is sorted from (`query_capped`):
    /// about 300 ms for the broadest search over 8M patients.
    pub const SEARCH_MATCH_CAP: u32 = 1000;

    /// As `query`, but sorts and pages only the first `cap` matches found, in
    /// no particular order. With fewer matches than that it's the same as
    /// `query`. With more, sorting them all is the slow part of a broad search
    /// on a big list, so the pages cover `cap` of them and paging further may
    /// repeat or miss some: the search should be narrowed.
    pub fn query_capped(
        &self,
        pagination: Pagination,
        filter: Option<PatientFilter>,
        sort: Option<PatientSort>,
        allowed_ctx: Option<&[String]>,
        cap: u32,
    ) -> Result<Vec<Patient>, RepositoryError> {
        let matches = Self::create_filtered_query(filter, allowed_ctx)
            .select(name::id)
            .limit(cap as i64);
        self.load_page(
            name::table.filter(name::id.eq_any(matches)).into_boxed(),
            pagination,
            sort,
        )
    }

    fn load_page(
        &self,
        mut query: BoxedNameQuery,
        pagination: Pagination,
        sort: Option<PatientSort>,
    ) -> Result<Vec<Patient>, RepositoryError> {
        if let Some(sort) = sort {
            match sort.key {
                PatientSortField::Name => {
                    apply_sort_no_case!(query, sort, name::name_);
                    // Namesakes in date of birth order (spec/patients rules,
                    // the patient search)
                    query = query.then_order_by(name::date_of_birth.asc());
                }
                PatientSortField::Code => {
                    apply_sort_no_case!(query, sort, name::code);
                }
                PatientSortField::FirstName => {
                    apply_sort_no_case!(query, sort, name::first_name)
                }
                PatientSortField::LastName => apply_sort_no_case!(query, sort, name::last_name),
                PatientSortField::Gender => apply_sort!(query, sort, name::gender),
                PatientSortField::DateOfBirth => {
                    apply_sort!(query, sort, name::date_of_birth)
                }
                PatientSortField::Phone => apply_sort_no_case!(query, sort, name::phone),
                PatientSortField::Address1 => apply_sort_no_case!(query, sort, name::address1),
                PatientSortField::Address2 => apply_sort_no_case!(query, sort, name::address2),
                PatientSortField::Country => apply_sort_no_case!(query, sort, name::country),
                PatientSortField::Email => apply_sort_no_case!(query, sort, name::email),
                PatientSortField::Code2 => {
                    apply_sort_no_case!(query, sort, name::national_health_number)
                }
                PatientSortField::DateOfDeath => {
                    apply_sort!(query, sort, name::date_of_death)
                }
                PatientSortField::CreatedDatetime => {
                    apply_sort!(query, sort, name::created_datetime)
                }
            }
        }

        // Stable tiebreaker so paginated results don't shuffle or drop rows
        // when the primary sort column has ties.
        let final_query = query
            .then_order_by(name::id.asc())
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<NameRow>(self.connection.lock().connection())?;

        Ok(result)
    }

    /// Returns patients from the name table, whichever store they belong to
    /// unless the filter's `visible_in_store` narrows them to one store's
    pub fn create_filtered_query(
        filter: Option<PatientFilter>,
        allowed_ctx: Option<&[String]>,
    ) -> BoxedNameQuery {
        let mut query = name::table.into_boxed();
        // Note, below are some OR filters which needs to go first to work
        // TODO: able to make this more robust in Diesel 2?
        if let Some(f) = filter {
            let PatientFilter {
                id,
                name,
                code,
                code_2: national_health_number,
                first_name,
                last_name,
                gender,
                date_of_birth,
                date_of_death,
                phone,
                address1,
                address2,
                country,
                email,
                identifier,
                code_or_code_2,
                program_enrolment_name,
                next_of_kin_name,
                dynamic_filter,
                visible_in_store,
            } = f;

            // or filters need to be applied first
            if identifier.is_some() {
                apply_string_filter!(query, identifier.clone(), name::code);
                apply_string_or_filter!(query, identifier.clone(), name::national_health_number);
                apply_string_or_filter!(query, identifier.clone(), name::name_);

                let sub_query = ProgramEnrolmentRepository::create_filtered_query(Some(
                    ProgramEnrolmentFilter {
                        program_enrolment_id: identifier,
                        program_context_id: allowed_ctx
                            .map(|ctxs| EqualFilter::default().restrict_results(ctxs)),
                        ..Default::default()
                    },
                ))
                .select(name::id);

                query = query.or_filter(name::id.eq_any(sub_query))
            }

            if next_of_kin_name.is_some() {
                let sub_query = Self::create_filtered_query(
                    Some(PatientFilter {
                        name: next_of_kin_name.clone(),
                        ..Default::default()
                    }),
                    None,
                )
                .select(name::id);

                query = query.filter(name::next_of_kin_id.eq_any(sub_query.nullable()));

                apply_string_or_filter!(query, next_of_kin_name, name::next_of_kin_name);
            }

            if program_enrolment_name.is_some() {
                let sub_query = ProgramEnrolmentRepository::create_filtered_query(Some(
                    ProgramEnrolmentFilter {
                        program_name: program_enrolment_name,
                        program_context_id: allowed_ctx
                            .map(|ctxs| EqualFilter::default().restrict_results(ctxs)),
                        ..Default::default()
                    },
                ))
                .select(name::id);

                query = query.filter(name::id.eq_any(sub_query))
            }

            // After next of kin's `or_filter`, which would otherwise OR against it
            if let Some(filter) = code_or_code_2 {
                // On Postgres, the start of a code is a range on its lowercase
                // form, which the code indexes (migration
                // add_patient_search_indexes) serve; ILIKE can't use an index.
                // `starts_with` combined with another operator then means
                // (either code starts with it) AND (either code matches the
                // other), not per code as on SQLite; nothing combines them.
                #[cfg(feature = "postgres")]
                let filter = {
                    let mut filter = filter;
                    if let Some(text) = filter.starts_with.take() {
                        query = query.filter(code_or_code_2_prefix(&text));
                    }
                    filter
                };
                if filter != StringFilter::default() {
                    let mut code_lookup = name::table.select(name::id).into_boxed();
                    apply_string_filter!(code_lookup, Some(filter.clone()), name::code);
                    let mut national_health_number_lookup =
                        name::table.select(name::id).into_boxed();
                    apply_string_filter!(
                        national_health_number_lookup,
                        Some(filter),
                        name::national_health_number
                    );
                    query = query
                        .filter(name::id.eq_any(code_lookup.union(national_health_number_lookup)));
                }
            }

            apply_equal_filter!(query, id, name::id);
            apply_string_filter!(query, code, name::code);
            apply_string_filter!(query, national_health_number, name::national_health_number);
            apply_string_filter!(query, name, name::name_);

            // `starts_with` on a first or last name matches the start of any
            // word in it, ignoring case and accents (name_search.rs); the
            // filter's other operators apply to the whole name as usual
            for (filter, column) in [
                (first_name, NameColumn::FirstName),
                (last_name, NameColumn::LastName),
            ] {
                let Some(mut filter) = filter else { continue };
                if let Some(text) = filter.starts_with.take() {
                    if let Some(condition) = words_start_with(column, &text) {
                        query = query.filter(condition);
                    }
                }
                match column {
                    NameColumn::FirstName => {
                        apply_string_filter!(query, Some(filter), name::first_name)
                    }
                    NameColumn::LastName => {
                        apply_string_filter!(query, Some(filter), name::last_name)
                    }
                }
            }
            apply_equal_filter!(query, gender, name::gender);
            apply_date_filter!(query, date_of_birth, name::date_of_birth);
            apply_date_filter!(
                query,
                date_of_death,
                date_coalesce::coalesce(
                    name::date_of_death,
                    NaiveDate::from_ymd_opt(9999, 12, 31).unwrap()
                )
            );
            apply_string_filter!(query, phone, name::phone);
            apply_string_filter!(query, address1, name::address1);
            apply_string_filter!(query, address2, name::address2);
            apply_string_filter!(query, country, name::country);
            apply_string_filter!(query, email, name::email);

            // This query selects from the bare name table, so the condition
            // (compiled against name::table) applies directly
            if let Some(condition) = dynamic_filter {
                query = query.filter(condition.to_boxed());
            }

            // A subquery rather than a join, so the search conditions above
            // (and their indexes) still apply to the bare name table
            if let Some(VisibleInStore {
                store_id,
                is_visible,
            }) = visible_in_store
            {
                let visible_here = name_store_join::table
                    .filter(name_store_join::store_id.eq(store_id))
                    .filter(name_store_join::visible.eq(true))
                    .select(name_store_join::name_id);
                query = if is_visible {
                    query.filter(name::id.eq_any(visible_here))
                } else {
                    query.filter(name::id.ne_all(visible_here))
                };
            }
        };

        // Only return active (not deleted) patients
        query = query.filter(name::deleted_datetime.is_null());
        apply_equal_filter!(
            query,
            Some(NameRowType::equal_to(&NameRowType::Patient)),
            name::type_
        );
        query
    }
}

type BoxedNameQuery = IntoBoxed<'static, name::table, DBType>;

/// The ids of names whose `column` starts with `text`, ignoring case: a range
/// on the column's lowercase form, so the index on that form applies (an
/// ILIKE can't use it). `column` is one of a fixed few, never input.
/// Either code starts with `text`, ignoring case: a range on each code's
/// lowercase form, so the indexes on those forms apply (an ILIKE can't use
/// them). One OR'd condition rather than a UNION of two lookups, so Postgres
/// can combine the two index scans with the other filters and stop at a LIMIT
/// instead of collecting every id with the prefix first.
#[cfg(feature = "postgres")]
fn code_or_code_2_prefix(
    text: &str,
) -> Box<dyn diesel::BoxableExpression<name::table, DBType, SqlType = diesel::sql_types::Bool>> {
    use diesel::{
        dsl::sql,
        sql_types::{Bool, Text},
    };
    // Every text starting with the prefix sorts (as "C", by bytes) from the
    // prefix itself up to the prefix followed by the last code point
    let text = text.to_string();
    Box::new(
        sql::<Bool>(r#"((lower(name.code) COLLATE "C" >= lower("#)
            .bind::<Text, _>(text.clone())
            .sql(r#") AND lower(name.code) COLLATE "C" < lower("#)
            .bind::<Text, _>(text.clone())
            .sql(r#") || chr(1114111)) OR (lower(name.national_health_number) COLLATE "C" >= lower("#)
            .bind::<Text, _>(text.clone())
            .sql(r#") AND lower(name.national_health_number) COLLATE "C" < lower("#)
            .bind::<Text, _>(text)
            .sql(") || chr(1114111)))"),
    )
}

impl PatientFilter {
    pub fn new() -> PatientFilter {
        PatientFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn code_2(mut self, filter: StringFilter) -> Self {
        self.code_2 = Some(filter);
        self
    }

    pub fn identifier(mut self, filter: StringFilter) -> Self {
        self.identifier = Some(filter);
        self
    }

    pub fn code_or_code_2(mut self, filter: StringFilter) -> Self {
        self.code_or_code_2 = Some(filter);
        self
    }

    pub fn first_name(mut self, filter: StringFilter) -> Self {
        self.first_name = Some(filter);
        self
    }

    pub fn last_name(mut self, filter: StringFilter) -> Self {
        self.last_name = Some(filter);
        self
    }

    pub fn next_of_kin_name(mut self, filter: StringFilter) -> Self {
        self.next_of_kin_name = Some(filter);
        self
    }

    pub fn gender(mut self, filter: EqualFilter<GenderType>) -> Self {
        self.gender = Some(filter);
        self
    }

    pub fn date_of_birth(mut self, filter: DateFilter) -> Self {
        self.date_of_birth = Some(filter);
        self
    }

    pub fn date_of_death(mut self, filter: DateFilter) -> Self {
        self.date_of_death = Some(filter);
        self
    }

    pub fn phone(mut self, filter: StringFilter) -> Self {
        self.phone = Some(filter);
        self
    }

    pub fn address1(mut self, filter: StringFilter) -> Self {
        self.address1 = Some(filter);
        self
    }
    pub fn address2(mut self, filter: StringFilter) -> Self {
        self.address2 = Some(filter);
        self
    }
    pub fn country(mut self, filter: StringFilter) -> Self {
        self.country = Some(filter);
        self
    }

    pub fn email(mut self, filter: StringFilter) -> Self {
        self.email = Some(filter);
        self
    }

    pub fn program_enrolment_name(mut self, filter: StringFilter) -> Self {
        self.program_enrolment_name = Some(filter);
        self
    }

    pub fn dynamic_filter(mut self, condition: NameCondition::Inner) -> Self {
        self.dynamic_filter = Some(condition);
        self
    }

    pub fn visible_in_store(mut self, store_id: &str, is_visible: bool) -> Self {
        self.visible_in_store = Some(VisibleInStore {
            store_id: store_id.to_string(),
            is_visible,
        });
        self
    }
}

#[cfg(test)]
mod tests {
    use chrono::{NaiveDate, Utc};

    use crate::{
        DateFilter, EqualFilter, NameRow, NameRowRepository, NameRowType, PatientFilter,
        PatientRepository, ProgramEnrolmentRow, ProgramEnrolmentRowRepository, StringFilter,
        mock::{MockDataInserts, mock_program_a},
        test_db,
    };

    #[actix_rt::test]
    async fn test_patient_query() {
        let (_, connection, _, _) = test_db::setup_all(
            "patient_query",
            MockDataInserts::none().names().stores().name_store_joins(),
        )
        .await;

        // Make sure we don't return names that are not patients
        let result = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::equal_to("code2")),
                None,
            )
            .unwrap();
        assert_eq!(result.first(), None);

        let patient_row = NameRow {
            id: "patient_1".to_string(),
            r#type: NameRowType::Patient,
            code: "codePatient".to_string(),
            national_health_number: Some("nhnPatient".to_string()),
            ..Default::default()
        };
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row)
            .unwrap();

        let result = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new().id(EqualFilter::equal_to("patient_1".to_string())),
                None,
            )
            .unwrap();
        result.first().unwrap();
    }

    #[actix_rt::test]
    async fn test_patient_next_of_kin_name_query() {
        let (_, connection, _, _) = test_db::setup_all(
            "patient_next_of_kin_name_query",
            MockDataInserts::none().names().stores().name_store_joins(),
        )
        .await;

        let next_of_kin_patient_row = NameRow {
            id: "next_of_kin".to_string(),
            name: "Bestie guy".to_string(),
            r#type: NameRowType::Patient,
            ..Default::default()
        };

        let patient_1_row = NameRow {
            id: "patient_1".to_string(),
            // NOK recorded via next_of_kin_id
            next_of_kin_id: Some(next_of_kin_patient_row.id.clone()),
            r#type: NameRowType::Patient,
            ..Default::default()
        };

        let patient_2_row = NameRow {
            id: "patient_2".to_string(),
            r#type: NameRowType::Patient,
            // NOK recorded via name plaintext
            next_of_kin_name: Some("Bestie guy".to_string()),
            ..Default::default()
        };

        let name_repo = NameRowRepository::new(&connection);

        name_repo.upsert_one(&next_of_kin_patient_row).unwrap();
        name_repo.upsert_one(&patient_1_row).unwrap();
        name_repo.upsert_one(&patient_2_row).unwrap();

        let result = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new().next_of_kin_name(StringFilter::like("Bestie")),
                None,
            )
            .unwrap();

        assert_eq!(result.len(), 2);
    }

    #[actix_rt::test]
    async fn test_patient_identifier_query() {
        let (_, connection, _, _) = test_db::setup_all(
            "patient_identifier_query",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .name_store_joins()
                .full_master_lists()
                .contexts()
                .programs(),
        )
        .await;

        // add name and name_store_join

        let patient_row = NameRow {
            id: "patient_1".to_string(),
            name: "test_name".to_string(),
            r#type: NameRowType::Patient,
            code: "codePatient".to_string(),
            national_health_number: Some("nhnPatient".to_string()),
            ..Default::default()
        };
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row)
            .unwrap();

        // test identifier OR
        let patient_row_a = NameRow {
            id: "patient_a".to_string(),
            name: "patient_a_name".to_string(),
            r#type: NameRowType::Patient,
            code: "example111".to_string(),
            national_health_number: Some("patient_a_nhn".to_string()),
            ..Default::default()
        };

        let patient_row_b = NameRow {
            id: "patient_b".to_string(),
            name: "patient_b_name".to_string(),
            r#type: NameRowType::Patient,
            code: "patient_b_code".to_string(),
            national_health_number: Some("example222".to_string()),
            ..Default::default()
        };

        let patient_row_c = NameRow {
            id: "patient_c".to_string(),
            name: "example_name".to_string(),
            r#type: NameRowType::Patient,
            code: "code333".to_string(),
            national_health_number: Some("patient_c_nhn".to_string()),
            ..Default::default()
        };
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row_a)
            .unwrap();
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row_b)
            .unwrap();
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row_c)
            .unwrap();

        // Test identifier search
        ProgramEnrolmentRowRepository::new(&connection)
            .upsert_one(&ProgramEnrolmentRow {
                id: util::uuid::uuid(),
                document_name: "doc_name".to_string(),
                patient_id: patient_row.id.clone(),
                document_type: "ProgramType".to_string(),
                program_id: mock_program_a().id,
                enrolment_datetime: Utc::now().naive_utc(),
                program_enrolment_id: Some("program_enrolment_id".to_string()),
                status: Some("Active".to_string()),
                store_id: None,
            })
            .unwrap();

        let repo = PatientRepository::new(&connection);
        let result = repo
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::equal_to("codePatient")),
                None,
            )
            .unwrap();
        assert_eq!(result.first().unwrap().id, patient_row.id);
        let result = repo
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::equal_to("nhnPatient")),
                None,
            )
            .unwrap();
        assert_eq!(result.first().unwrap().id, patient_row.id);
        let result = repo
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::equal_to("program_enrolment_id")),
                None,
            )
            .unwrap();
        assert_eq!(result.first().unwrap().id, patient_row.id);
        let result = repo
            .query_by_filter(
                PatientFilter::new()
                    .code(StringFilter::equal_to("codePatient"))
                    .identifier(StringFilter::equal_to("program_enrolment_id")),
                None,
            )
            .unwrap();
        assert_eq!(result.first().unwrap().id, patient_row.id);
        // no result when having an `AND code is "does not exist"` clause
        let result = repo
            .query_by_filter(
                PatientFilter::new()
                    .code(StringFilter::equal_to("code does not exist"))
                    .identifier(StringFilter::equal_to("program_enrolment_id")),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 0);
        let result = repo
            .query_by_filter(
                PatientFilter::new()
                    .identifier(StringFilter::equal_to("identifier does not exist")),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 0);
        let result = repo
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::like("test_name")),
                None,
            )
            .unwrap();
        assert_eq!(result.first().unwrap().id, patient_row.id);

        // Test identifier OR
        let result = repo
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::like("example")),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 3);
    }

    #[actix_rt::test]
    async fn test_patient_program_enrolment_id_allowed_ctx() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_patient_program_enrolment_id_allowed_ctx",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .name_store_joins()
                .full_master_lists()
                .contexts()
                .programs(),
        )
        .await;

        // add name and name_store_join
        let patient_row = NameRow {
            id: "patient_1".to_string(),
            r#type: NameRowType::Patient,
            code: "codePatient".to_string(),
            national_health_number: Some("nhnPatient".to_string()),
            ..Default::default()
        };
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row)
            .unwrap();

        // Searching by program enrolment id requires correct context access
        ProgramEnrolmentRowRepository::new(&connection)
            .upsert_one(&ProgramEnrolmentRow {
                id: util::uuid::uuid(),
                document_name: "doc_name".to_string(),
                patient_id: patient_row.id.clone(),
                document_type: "ProgramType".to_string(),
                program_id: mock_program_a().id,
                enrolment_datetime: Utc::now().naive_utc(),
                program_enrolment_id: Some("program_enrolment_id".to_string()),
                status: Some("Active".to_string()),
                store_id: None,
            })
            .unwrap();
        let repo = PatientRepository::new(&connection);
        let result = repo
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::equal_to("program_enrolment_id")),
                Some(&["WrongContext".to_string()]),
            )
            .unwrap();
        assert!(result.is_empty());
        let result = repo
            .query_by_filter(
                PatientFilter::new().identifier(StringFilter::equal_to("program_enrolment_id")),
                Some(&[mock_program_a().id]),
            )
            .unwrap();
        assert!(!result.is_empty());
    }

    #[actix_rt::test]
    async fn test_name_date_of_death() {
        let (_, connection, _, _) =
            test_db::setup_all("test_name_date_of_death", MockDataInserts::none()).await;

        let patient_row = NameRow {
            id: "patient_1".to_string(),
            r#type: NameRowType::Patient,
            ..Default::default()
        };
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row)
            .unwrap();

        // Query if patient is still alive if date of death is not set
        let result = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new().date_of_death(DateFilter::after_or_equal_to(
                    NaiveDate::from_ymd_opt(2023, 5, 20).unwrap(),
                )),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 1);

        // Add date of death
        let patient_row = NameRow {
            id: "patient_1".to_string(),
            r#type: NameRowType::Patient,
            date_of_death: Some(NaiveDate::from_ymd_opt(2023, 9, 20).unwrap()),
            ..Default::default()
        };
        NameRowRepository::new(&connection)
            .upsert_one(&patient_row)
            .unwrap();
        // Query if patient is not alive after date_of_death
        let result = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new().date_of_death(DateFilter::after_or_equal_to(
                    NaiveDate::from_ymd_opt(2023, 9, 22).unwrap(),
                )),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 0);
        // Query if patient is still alive before date_of_death
        let result = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new().date_of_death(DateFilter::after_or_equal_to(
                    NaiveDate::from_ymd_opt(2023, 5, 20).unwrap(),
                )),
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 1);
    }

    #[actix_rt::test]
    async fn test_patient_count_up_to() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_patient_count_up_to",
            MockDataInserts::none().names().stores(),
        )
        .await;

        for id in ["count_1", "count_2", "count_3"] {
            NameRowRepository::new(&connection)
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    name: id.to_string(),
                    code: id.to_uppercase(),
                    r#type: NameRowType::Patient,
                    ..Default::default()
                })
                .unwrap();
        }

        let repo = PatientRepository::new(&connection);
        let filter = || Some(PatientFilter::new().code(StringFilter::starts_with("count_")));
        // Stops at the limit
        assert_eq!(repo.count_up_to(filter(), None, 2).unwrap(), 2);
        // Or counts them all when there are fewer
        assert_eq!(repo.count_up_to(filter(), None, 10).unwrap(), 3);
    }

    #[actix_rt::test]
    async fn test_patient_code_or_code_2_filter() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_patient_code_or_code_2_filter",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let patient = |id: &str, code: &str, code_2: Option<&str>| NameRow {
            id: id.to_string(),
            name: id.to_string(),
            code: code.to_string(),
            national_health_number: code_2.map(str::to_string),
            r#type: NameRowType::Patient,
            ..Default::default()
        };
        let rows = [
            patient("by_code", "ABC-001", Some("ZZZ-1")),
            patient("by_code_2", "QQQ-002", Some("abc-777")),
            patient("no_code_2", "abd-003", None),
            patient("neither", "XYZ-004", Some("XYZ-5")),
            NameRow {
                deleted_datetime: Some(Utc::now().naive_utc()),
                ..patient("deleted", "ABC-009", None)
            },
            NameRow {
                r#type: NameRowType::Store,
                ..patient("not_a_patient", "ABC-010", None)
            },
        ];
        for row in &rows {
            NameRowRepository::new(&connection).upsert_one(row).unwrap();
        }

        let repo = PatientRepository::new(&connection);
        let ids = |filter: PatientFilter| -> Vec<String> {
            let mut ids: Vec<String> = repo
                .query_by_filter(filter, None)
                .unwrap()
                .into_iter()
                .map(|patient| patient.id)
                .collect();
            ids.sort();
            ids
        };

        // Start of either code, ignoring case
        assert_eq!(
            ids(PatientFilter::new().code_or_code_2(StringFilter::starts_with("abc"))),
            ["by_code", "by_code_2"]
        );
        assert_eq!(
            ids(PatientFilter::new().code_or_code_2(StringFilter::starts_with("AB"))),
            ["by_code", "by_code_2", "no_code_2"]
        );
        // Only the start
        assert!(
            ids(PatientFilter::new().code_or_code_2(StringFilter::starts_with("777"))).is_empty()
        );
        // Other operators apply to both columns too
        assert_eq!(
            ids(PatientFilter::new().code_or_code_2(StringFilter::equal_to("ZZZ-1"))),
            ["by_code"]
        );
        // ANDs with the other filters
        assert_eq!(
            ids(PatientFilter::new()
                .code_or_code_2(StringFilter::starts_with("abc"))
                .name(StringFilter::equal_to("by_code_2"))),
            ["by_code_2"]
        );
    }

    #[actix_rt::test]
    async fn test_patient_name_word_filter() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_patient_name_word_filter",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let patient = |id: &str, first_name: Option<&str>, last_name: &str| NameRow {
            id: id.to_string(),
            name: id.to_string(),
            code: id.to_uppercase(),
            first_name: first_name.map(str::to_string),
            last_name: Some(last_name.to_string()),
            r#type: NameRowType::Patient,
            ..Default::default()
        };
        let rows = [
            patient("traore", Some("Marie-Hélène"), "Traoré"),
            patient("nguessan", Some("Awa"), "N'Guessan Kouadio"),
            patient("hassan", Some("Ali"), "HASSAN"),
            patient("no_first_name", None, "Traore"),
            patient("dotted", Some("Mary.Ann"), "St.John"),
            NameRow {
                r#type: NameRowType::Store,
                ..patient("not_a_patient", Some("Hélène"), "Traoré")
            },
        ];
        for row in &rows {
            NameRowRepository::new(&connection).upsert_one(row).unwrap();
        }

        let repo = PatientRepository::new(&connection);
        let ids = |filter: PatientFilter| -> Vec<String> {
            let mut ids: Vec<String> = repo
                .query_by_filter(filter, None)
                .unwrap()
                .into_iter()
                .map(|patient| patient.id)
                .collect();
            ids.sort();
            ids
        };
        let last =
            |text: &str| ids(PatientFilter::new().last_name(StringFilter::starts_with(text)));
        let first =
            |text: &str| ids(PatientFilter::new().first_name(StringFilter::starts_with(text)));

        // The start of the name, ignoring case and accents either way
        assert_eq!(last("trao"), ["no_first_name", "traore"]);
        assert_eq!(last("TRAORÉ"), ["no_first_name", "traore"]);
        // The start of a later word, after a space, hyphen or apostrophe
        assert_eq!(last("kouad"), ["nguessan"]);
        assert_eq!(last("guess"), ["nguessan"]);
        // Words split at any punctuation, the same on both databases, so the
        // whole name typed as stored still finds it
        assert_eq!(last("st.john"), ["dotted"]);
        assert_eq!(last("john"), ["dotted"]);
        assert_eq!(first("Mary.Ann"), ["dotted"]);
        assert_eq!(first("ann"), ["dotted"]);
        assert_eq!(first("helene"), ["traore"]);
        // Every typed word, in any order
        assert_eq!(last("kouadio n"), ["nguessan"]);
        assert!(last("kouadio t").is_empty());
        // Not the middle of a word
        assert!(last("san").is_empty());
        assert!(last("an").is_empty());
        // Text with no words doesn't filter
        assert_eq!(first("-"), ids(PatientFilter::new()));
        // ANDs with the other name and the filter's other operators
        assert_eq!(
            ids(PatientFilter::new()
                .last_name(StringFilter::starts_with("trao"))
                .first_name(StringFilter::starts_with("mar"))),
            ["traore"]
        );
        assert_eq!(
            ids(PatientFilter::new().last_name(StringFilter {
                starts_with: Some("trao".to_string()),
                equal_to: Some("Traore".to_string()),
                ..Default::default()
            })),
            ["no_first_name"]
        );
        // Other operators match the whole name, as before
        assert_eq!(
            ids(PatientFilter::new().last_name(StringFilter::like("ssan"))),
            ["hassan", "nguessan"]
        );
    }

    #[actix_rt::test]
    async fn test_patient_query_capped() {
        use crate::{Pagination, PatientSort, PatientSortField};

        let (_, connection, _, _) = test_db::setup_all(
            "test_patient_query_capped",
            MockDataInserts::none().names().stores(),
        )
        .await;

        for i in 0..5 {
            NameRowRepository::new(&connection)
                .upsert_one(&NameRow {
                    id: format!("capped_{i}"),
                    name: format!("Capped, {i}"),
                    code: format!("CAP-{i}"),
                    last_name: Some("Capped".to_string()),
                    r#type: NameRowType::Patient,
                    ..Default::default()
                })
                .unwrap();
        }

        let repo = PatientRepository::new(&connection);
        let page = |offset: u32, cap: u32| -> Vec<String> {
            repo.query_capped(
                Pagination { limit: 2, offset },
                Some(PatientFilter::new().last_name(StringFilter::starts_with("capped"))),
                Some(PatientSort {
                    key: PatientSortField::Name,
                    desc: None,
                }),
                None,
                cap,
            )
            .unwrap()
            .into_iter()
            .map(|patient| patient.id)
            .collect()
        };

        // Under the cap, the same pages as an uncapped query
        assert_eq!(page(0, 10), ["capped_0", "capped_1"]);
        assert_eq!(page(4, 10), ["capped_4"]);
        // Over it, the pages sort and cover only that many
        let capped: Vec<String> = [page(0, 3), page(2, 3)].concat();
        assert_eq!(capped.len(), 3);
        let mut sorted = capped.clone();
        sorted.sort();
        assert_eq!(capped, sorted);
        assert!(page(4, 3).is_empty());
    }

    #[actix_rt::test]
    async fn test_patient_visible_in_store() {
        use crate::{NameStoreJoinRepository, NameStoreJoinRow};

        let (_, connection, _, _) = test_db::setup_all(
            "test_patient_visible_in_store",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let names = NameRowRepository::new(&connection);
        for id in ["joined", "hidden", "elsewhere", "unjoined"] {
            names
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    name: id.to_string(),
                    last_name: Some("Visible".to_string()),
                    r#type: NameRowType::Patient,
                    ..Default::default()
                })
                .unwrap();
        }
        let joins = NameStoreJoinRepository::new(&connection);
        for (name_id, store_id, visible) in [
            ("joined", "store_a", true),
            ("hidden", "store_a", false),
            ("elsewhere", "store_b", true),
        ] {
            joins
                .upsert_one(&NameStoreJoinRow {
                    id: format!("{name_id}_{store_id}"),
                    name_id: name_id.to_string(),
                    store_id: store_id.to_string(),
                    visible,
                    ..Default::default()
                })
                .unwrap();
        }

        let repo = PatientRepository::new(&connection);
        let ids = |filter: PatientFilter| -> Vec<String> {
            let mut ids: Vec<String> = repo
                .query_by_filter(filter, None)
                .unwrap()
                .into_iter()
                .map(|patient| patient.id)
                .collect();
            ids.sort();
            ids
        };
        let visible = |store_id: &str, is_visible: bool| {
            PatientFilter::new()
                .last_name(StringFilter::starts_with("visible"))
                .visible_in_store(store_id, is_visible)
        };

        // OMS-REG-DIS-01.83: only a visible join to this store makes a patient visible here
        assert_eq!(ids(visible("store_a", true)), ["joined"]);
        assert_eq!(ids(visible("store_b", true)), ["elsewhere"]);
        // The rest are this store's other facilities' patients
        assert_eq!(
            ids(visible("store_a", false)),
            ["elsewhere", "hidden", "unjoined"]
        );
        assert_eq!(
            repo.count_up_to(Some(visible("store_a", true)), None, 10)
                .unwrap(),
            1
        );
        // Unset, every patient is returned, as a lookup by id needs
        assert_eq!(
            ids(PatientFilter::new().last_name(StringFilter::starts_with("visible"))),
            ["elsewhere", "hidden", "joined", "unjoined"]
        );
    }
}
