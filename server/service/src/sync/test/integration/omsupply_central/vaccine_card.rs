use super::sync_omsupply_central;
use crate::{
    programs::patient::{link_patient_to_store, patient_updated::create_patient_name_store_join},
    sync::{
        test::{
            check_integrated,
            integration::{
                central_server_configurations::ConfigureCentralServer, create_site,
                init_test_context, integrate_with_is_sync_reset, GraphqlRequest,
            },
        },
        translations::IntegrationOperation,
        CentralServerConfig,
    },
};
use repository::{GenderType, NameRow, NameRowType, VaccinationRow};
use serde_json::json;
use util::uuid::uuid;

use super::graphql;

static ADD_VACCINE_COURSE: &str = r#"
mutation MyMutation(
  $courseId: String!
  $doseId: String!
  $programId: String!
  $storeId: String!
  $vaccineItemId: String!
  $itemId: String!
) {
  centralServer {
    vaccineCourse {
      insertVaccineCourse(
        input: {
          id: $courseId
          name: ""
          programId: $programId
          vaccineItems: { id: $vaccineItemId, itemId: $itemId }
          doses: {
            id: $doseId
            label: ""
            minAge: 1
            maxAge: 1
            minIntervalDays: 1
          }
          coverageRate: 1
          isActive: true
          wastageRate: 1
        }
        storeId: $storeId
      ) {
        ... on VaccineCourseNode {
          id
          name
        }
        ... on InsertVaccineCourseError {
          __typename
          error {
            description
          }
        }
      }
    }
  }
}
"#;

pub(super) async fn test_vaccine_card() {
    // Comment out to see more logs
    // util::init_logger(util::LogLevel::Info);

    // SETUP
    // Two sites
    let central_server_configurations = ConfigureCentralServer::from_env();
    let site1 = create_site("vaccine_card_site_1", vec![]).await;
    let site2 = create_site("vaccine_card_site_2", vec![]).await;

    let program_id = uuid();
    let item_id = uuid();
    let dose_id = uuid();

    // Add pre requisites for graphql add vaccine course mutation
    central_server_configurations
        .upsert_records(json!({
            "list_master":[
                {
                    "ID": program_id,
                    "inactive":false,
                    "isProgram":true,
                    "programSettings":"{}"
                }
            ],
            "list_master_name_join":[
                {
                    "ID": uuid(),
                    "list_master_ID": program_id,
                    // Technically not accurate but works
                    "name_ID": site1.config.new_site_properties.name_id
                }
            ],
            "item": [{"ID": item_id, "type_of": "general"}]
        }))
        .await
        .expect("Problem inserting central data");

    // Sync both sites (only one needed here realy, to get central_server_url)
    site1.synchroniser.sync(None).await.unwrap();
    site2.synchroniser.sync(None).await.unwrap();

    let CentralServerConfig::CentralServerUrl(central_server_url) = CentralServerConfig::get()
    else {
        panic!("Not a remote site or central server not configured in legacy mSupply");
    };

    // For mSupply central records to get to omSupply central
    sync_omsupply_central(&central_server_url).await;

    // Add vaccine central data
    graphql(
        &central_server_url,
        GraphqlRequest {
            query: ADD_VACCINE_COURSE.to_string(),
            variables: json!({
                "courseId": uuid(),
                "doseId": dose_id,
                "programId": program_id,
                // Technically not accurate but works
                "storeId":  site1.config.new_site_properties.store_id,
                "vaccineItemId": uuid(),
                "itemId": item_id
            }),
        },
    )
    .await;

    // Sync all pre requisites
    site1.synchroniser.sync(None).await.unwrap();
    site2.synchroniser.sync(None).await.unwrap();

    // TEST

    // 1 - Add patient and vaccine to first site, and sync
    let patient_one = NameRow {
        id: uuid(),
        r#type: NameRowType::Patient,
        // None would be translated to 'male' when records syncs back again
        // which would break assertions in check_integrated
        gender: Some(GenderType::Female),
        ..Default::default()
    };

    let vaccination_one = VaccinationRow {
        id: uuid(),
        store_id: site1.config.new_site_properties.store_id.clone(),
        patient_id: patient_one.id.clone(),
        vaccine_course_dose_id: dose_id.clone(),
        // This could break in the future (when constraints are added)
        ..Default::default()
    };

    let integrations_one = vec![
        IntegrationOperation::upsert(patient_one.clone()),
        IntegrationOperation::upsert(vaccination_one.clone()),
    ];

    let integrations_one =
        integrate_with_is_sync_reset(&site1.context.connection, integrations_one);
    // Name store join created here, name link is create when patient is upserted
    create_patient_name_store_join(
        &site1.context.connection,
        &site1.config.new_site_properties.store_id,
        &patient_one.id,
        None,
    )
    .unwrap();

    site1.synchroniser.sync(None).await.unwrap();

    // 2 - Link patient to sites 2, sync and test data from 1 is present
    let context = site2.context.service_provider.basic_context().unwrap();
    link_patient_to_store(
        &site2.context.service_provider,
        &context,
        &site2.config.new_site_properties.store_id.clone(),
        &patient_one.id,
    )
    .await
    .unwrap();

    site2
        .synchroniser
        .sync(Some(patient_one.id.clone()))
        .await
        .unwrap();

    check_integrated(&site2.context.connection, &integrations_one);

    // 3 - Add new vaccination on site 2 sync both sites and check if data is present on site 1
    let vaccination_two = VaccinationRow {
        id: uuid(),
        store_id: site2.config.new_site_properties.store_id.clone(),
        patient_id: patient_one.id.clone(),
        vaccine_course_dose_id: dose_id.clone(),
        // This could break in the future
        ..Default::default()
    };

    let integrations_two = vec![IntegrationOperation::upsert(vaccination_two.clone())];
    let integrations_two =
        integrate_with_is_sync_reset(&site2.context.connection, integrations_two);

    site2.synchroniser.sync(None).await.unwrap();
    site1.synchroniser.sync(None).await.unwrap();

    check_integrated(&site1.context.connection, &integrations_two);

    // 4 - Re intialise both sites and make sure all data is present on both sites

    let site1 = init_test_context(site1.config, "vaccine_card_site_1_reinit").await;
    let site2 = init_test_context(site2.config, "vaccine_card_site_2_reinit").await;

    site1.synchroniser.sync(None).await.unwrap();
    site2.synchroniser.sync(None).await.unwrap();

    check_integrated(&site1.context.connection, &integrations_one);
    check_integrated(&site1.context.connection, &integrations_two);

    check_integrated(&site2.context.connection, &integrations_one);
    check_integrated(&site2.context.connection, &integrations_two);
}
