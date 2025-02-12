#[cfg(test)]
mod query {
    use crate::service_provider::ServiceProvider;
    use chrono::NaiveDate;
    use repository::{
        mock::MockDataInserts,
        name_insurance_join_row::{
            InsurancePolicyType, NameInsuranceJoinRow, NameInsuranceJoinRowRepository,
        },
        test_db::setup_all,
        InsuranceProviderRow, InsuranceProviderRowRepository, NameLinkRow, NameLinkRowRepository,
    };

    #[actix_rt::test]
    async fn get_insurances() {
        let (_, connection, connection_manager, _) =
            setup_all("test_get_insurances", MockDataInserts::none().names()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.insurance_service;

        // Create a Name Link entry
        let name_link_a = NameLinkRow {
            id: "name_a".to_string(),
            name_id: "name_a".to_string(),
        };
        let name_link_repo = NameLinkRowRepository::new(&connection);
        name_link_repo.upsert_one(&name_link_a).unwrap();

        // Create insurance provider entries
        let insurance_provider_a = InsuranceProviderRow {
            id: "insurance_provider_id".to_string(),
            provider_name: "insurance_provider_a".to_string(),
            comment: Some("Test".to_string()),
            is_active: true,
            prescription_validity_days: Some(30),
        };

        let insurance_provider_b = InsuranceProviderRow {
            id: "insurance_provider_id".to_string(),
            provider_name: "insurance_provider_b".to_string(),
            comment: Some("Test".to_string()),
            is_active: true,
            prescription_validity_days: Some(30),
        };

        let insurance_provider_repo = InsuranceProviderRowRepository::new(&connection);
        insurance_provider_repo
            .upsert_one(&insurance_provider_a)
            .unwrap();
        insurance_provider_repo
            .upsert_one(&insurance_provider_b)
            .unwrap();

        // Create insurance entries
        let insurance_a = NameInsuranceJoinRow {
            id: "1".to_string(),
            name_link_id: name_link_a.id.clone(),
            insurance_provider_id: insurance_provider_a.id.clone(),
            policy_number_person: Some("12345".to_string()),
            policy_number_family: Some("67890".to_string()),
            policy_number: "112233".to_string(),
            policy_type: InsurancePolicyType::Personal,
            discount_percentage: 10.0,
            expiry_date: NaiveDate::from_ymd_opt(2025, 12, 31).expect("Invalid date"),
            is_active: true,
            entered_by_id: Some("4".to_string()),
        };

        let insurance_b = NameInsuranceJoinRow {
            id: "2".to_string(),
            name_link_id: name_link_a.id.clone(),
            insurance_provider_id: insurance_provider_b.id.clone(),
            policy_number_person: Some("54321".to_string()),
            policy_number_family: Some("09876".to_string()),
            policy_number: "445566".to_string(),
            policy_type: InsurancePolicyType::Business,
            discount_percentage: 15.0,
            expiry_date: NaiveDate::from_ymd_opt(2024, 11, 30).expect("Invalid date"),
            is_active: false,
            entered_by_id: Some("5".to_string()),
        };

        let insurance_repo = NameInsuranceJoinRowRepository::new(&context.connection);
        insurance_repo.upsert_one(&insurance_a).unwrap();
        insurance_repo.upsert_one(&insurance_b).unwrap();

        let result = service
            .insurances(&connection, &name_link_a.id, None)
            .unwrap();

        assert!(result.contains(&insurance_a));
        assert!(result.contains(&insurance_b));
    }
}
