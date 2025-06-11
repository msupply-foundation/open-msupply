use repository::ClinicianRowRepositoryTrait;

use super::{InsertClinician, InsertClinicianError};

pub fn validate(
    clinician_row_repo: &impl ClinicianRowRepositoryTrait,
    input: &InsertClinician,
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

    let clinician = clinician_row_repo.find_one_by_id(&input.id)?;

    if clinician.is_some() {
        return Err(InsertClinicianError::ClinicianAlreadyExists);
    }

    // tODO: Validate store_id is valid

    Ok(())
}

#[cfg(test)]
mod test {
    use repository::{ClinicianRow, MockClinicianRowRepository};

    use crate::clinician::insert::{validate::validate, InsertClinician, InsertClinicianError};

    #[test]
    fn code_cannot_be_empty() {
        let mock_repo = MockClinicianRowRepository::default();
        let empty_code = InsertClinician {
            code: "".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(&mock_repo, &empty_code),
            Err(InsertClinicianError::CodeCannotBeEmpty)
        );
    }

    #[test]
    fn initials_cannot_be_empty() {
        let mock_repo = MockClinicianRowRepository::default();
        let empty_initials = InsertClinician {
            code: "test code".to_string(),
            initials: "".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(&mock_repo, &empty_initials),
            Err(InsertClinicianError::InitialsCannotBeEmpty)
        );
    }

    #[test]
    fn last_name_cannot_be_empty() {
        let mock_repo = MockClinicianRowRepository::default();
        let empty_last_name = InsertClinician {
            code: "test_code".to_string(),
            initials: "TC".to_string(),
            last_name: "".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(&mock_repo, &empty_last_name),
            Err(InsertClinicianError::LastNameCannotBeEmpty)
        );
    }

    #[test]
    fn clinician_does_already_exists() {
        let mock_repo = MockClinicianRowRepository {
            find_one_by_id_result: Some(ClinicianRow::default()), // Simulate existing clinician
        };

        let existing_clinician = InsertClinician {
            id: "existing_id".to_string(),
            code: "TC".to_string(),
            initials: "TC".to_string(),
            last_name: "Clinician".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(&mock_repo, &existing_clinician),
            Err(InsertClinicianError::ClinicianAlreadyExists)
        );
    }

    #[test]
    fn valid_clinician() {
        let mock_repo = MockClinicianRowRepository {
            find_one_by_id_result: None, // Simulate no existing clinician
        };

        let valid_clinician = InsertClinician {
            id: "valid_id".to_string(),
            code: "TC".to_string(),
            initials: "TC".to_string(),
            last_name: "Clinician".to_string(),
            first_name: Some("First".to_string()),
            gender: None,
        };
        assert_eq!(validate(&mock_repo, &valid_clinician), Ok(()));
    }
}
