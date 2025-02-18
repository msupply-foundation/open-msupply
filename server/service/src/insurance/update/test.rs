#[cfg(test)]
mod update {
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_name_a, MockDataInserts},
        name_insurance_join_row::InsurancePolicyType,
        test_db::setup_all,
        InsuranceProviderRow, InsuranceProviderRowRepository,
    };

    use crate::{
        insurance::{
            insert::InsertInsurance,
            update::{UpdateInsurance, UpdateInsuranceError},
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_insurance_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_insurance_errors", MockDataInserts::none().names()).await;

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
        service
            .insert_insurance(
                &context,
                InsertInsurance {
                    id: "insurance_a".to_string(),
                    name_link_id: mock_name_a().id.clone(),
                    insurance_provider_id: "insurance_provider_id".to_string(),
                    policy_number_family: "123".to_string(),
                    policy_number_person: "ABC".to_string(),
                    policy_type: InsurancePolicyType::Personal,
                    discount_percentage: 10.0,
                    expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
                    is_active: true,
                },
            )
            .unwrap();

        // Update the insurance record
        let input = UpdateInsurance {
            id: "insurance_a".to_string(),
            insurance_provider_id: Some("insurance_provider_id".to_string()),
            policy_type: Some(InsurancePolicyType::Personal),
            discount_percentage: Some(10.0),
            expiry_date: Some(NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date")),
            is_active: Some(true),
        };

        let result = service.update_insurance(&context, input.clone()).unwrap();
        assert_eq!(result.id, input.id);

        // Attempt to update the insurance record with an id that does not exist
        // InsuranceDoesNotExist
        assert_eq!(
            service.update_insurance(
                &context,
                UpdateInsurance {
                    id: "insurance_b".to_string(),
                    ..Default::default()
                },
            ),
            Err(UpdateInsuranceError::InsuranceDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn update_insurance_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_insurance_success", MockDataInserts::none().names()).await;

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
        service
            .insert_insurance(
                &context,
                InsertInsurance {
                    id: "insurance_a".to_string(),
                    name_link_id: mock_name_a().id.clone(),
                    insurance_provider_id: "insurance_provider_id".to_string(),
                    policy_number_family: "123".to_string(),
                    policy_number_person: "ABC".to_string(),
                    policy_type: InsurancePolicyType::Personal,
                    discount_percentage: 10.0,
                    expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
                    is_active: true,
                },
            )
            .unwrap();

        // Update the insurance record
        let input = UpdateInsurance {
            id: "insurance_a".to_string(),
            insurance_provider_id: Some("insurance_provider_id".to_string()),
            policy_type: Some(InsurancePolicyType::Business),
            discount_percentage: Some(15.0),
            expiry_date: Some(NaiveDate::from_ymd_opt(2026, 12, 31).expect("Invalid date")),
            is_active: Some(false),
        };

        // Check that the insurance record was updated
        let new_insurance = service.update_insurance(&context, input.clone()).unwrap();

        assert_eq!(new_insurance.id, input.id);
        assert_eq!(new_insurance.policy_type, input.policy_type.unwrap());
        assert_eq!(
            new_insurance.discount_percentage,
            input.discount_percentage.unwrap()
        );
        assert_eq!(new_insurance.expiry_date, input.expiry_date.unwrap());
        assert_eq!(new_insurance.is_active, input.is_active.unwrap());
    }
}
