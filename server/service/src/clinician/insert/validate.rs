use repository::{ClinicianRowRepositoryTrait, StoreRowRepositoryTrait};

use super::{InsertClinician, InsertClinicianError};

pub struct Repositories<'a> {
    pub clinician_row: Box<dyn ClinicianRowRepositoryTrait<'a> + 'a>,
    pub store_row: Box<dyn StoreRowRepositoryTrait<'a> + 'a>,
}

pub fn validate(
    repos: Repositories<'_>,
    input: &InsertClinician,
    store_id: &str,
) -> Result<(), InsertClinicianError> {
    if input.code.is_empty() {
        return Err(InsertClinicianError::CodeCannotBeEmpty);
    }
    if input.initials.is_empty() {
        return Err(InsertClinicianError::InitialsCannotBeEmpty);
    }
    if input.last_name.is_empty() {
        return Err(InsertClinicianError::LastNameCannotBeEmpty);
    }

    let clinician = repos.clinician_row.find_one_by_id(&input.id)?;

    if clinician.is_some() {
        return Err(InsertClinicianError::ClinicianAlreadyExists);
    }

    let store = repos.store_row.find_one_by_id(store_id)?;

    if store.is_none() {
        return Err(InsertClinicianError::InvalidStore);
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use repository::{ClinicianRow, MockClinicianRowRepository, MockStoreRowRepository, StoreRow};

    use crate::clinician::insert::{
        validate::{validate, Repositories},
        InsertClinician, InsertClinicianError,
    };

    impl Repositories<'static> {
        fn test_defaults() -> Self {
            Repositories {
                clinician_row: MockClinicianRowRepository::boxed(),
                store_row: MockStoreRowRepository::boxed(),
            }
        }
    }

    #[test]
    fn code_cannot_be_empty() {
        let mock_repos = Repositories::test_defaults();
        let empty_code = InsertClinician {
            code: "".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(mock_repos, &empty_code, "store_id"),
            Err(InsertClinicianError::CodeCannotBeEmpty)
        );
    }

    #[test]
    fn initials_cannot_be_empty() {
        let mock_repos = Repositories::test_defaults();
        let empty_initials = InsertClinician {
            code: "test code".to_string(),
            initials: "".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(mock_repos, &empty_initials, "store_id"),
            Err(InsertClinicianError::InitialsCannotBeEmpty)
        );
    }

    #[test]
    fn last_name_cannot_be_empty() {
        let mock_repos = Repositories::test_defaults();
        let empty_last_name = InsertClinician {
            code: "test_code".to_string(),
            initials: "TC".to_string(),
            last_name: "".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(mock_repos, &empty_last_name, "store_id"),
            Err(InsertClinicianError::LastNameCannotBeEmpty)
        );
    }

    #[test]
    fn clinician_does_already_exist() {
        let mock_repos = Repositories {
            clinician_row: Box::new(MockClinicianRowRepository {
                find_one_by_id_result: Some(ClinicianRow::default()), // Simulate existing clinician,
            }),
            ..Repositories::test_defaults()
        };

        let existing_clinician = InsertClinician {
            id: "existing_id".to_string(),
            code: "TC".to_string(),
            initials: "TC".to_string(),
            last_name: "Clinician".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(mock_repos, &existing_clinician, "store_id"),
            Err(InsertClinicianError::ClinicianAlreadyExists)
        );
    }

    #[test]
    fn store_is_valid() {
        let mock_repos = Repositories {
            store_row: Box::new(MockStoreRowRepository {
                find_one_by_id_result: None, // Mock no matching store found,
            }),
            ..Repositories::test_defaults()
        };

        let input = InsertClinician {
            id: "new_id".to_string(),
            code: "TC".to_string(),
            initials: "TC".to_string(),
            last_name: "Clinician".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(mock_repos, &input, "store_id"),
            Err(InsertClinicianError::InvalidStore)
        )
    }

    #[test]
    fn valid_clinician() {
        let mock_repos = Repositories {
            store_row: Box::new(MockStoreRowRepository {
                find_one_by_id_result: Some(StoreRow::default()), // Mock store found,
            }),
            ..Repositories::test_defaults()
        };

        let valid_clinician = InsertClinician {
            id: "valid_id".to_string(),
            code: "TC".to_string(),
            initials: "TC".to_string(),
            last_name: "Clinician".to_string(),
            first_name: Some("First".to_string()),
            gender: None,
            mobile: None,
        };
        assert_eq!(validate(mock_repos, &valid_clinician, "store_id"), Ok(()));
    }
}
