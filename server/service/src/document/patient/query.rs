use repository::{
    DateFilter, EqualFilter, Gender, NameFilter, NameRepository, NameRow, NameSort, NameSortField,
    NameType, PaginationOption, RepositoryError, SimpleStringFilter, Sort,
};

use crate::{
    get_default_pagination_unlimited, i64_to_u32, service_provider::ServiceContext, ListResult,
};

#[derive(Clone, Default)]
pub struct PatientFilter {
    pub id: Option<EqualFilter<String>>,
    pub code: Option<SimpleStringFilter>,
    pub code_2: Option<SimpleStringFilter>,
    pub first_name: Option<SimpleStringFilter>,
    pub last_name: Option<SimpleStringFilter>,
    pub gender: Option<EqualFilter<Gender>>,
    pub date_of_birth: Option<DateFilter>,
    pub phone: Option<SimpleStringFilter>,
    pub address1: Option<SimpleStringFilter>,
    pub address2: Option<SimpleStringFilter>,
    pub country: Option<SimpleStringFilter>,
    pub email: Option<SimpleStringFilter>,
}

#[derive(PartialEq, Debug)]
pub enum PatientSortField {
    Name,
    Code,
    FirstName,
    LastName,
    Gender,
    DateOfBirth,
    Phone,
    Address1,
    Address2,
    Country,
    Email,
}

pub type PatientSort = Sort<PatientSortField>;

pub struct Patient {
    pub name_row: NameRow,
}

pub fn get_patients(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<PatientFilter>,
    sort: Option<PatientSort>,
) -> Result<ListResult<Patient>, RepositoryError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = NameRepository::new(&ctx.connection);

    let filter = filter
        .map(|f| f.to_name_filter())
        .or(Some(NameFilter::new()))
        // always filter by patient:
        .map(|f| f.r#type(NameType::Patient));
    let sort = sort.map(|v| NameSort {
        desc: v.desc,
        key: match v.key {
            PatientSortField::Name => NameSortField::Name,
            PatientSortField::Code => NameSortField::Code,
            PatientSortField::FirstName => NameSortField::FirstName,
            PatientSortField::LastName => NameSortField::LastName,
            PatientSortField::Gender => NameSortField::Gender,
            PatientSortField::DateOfBirth => NameSortField::DateOfBirth,
            PatientSortField::Phone => NameSortField::Phone,
            PatientSortField::Address1 => NameSortField::Address1,
            PatientSortField::Address2 => NameSortField::Address2,
            PatientSortField::Country => NameSortField::Country,
            PatientSortField::Email => NameSortField::Email,
        },
    });
    let rows = repository
        .query(store_id, pagination, filter.clone(), sort)?
        .into_iter()
        .map(|v| Patient {
            name_row: v.name_row,
        })
        .collect();

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(store_id, filter)?),
    })
}

impl PatientFilter {
    pub fn to_name_filter(self) -> NameFilter {
        let PatientFilter {
            id,
            code,
            code_2,
            first_name,
            last_name,
            gender,
            date_of_birth,
            phone,
            address1,
            address2,
            country,
            email,
        } = self;

        NameFilter {
            id: id.map(EqualFilter::from),
            name: None,
            code,
            national_health_number: code_2,
            is_customer: None,
            is_supplier: None,
            is_store: None,
            store_code: None,
            is_visible: None,
            is_system_name: None,
            r#type: None,
            first_name,
            last_name,
            gender,
            date_of_birth,
            phone,
            address1,
            address2,
            country,
            email,
        }
    }
}

impl PatientFilter {
    pub fn new() -> PatientFilter {
        PatientFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn code(mut self, filter: SimpleStringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn code_2(mut self, filter: SimpleStringFilter) -> Self {
        self.code_2 = Some(filter);
        self
    }

    pub fn first_name(mut self, filter: SimpleStringFilter) -> Self {
        self.first_name = Some(filter);
        self
    }

    pub fn last_name(mut self, filter: SimpleStringFilter) -> Self {
        self.last_name = Some(filter);
        self
    }
    pub fn gender(mut self, filter: EqualFilter<Gender>) -> Self {
        self.gender = Some(filter);
        self
    }
    pub fn date_of_birth(mut self, filter: DateFilter) -> Self {
        self.date_of_birth = Some(filter);
        self
    }
    pub fn phone(mut self, filter: SimpleStringFilter) -> Self {
        self.phone = Some(filter);
        self
    }
    pub fn address1(mut self, filter: SimpleStringFilter) -> Self {
        self.address1 = Some(filter);
        self
    }
    pub fn address2(mut self, filter: SimpleStringFilter) -> Self {
        self.address2 = Some(filter);
        self
    }
    pub fn country(mut self, filter: SimpleStringFilter) -> Self {
        self.country = Some(filter);
        self
    }
    pub fn email(mut self, filter: SimpleStringFilter) -> Self {
        self.email = Some(filter);
        self
    }
}
