use std::sync::Arc;

use crate::{
    document::{
        encounter::{EncounterService, EncounterServiceTrait, InsertEncounter},
        patient::{PatientService, PatientServiceTrait, UpdatePatient, PATIENT_TYPE},
        program::{
            program_schema::{ProgramEnrolmentStatus, SchemaProgramEnrolment},
            ProgramService, ProgramServiceTrait, UpsertProgram,
        },
    },
    service_provider::ServiceProvider,
};
use chrono::{Duration, Utc};
use repository::{
    DocumentContext, DocumentRegistryRow, DocumentRegistryRowRepository, EqualFilter, FormSchema,
    FormSchemaRowRepository, RepositoryError, StoreFilter, StoreRepository,
};
use serde::{Deserialize, Serialize};
use util::{inline_init, uuid::uuid};

use self::hiv_care_encounter::HivcareEncounterPhysicalExamination;

schemafy::schemafy!("src/sync/program_schemas/patient.json");

mod hiv_care_program {
    use serde::{Deserialize, Serialize};
    schemafy::schemafy!("src/sync/program_schemas/hiv_care_program.json");

    impl Default for HivcareProgramEnrolment {
        fn default() -> Self {
            Self {
                enrolment_datetime: Default::default(),
                enrolment_patient_id: Default::default(),
                hiv_confirmation_date: Default::default(),
                hiv_test_type: Default::default(),
                mother: Default::default(),
                partner_hiv_status: Default::default(),
                prior_art: Default::default(),
                referred_from: Default::default(),
                risk_group: Default::default(),
                status: Default::default(),
                treatment_supporter: Default::default(),
            }
        }
    }
}

mod hiv_care_encounter {
    use serde::{Deserialize, Serialize};
    schemafy::schemafy!("src/sync/program_schemas/hiv_care_encounter.json");

    impl Default for HivcareEncounter {
        fn default() -> Self {
            Self {
                arv_medication: Default::default(),
                end_datetime: Default::default(),
                family_planning: Default::default(),
                physical_examination: Default::default(),
                practitioner: Default::default(),
                risk_behaviour: Default::default(),
                start_datetime: Default::default(),
                status: Default::default(),
                tuberculosis: Default::default(),
                events: Default::default(),
            }
        }
    }
}

const PATIENT_SCHEMA: &'static str = std::include_str!("./program_schemas/patient.json");
const PATIENT_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/patient_ui_schema.json");

const PROGRAM_SCHEMA: &'static str = std::include_str!("./program_schemas/program_enrolment.json");
const PROGRAM_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/program_ui_schema.json");

const HIV_CARE_PROGRAM_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_program.json");
const HIV_CARE_PROGRAM_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_program_ui_schema.json");

const ENCOUNTER_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_encounter.json");
const ENCOUNTER_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_encounter_ui_schema.json");

fn person_1() -> Person {
    Person {
        id: Some("person1".to_string()),
        code: Some("id34568".to_string()),
        first_name: Some("Tom".to_string()),
        last_name: Some("Smith".to_string()),
        contact_details: vec![],
        date_of_birth: None,
        date_of_birth_is_estimated: None,
        birth_place: None,
        gender: Some(Gender::Male),
        passport_number: None,
        socio_economics: SocioEconomics {
            education: None,
            literate: None,
            occupation: None,
        },
        is_deceased: false,
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
    }
}

fn person_2() -> Person {
    Person {
        id: Some("person2".to_string()),
        code: Some("id41325".to_string()),
        first_name: Some("Eli".to_string()),
        last_name: Some("Bond".to_string()),
        contact_details: vec![],
        date_of_birth: None,
        date_of_birth_is_estimated: None,
        birth_place: None,
        gender: Some(Gender::Female),
        passport_number: None,
        socio_economics: SocioEconomics {
            education: None,
            literate: None,
            occupation: None,
        },
        is_deceased: false,
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
    }
}

fn person_3() -> Person {
    Person {
        id: Some("person3".to_string()),
        code: Some("id12245".to_string()),
        first_name: Some("Heidi".to_string()),
        last_name: Some("Tomalla".to_string()),
        contact_details: vec![],
        date_of_birth: None,
        date_of_birth_is_estimated: None,
        birth_place: None,
        gender: Some(Gender::Female),
        passport_number: None,
        socio_economics: SocioEconomics {
            education: None,
            literate: None,
            occupation: None,
        },
        is_deceased: false,
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
    }
}

