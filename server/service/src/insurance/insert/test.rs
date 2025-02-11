#[cfg(test)]
mod insert {
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_name_a, MockDataInserts},
        name_insurance_join_row::InsurancePolicyType,
        test_db::setup_all,
        InsuranceProviderRowRepository,
    };

    use crate::{
        insurance::insert::{InsertInsurance, InsertInsuranceError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_insurance_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_insurances_errors", MockDataInserts::none().names()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("insurance_provider_a".to_string(), "".to_string())
            .unwrap();
        let service = service_provider.insurance_service;

        assert_eq!(
            service.insert_insurance(
                &context,
                InsertInsurance {
                    id: "insurance_a".to_string(),
                    name_link_id: mock_name_a().id.clone(),
                    insurance_provider_id: "insurance_provider_a".to_string(),
                    policy_number_person: Some("policy_number_person_a".to_string()),
                    policy_number: "policy_number_a".to_string(),
                    policy_type: InsurancePolicyType::Personal,
                    discount_percentage: 10.0,
                    expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
                    is_active: true,
                    provider_name: "Insurance Provider 1".to_string(),
                }
            ),
            Err(InsertInsuranceError::InsuranceAlreadyExists)
        );
    }

    #[actix_rt::test]
    async fn insert_insurance_success() {
        let (_, _, connection_manager, _) =
            setup_all("insert_insurances_success", MockDataInserts::none().names()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.insurance_service;

        let input = InsertInsurance {
            id: "insurance_a".to_string(),
            name_link_id: mock_name_a().id.clone(),
            insurance_provider_id: "insurance_provider_a".to_string(),
            policy_number_person: Some("policy_number_person_a".to_string()),
            policy_number: "policy_number_a".to_string(),
            policy_type: InsurancePolicyType::Personal,
            discount_percentage: 10.0,
            expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
            is_active: true,
            provider_name: "Insurance Provider 1".to_string(),
        };

        let result = service.insert_insurance(&context, input.clone()).unwrap();

        assert_eq!(result.id, input.id);

        // Check that insurance provider got created
        let repo = InsuranceProviderRowRepository::new(&context.connection);
        let insurance_provider = repo
            .find_one_by_id(&input.insurance_provider_id)
            .unwrap()
            .unwrap();

        assert_eq!(insurance_provider.id, input.insurance_provider_id);
    }
}
