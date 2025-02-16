#[cfg(test)]
mod insert {
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_name_a, MockDataInserts},
        name_insurance_join_row::InsurancePolicyType,
        test_db::setup_all,
        InsuranceProviderRow, InsuranceProviderRowRepository,
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
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.insurance_service;

        // Insert the insurance provider record
        let insurance_provider_a = InsuranceProviderRow {
            id: "insurance_provider_id".to_string(),
            provider_name: "insurance_provider_a".to_string(),
            comment: Some("Test".to_string()),
            is_active: true,
            prescription_validity_days: Some(30),
        };

        InsuranceProviderRowRepository::new(&context.connection)
            .upsert_one(&insurance_provider_a)
            .unwrap();

        // Insert the insurance record
        let input = InsertInsurance {
            id: "insurance_a".to_string(),
            name_link_id: mock_name_a().id.clone(),
            insurance_provider_id: "insurance_provider_id".to_string(),
            policy_number_family: "123".to_string(),
            policy_number_personal: "ABC".to_string(),
            policy_type: InsurancePolicyType::Personal,
            discount_percentage: 10.0,
            expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
            is_active: true,
        };

        let result = service.insert_insurance(&context, input.clone()).unwrap();
        assert_eq!(result.id, input.id);

        // Attempt to insert the same insurance again
        // InsuranceAlreadyExists
        assert_eq!(
            service.insert_insurance(&context, input.clone()),
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

        let insurance_provider_a = InsuranceProviderRow {
            id: "insurance_provider_id".to_string(),
            provider_name: "insurance_provider_a".to_string(),
            comment: Some("Test".to_string()),
            is_active: true,
            prescription_validity_days: Some(30),
        };

        InsuranceProviderRowRepository::new(&context.connection)
            .upsert_one(&insurance_provider_a)
            .unwrap();

        let input = InsertInsurance {
            id: "insurance_a".to_string(),
            name_link_id: mock_name_a().id.clone(),
            insurance_provider_id: "insurance_provider_id".to_string(),
            policy_number_family: "123".to_string(),
            policy_number_personal: "ABC".to_string(),
            policy_type: InsurancePolicyType::Personal,
            discount_percentage: 10.0,
            expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
            is_active: true,
        };

        let result = service.insert_insurance(&context, input.clone()).unwrap();

        assert_eq!(result.id, input.id);

        // check policy number
        assert_eq!(result.policy_number, "123-ABC");
    }
}
