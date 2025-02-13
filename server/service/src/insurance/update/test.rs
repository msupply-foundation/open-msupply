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

        let insurance_provider_repository =
            InsuranceProviderRowRepository::new(&context.connection);
        insurance_provider_repository
            .upsert_one(&insurance_provider_a)
            .unwrap();

        // Insert the insurance record
        service
            .insert_insurance(
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
                },
            )
            .unwrap();

        // Update the insurance record
        let input = UpdateInsurance {
            id: "insurance_a".to_string(),
            policy_number: Some("policy_number_a".to_string()),
            policy_type: Some(InsurancePolicyType::Personal),
            discount_percentage: Some(10.0),
            expiry_date: Some(NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date")),
            is_active: Some(true),
            provider_name: Some("Insurance Provider 1".to_string()),
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

        let insurance_provider_repository =
            InsuranceProviderRowRepository::new(&context.connection);
        insurance_provider_repository
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
                    policy_number_person: Some("policy_number_person_a".to_string()),
                    policy_number: "policy_number_a".to_string(),
                    policy_type: InsurancePolicyType::Personal,
                    discount_percentage: 10.0,
                    expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
                    is_active: true,
                    provider_name: "Insurance Provider 1".to_string(),
                },
            )
            .unwrap();

        // Update the insurance record
        let input = UpdateInsurance {
            id: "insurance_a".to_string(),
            policy_number: Some("policy_number_updated".to_string()),
            policy_type: Some(InsurancePolicyType::Business),
            discount_percentage: Some(15.0),
            expiry_date: Some(NaiveDate::from_ymd_opt(2026, 12, 31).expect("Invalid date")),
            is_active: Some(false),
            provider_name: Some("Insurance Provider 1".to_string()),
        };

        // Check that the insurance record was updated
        let new_insurance = service.update_insurance(&context, input.clone()).unwrap();

        assert_eq!(new_insurance.id, input.id);
        assert_eq!(
            new_insurance.policy_number,
            input.policy_number.clone().unwrap()
        );
        assert_eq!(new_insurance.policy_type, input.policy_type.unwrap());
        assert_eq!(
            new_insurance.discount_percentage,
            input.discount_percentage.unwrap()
        );
        assert_eq!(new_insurance.expiry_date, input.expiry_date.unwrap());
        assert_eq!(new_insurance.is_active, input.is_active.unwrap());

        // Check that the insurance provider record was updated
        let insurance_provider_row = insurance_provider_repository
            .find_one_by_id(&new_insurance.insurance_provider_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            insurance_provider_row.provider_name,
            input.provider_name.unwrap()
        );
        // expiry date is 2026-12-31 -> 686 days
        assert_eq!(insurance_provider_row.prescription_validity_days, Some(686));
        assert_eq!(insurance_provider_row.is_active, input.is_active.unwrap());
    }
}