fn patient_1() -> Patient {
    let contact_details = ContactDetails {
        description: Some("Work contact".to_string()),
        address_1: Some("Anzac Av 1".to_string()),
        address_2: Some("1055 Auckland".to_string()),
        city: None,
        country: Some("NZ".to_string()),
        district: Some("Auckland".to_string()),
        region: None,
        zip_code: None,
        mobile: Some("022235678".to_string()),
        phone: Some("095425378".to_string()),
        email: Some("myemail@work.com".to_string()),
        website: Some("mywebsite.com".to_string()),
    };
    Patient {
        id: "patient1".to_string(),
        code: Some("id12345".to_string()),
        contact_details: vec![contact_details.clone()],
        date_of_birth: Some("2000-03-04".to_string()),
        date_of_birth_is_estimated: None,
        birth_place: Some(Address {
            address_1: None,
            address_2: None,
            city: None,
            country: None,
            district: Some("Hamilton".to_string()),
            region: Some("Waikato".to_string()),
            zip_code: None,
        }),
        family: Some(Family {
            marital_status: Some(MaritalStatus::Married),
            caregiver: Some(person_1()),
            mother: Some(person_2()),
            next_of_kin: Some(person_3()),
        }),
        first_name: Some("Tina".to_string()),
        last_name: Some("Ling".to_string()),
        gender: Some(Gender::Female),
        health_center: None,
        passport_number: None,
        socio_economics: SocioEconomics {
            education: None,
            literate: None,
            occupation: None,
        },
        allergies: None,
        birth_order: None,
        hand: None,
        is_deceased: false,
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
    }
}

fn patient_2() -> Patient {
    let contact_details = ContactDetails {
        description: None,
        email: Some("cook@mail.com".to_string()),
        address_1: Some("Queen St 55".to_string()),
        address_2: Some("1052 Auckland".to_string()),
        city: None,
        country: Some("NZ".to_string()),
        district: Some("Auckland".to_string()),
        region: None,
        zip_code: None,
        mobile: Some("021245678".to_string()),
        phone: Some("092425678".to_string()),
        website: Some("cook.com".to_string()),
    };
    Patient {
        id: "patient2".to_string(),
        code: Some("id88345".to_string()),
        contact_details: vec![contact_details.clone()],
        date_of_birth: Some("1990-11-10".to_string()),
        date_of_birth_is_estimated: None,
        birth_place: Some(Address {
            address_1: None,
            address_2: None,
            city: None,
            country: None,
            district: Some("Eastbourne".to_string()),
            region: Some("Sussex".to_string()),
            zip_code: None,
        }),
        family: Some(Family {
            marital_status: Some(MaritalStatus::Single),
            caregiver: Some(person_2()),
            mother: Some(person_3()),
            next_of_kin: Some(person_1()),
        }),
        first_name: Some("Andy".to_string()),
        last_name: Some("Cook".to_string()),
        gender: Some(Gender::Male),
        health_center: None,
        passport_number: None,
        socio_economics: SocioEconomics {
            education: None,
            literate: None,
            occupation: None,
        },
        allergies: None,
        birth_order: None,
        hand: None,
        is_deceased: false,
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
    }
}

fn program_1() -> SchemaProgramEnrolment {
    SchemaProgramEnrolment {
        enrolment_datetime: Utc::now().to_rfc3339(),
        enrolment_patient_id: Some("programpatientid1".to_string()),
        status: Some(ProgramEnrolmentStatus::Active),
    }
}

fn program_2() -> hiv_care_program::HivcareProgramEnrolment {
    inline_init(|p: &mut hiv_care_program::HivcareProgramEnrolment| {
        p.enrolment_datetime = Utc::now().to_rfc3339();
        p.enrolment_patient_id = Some("STR0001".to_string());
        p.status = Some(hiv_care_program::ProgramEnrolmentStatus::Active);
    })
}

fn encounter_1() -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Scheduled);
        e.start_datetime = Utc::now()
            .checked_sub_signed(Duration::weeks(5))
            .unwrap()
            .to_rfc3339();
        e.end_datetime = None;
        e.practitioner = None;
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some(51.0);
                exam.blood_pressure = Some(120.0);
            },
        ));
    })
}

fn encounter_2() -> hiv_care_encounter::HivcareEncounter {
    let time = Utc::now().checked_sub_signed(Duration::weeks(4)).unwrap();
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Scheduled);
        e.start_datetime = time.to_rfc3339();
        e.end_datetime = None;
        e.practitioner = None;
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some(52.0);
                exam.blood_pressure = Some(125.0);
            },
        ));
        e.events = Some(vec![
            hiv_care_encounter::EncounterEvent {
                datetime: time
                    .checked_add_signed(Duration::weeks(1))
                    .unwrap()
                    .to_rfc3339(),
                group: Some("HivCareEncounterDispensingStatus".to_string()),
                type_: "status".to_string(),
                name: Some("Interrupted".to_string()),
            },
            hiv_care_encounter::EncounterEvent {
                datetime: time
                    .checked_add_signed(Duration::weeks(2))
                    .unwrap()
                    .to_rfc3339(),
                group: Some("HivCareEncounterDispensingStatus".to_string()),
                type_: "status".to_string(),
                name: Some("Lost to follow up".to_string()),
            },
        ])
    })
}

