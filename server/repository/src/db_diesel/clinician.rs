use super::{
    clinician_link_row::clinician_link, clinician_row::clinician,
    clinician_store_join_row::clinician_store_join, DBType, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    ClinicianRow, EqualFilter, Pagination, Sort, StringFilter,
};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default)]
pub struct ClinicianFilter {
    pub id: Option<EqualFilter<String>>,
    pub code: Option<StringFilter>,
    pub first_name: Option<StringFilter>,
    pub last_name: Option<StringFilter>,
    pub initials: Option<StringFilter>,
    pub address1: Option<StringFilter>,
    pub address2: Option<StringFilter>,
    pub phone: Option<StringFilter>,
    pub mobile: Option<StringFilter>,
    pub email: Option<StringFilter>,
    pub is_active: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum ClinicianSortField {
    Code,
    FirstName,
    LastName,
    Initials,
    Address1,
    Address2,
    Phone,
    Mobile,
    Email,
}

pub type ClinicianSort = Sort<ClinicianSortField>;

pub type Clinician = ClinicianRow;

pub struct ClinicianRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ClinicianRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ClinicianRepository { connection }
    }

    pub fn count(
        &self,
        store_id: &str,
        filter: Option<ClinicianFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(store_id.to_string(), filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        store_id: &str,
        filter: ClinicianFilter,
    ) -> Result<Vec<Clinician>, RepositoryError> {
        self.query(store_id, Pagination::new(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        store_id: &str,
        filter: ClinicianFilter,
    ) -> Result<Option<Clinician>, RepositoryError> {
        Ok(self.query_by_filter(store_id, filter)?.pop())
    }

    pub fn query(
        &self,
        store_id: &str,
        pagination: Pagination,
        filter: Option<ClinicianFilter>,
        sort: Option<ClinicianSort>,
    ) -> Result<Vec<Clinician>, RepositoryError> {
        let mut query = create_filtered_query(store_id.to_string(), filter);

        if let Some(sort) = sort {
            match sort.key {
                ClinicianSortField::Code => apply_sort_no_case!(query, sort, clinician::code),
                ClinicianSortField::FirstName => {
                    apply_sort_no_case!(query, sort, clinician::first_name)
                }
                ClinicianSortField::LastName => {
                    apply_sort_no_case!(query, sort, clinician::last_name)
                }
                ClinicianSortField::Initials => {
                    apply_sort_no_case!(query, sort, clinician::initials)
                }

                ClinicianSortField::Address1 => {
                    apply_sort_no_case!(query, sort, clinician::address1)
                }
                ClinicianSortField::Address2 => {
                    apply_sort_no_case!(query, sort, clinician::address2)
                }
                ClinicianSortField::Phone => apply_sort_no_case!(query, sort, clinician::phone),
                ClinicianSortField::Mobile => {
                    apply_sort_no_case!(query, sort, clinician::mobile)
                }
                ClinicianSortField::Email => apply_sort_no_case!(query, sort, clinician::email),
            }
        } else {
            query = query.order(clinician::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<Clinician>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedClinicianQuery = IntoBoxed<'static, clinician::table, DBType>;

fn create_filtered_query(store_id: String, filter: Option<ClinicianFilter>) -> BoxedClinicianQuery {
    let mut query = clinician::table.into_boxed();

    if let Some(f) = filter {
        let ClinicianFilter {
            id,
            code,
            first_name,
            last_name,
            initials,
            address1,
            address2,
            phone,
            mobile,
            email,
            is_active,
        } = f;

        apply_equal_filter!(query, id, clinician::id);
        apply_string_filter!(query, code, clinician::code);
        apply_string_filter!(query, first_name, clinician::first_name);
        apply_string_filter!(query, last_name, clinician::last_name);
        apply_string_filter!(query, initials, clinician::initials);
        apply_string_filter!(query, address1, clinician::address1);
        apply_string_filter!(query, address2, clinician::address2);
        apply_string_filter!(query, phone, clinician::phone);
        apply_string_filter!(query, mobile, clinician::mobile);
        apply_string_filter!(query, email, clinician::email);

        if let Some(is_active) = is_active {
            query = query.filter(clinician::is_active.eq(is_active))
        }
    };

    // Restrict results to clinicians belonging to the store as specified in the
    let sub_query = clinician_store_join::table
        .inner_join(clinician_link::table)
        .select(clinician_link::clinician_id)
        .filter(clinician_store_join::store_id.eq(store_id.clone()));

    query = query.filter(clinician::id.eq_any(sub_query));

    query
}

impl ClinicianFilter {
    pub fn new() -> ClinicianFilter {
        ClinicianFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
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

    pub fn initials(mut self, value: StringFilter) -> Self {
        self.initials = Some(value);
        self
    }

    pub fn address1(mut self, value: StringFilter) -> Self {
        self.address1 = Some(value);
        self
    }

    pub fn address2(mut self, value: StringFilter) -> Self {
        self.address2 = Some(value);
        self
    }

    pub fn phone(mut self, value: StringFilter) -> Self {
        self.phone = Some(value);
        self
    }

    pub fn mobile(mut self, value: StringFilter) -> Self {
        self.mobile = Some(value);
        self
    }

    pub fn email(mut self, filter: StringFilter) -> Self {
        self.email = Some(filter);
        self
    }

    pub fn is_active(mut self, filter: bool) -> Self {
        self.is_active = Some(filter);
        self
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        mock::{mock_store_a, MockDataInserts},
        test_db, ClinicianFilter, ClinicianRepository, ClinicianRow, ClinicianRowRepository,
        ClinicianStoreJoinRow, ClinicianStoreJoinRowRepository, StringFilter,
    };
    use util::inline_init;

    #[actix_rt::test]
    async fn test_clinician_repository() {
        // Prepare
        let (_, storage_connection, _, _) = test_db::setup_all(
            "test_clinician_repository",
            MockDataInserts::none().names().stores(),
        )
        .await;

        ClinicianRowRepository::new(&storage_connection)
            .upsert_one(&inline_init(|r: &mut ClinicianRow| {
                r.id = "clinician_store_a".to_string();
                r.first_name = Some("First".to_string());
            }))
            .unwrap();
        ClinicianRowRepository::new(&storage_connection)
            .upsert_one(&inline_init(|r: &mut ClinicianRow| {
                r.id = "clinician_store_b".to_string();
                r.first_name = Some("First".to_string());
            }))
            .unwrap();

        // no store join no results:
        let result = ClinicianRepository::new(&storage_connection)
            .query_by_filter(
                &mock_store_a().id,
                ClinicianFilter::new().first_name(StringFilter::equal_to("First")),
            )
            .unwrap();
        assert!(result.is_empty());

        // add clinician store join to get query results:
        ClinicianStoreJoinRowRepository::new(&storage_connection)
            .upsert_one(&ClinicianStoreJoinRow {
                id: "JoinId1".to_string(),
                store_id: mock_store_a().id,
                clinician_link_id: "clinician_store_a".to_string(),
            })
            .unwrap();

        let result = ClinicianRepository::new(&storage_connection)
            .query_by_filter(
                &mock_store_a().id,
                ClinicianFilter::new().first_name(StringFilter::equal_to("First")),
            )
            .unwrap();
        assert_eq!(result[0].id, "clinician_store_a");
    }
}
