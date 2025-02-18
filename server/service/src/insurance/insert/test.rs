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
        insurance::insert::{
            generate::compose_policy_number, InsertInsurance, InsertInsuranceError,
        },
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
            policy_number_person: "ABC".to_string(),
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
            policy_number_person: "ABC".to_string(),
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

    // Table driven test case for compose_policy_number
    struct TestCase {
        family: Option<String>,
        person: Option<String>,
        expected: String,
    }

    #[test]
    fn test_compose_policy_number() {
        let scenarios = vec![
            TestCase {
                family: Some("fam".to_string()),
                person: Some("pers".to_string()),
                expected: "fam-pers".to_string(),
            },
            TestCase {
                family: Some("".to_string()),
                person: Some("pers".to_string()),
                expected: "pers".to_string(),
            },
            TestCase {
                family: Some("fam".to_string()),
                person: Some("".to_string()),
                expected: "fam".to_string(),
            },
            TestCase {
                family: Some("".to_string()),
                person: Some("".to_string()),
                expected: "".to_string(),
            },
            TestCase {
                family: Some("fam".to_string()),
                person: None,
                expected: "fam".to_string(),
            },
            TestCase {
                family: None,
                person: Some("pers".to_string()),
                expected: "pers".to_string(),
            },
            TestCase {
                family: None,
                person: None,
                expected: "".to_string(),
            },
        ];

        for scenario in scenarios {
            assert_eq!(
                scenario.expected,
                compose_policy_number(scenario.family.clone(), scenario.person.clone())
            );
        }
    }
}