fn encounter_3() -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Scheduled);
        e.start_datetime = Utc::now()
            .checked_sub_signed(Duration::weeks(3))
            .unwrap()
            .to_rfc3339();
        e.end_datetime = None;
        e.practitioner = None;
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some(52.5);
                exam.blood_pressure = Some(128.0);
            },
        ));
    })
}

fn encounter_4() -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Scheduled);
        e.start_datetime = Utc::now()
            .checked_sub_signed(Duration::weeks(1))
            .unwrap()
            .to_rfc3339();
        e.end_datetime = None;
        e.practitioner = None;
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some(51.0);
                exam.blood_pressure = Some(121.0);
            },
        ));
    })
}

fn encounter_5() -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Scheduled);
        e.start_datetime = Utc::now().to_rfc3339();
        e.end_datetime = None;
        e.practitioner = None;
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some(54.0);
                exam.blood_pressure = Some(118.0);
            },
        ));
    })
}

pub fn init_program_data(
    service_provider: &Arc<ServiceProvider>,
    site_id: u32,
) -> Result<(), RepositoryError> {
    let ctx = service_provider.context().unwrap();
    let connection = &ctx.connection;

    // patient
    let patient_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: patient_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(PATIENT_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(PATIENT_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: uuid(),
        document_type: PATIENT_TYPE.to_string(),
        context: DocumentContext::Patient,
        name: Some("Patient".to_string()),
        parent_id: None,
        form_schema_id: Some(patient_schema_id.clone()),
    })?;

    // program
    let program_schema_id = uuid();
    let placeholder_program_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: program_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(PROGRAM_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(PROGRAM_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: placeholder_program_id.clone(),
        document_type: "TestProgram1".to_string(),
        context: DocumentContext::Program,
        name: Some("Placeholder program 1".to_string()),
        parent_id: None,
        form_schema_id: Some(program_schema_id.clone()),
    })?;

    // hiv care program
    let hiv_care_program_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: hiv_care_program_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(HIV_CARE_PROGRAM_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(HIV_CARE_PROGRAM_UI_SCHEMA).unwrap(),
    })?;
    let hiv_care_program_id = uuid();
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: hiv_care_program_id.clone(),
        document_type: "HIVCareProgram".to_string(),
        context: DocumentContext::Program,
        name: Some("HIV Care Program".to_string()),
        parent_id: None,
        form_schema_id: Some(hiv_care_program_schema_id.clone()),
    })?;

    // encounter
    let hiv_care_encounter_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: hiv_care_encounter_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(ENCOUNTER_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(ENCOUNTER_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: uuid(),
        document_type: "HIVCareEncounter".to_string(),
        context: DocumentContext::Encounter,
        name: Some("HIV Care Encounter".to_string()),
        parent_id: Some(hiv_care_program_id.clone()),
        form_schema_id: Some(hiv_care_encounter_schema_id.clone()),
    })?;

    // patients
    let store_id = StoreRepository::new(connection)
        .query_one(StoreFilter::new().site_id(EqualFilter::equal_to_i32(site_id as i32)))
        .unwrap()
        .unwrap()
        .store_row
        .id;
    let service = PatientService {};
    service
        .update_patient(
            &ctx,
            &service_provider,
            &store_id,
            "no user",
            UpdatePatient {
                data: serde_json::to_value(patient_1()).unwrap(),
                schema_id: patient_schema_id.clone(),
                parent: None,
            },
        )
        .unwrap();
    let service = PatientService {};
    service
        .update_patient(
            &ctx,
            &service_provider,
            &store_id,
            "no user",
            UpdatePatient {
                data: serde_json::to_value(patient_2()).unwrap(),
                schema_id: patient_schema_id,
                parent: None,
            },
        )
        .unwrap();

    // program
    let service = ProgramService {};
    service
        .upsert_program(
            &ctx,
            &service_provider,
            "no user",
            UpsertProgram {
                patient_id: patient_1().id,
                r#type: "TestProgram1".to_string(),
                data: serde_json::to_value(program_1()).unwrap(),
                schema_id: program_schema_id.clone(),
                parent: None,
            },
        )
        .unwrap();
    // hiv care program
    service
        .upsert_program(
            &ctx,
            &service_provider,
            "no user",
            UpsertProgram {
                patient_id: patient_1().id,
                r#type: "HIVCareProgram".to_string(),
                data: serde_json::to_value(program_2()).unwrap(),
                schema_id: hiv_care_program_schema_id,
                parent: None,
            },
        )
        .unwrap();

    // encounter
    let service = EncounterService {};
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_1()).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
            },
        )
        .unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_2()).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
            },
        )
        .unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_3()).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
            },
        )
        .unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_4()).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
            },
        )
        .unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_5()).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
            },
        )
        .unwrap();

    Ok(())
}
