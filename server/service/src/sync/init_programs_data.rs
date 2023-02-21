use crate::service_provider::ServiceContext;
use std::sync::Arc;

use crate::{
    programs::{
        encounter::{EncounterService, EncounterServiceTrait, InsertEncounter},
        patient::{PatientService, PatientServiceTrait, UpdatePatient, PATIENT_TYPE},
        program_enrolment::{
            program_schema::{ProgramEnrolmentStatus, SchemaProgramEnrolment},
            ProgramEnrolmentService, ProgramEnrolmentServiceTrait, UpsertProgramEnrolment,
        },
    },
    service_provider::ServiceProvider,
};
use chrono::{DateTime, Duration, Utc};
use repository::{
    DocumentContext, DocumentRegistryRow, DocumentRegistryRowRepository, EqualFilter, FormSchema,
    FormSchemaRowRepository, NameRow, NameRowRepository, NameStoreJoinRepository, NameStoreJoinRow,
    NameType, Permission, ReportContext, ReportRow, ReportRowRepository, RepositoryError,
    StorageConnection, StoreFilter, StoreRepository, UserPermissionRow,
    UserPermissionRowRepository, UserStoreJoinRowRepository,
};
use serde::{Deserialize, Serialize};
use util::{inline_init, uuid::uuid};

use self::hiv_care_encounter::HivcareEncounterPhysicalExamination;

schemafy::schemafy!("src/sync/program_schemas/patient.json");

mod hiv_testing_program {
    use serde::{Deserialize, Serialize};
    schemafy::schemafy!("src/sync/program_schemas/hiv_testing_program.json");

    impl Default for HivtestingProgramEnrolment {
        fn default() -> Self {
            Self {
                enrolment_datetime: Default::default(),
                program_enrolment_id: Default::default(),
                status: Default::default(),
                referred_from: Default::default(),
                partner_hiv_status: Default::default(),
                mother: Default::default(),
            }
        }
    }
}

mod hiv_care_program {
    use serde::{Deserialize, Serialize};
    schemafy::schemafy!("src/sync/program_schemas/hiv_care_program.json");

    impl Default for HivcareProgramEnrolment {
        fn default() -> Self {
            Self {
                enrolment_datetime: Default::default(),
                program_enrolment_id: Default::default(),
                hiv_confirmation_date: Default::default(),
                hiv_test_type: Default::default(),
                mother: Default::default(),
                partner_hiv_status: Default::default(),
                prior_art: Default::default(),
                risk_group: Default::default(),
                status: Default::default(),
                treatment_supporter: Default::default(),
                // note: Default::default(),
                referred_from: Default::default(),
                clinic_transferred_from: Default::default(),
                previous_clinic_art_start_date: Default::default(),
                date_transferred_in: Default::default(),
                previous_clinic_id: Default::default(),
            }
        }
    }
}

mod hiv_testing_encounter {
    use serde::{Deserialize, Serialize};
    schemafy::schemafy!("src/sync/program_schemas/hiv_testing_encounter.json");

    impl Default for HivtestingEncounter {
        fn default() -> Self {
            Self {
                end_datetime: Default::default(),
                clinician: Default::default(),
                created_datetime: Default::default(),
                start_datetime: Default::default(),
                status: Default::default(),
                htc_register_serial_number: None,
                risk_behaviour: Default::default(),
                family_planning: Default::default(),
                hiv_testing: Default::default(),
                informed_consent: Default::default(),
                notes: Default::default(),
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
                gender_based_violence: Default::default(),
                physical_examination: Default::default(),
                clinician: Default::default(),
                created_datetime: Default::default(),
                start_datetime: Default::default(),
                status: Default::default(),
                tuberculosis: Default::default(),
                biochem: Default::default(),
                haem: Default::default(),
                tb_hcv: Default::default(),
                viral_load: Default::default(),
                notes: Default::default(),
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

const HIV_TESTING_PROGRAM_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_testing_program.json");
const HIV_TESTING_PROGRAM_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_testing_program_ui_schema.json");

const HIV_CARE_PROGRAM_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_program.json");
const HIV_CARE_PROGRAM_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_program_ui_schema.json");

const HIV_TESTING_ENCOUNTER_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_testing_encounter.json");
const HIV_TESTING_ENCOUNTER_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_testing_encounter_ui_schema.json");

const HIV_CARE_ENCOUNTER_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_encounter.json");
const HIV_CARE_ENCOUNTER_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/hiv_care_encounter_ui_schema.json");
const HIV_CARE_ENCOUNTER_CONFIG: &'static str =
    std::include_str!("./program_schemas/hiv_care_encounter_config.json");

const IMMUNISATION_PROGRAM_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_program.json");
const IMMUNISATION_PROGRAM_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_program_ui_schema.json");

const IMMUNISATION_ENCOUNTER_6WEEKS_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_6weeks_encounter.json");
const IMMUNISATION_ENCOUNTER_6WEEKS_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_6weeks_encounter_ui_schema.json");

const IMMUNISATION_ENCOUNTER_3MONTH_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_3month_encounter.json");
const IMMUNISATION_ENCOUNTER_3MONTH_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_3month_encounter_ui_schema.json");

const IMMUNISATION_ENCOUNTER_5MONTH_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_5month_encounter.json");
const IMMUNISATION_ENCOUNTER_5MONTH_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/routine_immunisation_5month_encounter_ui_schema.json");

const PATIENT_REPORT: &'static str =
    std::include_str!("./program_schemas/report_patient_hiv_care.json");
const DEMO_PATIENT_REPORT: &'static str =
    std::include_str!("./program_schemas/report_demo_patient.json");

const DEMO_ARG_SCHEMA: &'static str = std::include_str!("./program_schemas/demo_arg_schema.json");
const DEMO_ARG_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/demo_arg_ui_schema.json");

const ENCOUNTERS_ARG_SCHEMA: &'static str =
    std::include_str!("./program_schemas/encounters_arg_schema.json");
const ENCOUNTERS_ARG_UI_SCHEMA: &'static str =
    std::include_str!("./program_schemas/encounters_arg_ui_schema.json");
const ENCOUNTERS_REPORT: &'static str =
    std::include_str!("./program_schemas/report_encounters.json");
const VL_ELIGIBILITY_REPORT: &'static str =
    std::include_str!("./program_schemas/report_vl_eligibility.json");
const LTFU_REPORT: &'static str = std::include_str!("./program_schemas/report_ltfu.json");

fn person_1() -> RelatedPerson {
    RelatedPerson {
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
        socio_economics: None,
        is_deceased: Some(false),
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
        relationship: Some("Caregiver".to_string()),
    }
}

fn person_2() -> RelatedPerson {
    RelatedPerson {
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
        socio_economics: None,
        is_deceased: Some(false),
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
        relationship: Some("Brother".to_string()),
    }
}

fn person_3() -> RelatedPerson {
    RelatedPerson {
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
        socio_economics: None,
        is_deceased: Some(false),
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
        relationship: Some("Mother".to_string()),
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
        code: Some("3234567380".to_string()),
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
        socio_economics: None,
        allergies: None,
        birth_order: None,
        handedness: None,
        is_deceased: Some(false),
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
        code: Some("7234567120".to_string()),
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
        socio_economics: None,
        allergies: None,
        birth_order: None,
        handedness: None,
        is_deceased: Some(false),
        date_of_death: None,
        code_2: None,
        middle_name: None,
        notes: None,
    }
}

fn program_1() -> SchemaProgramEnrolment {
    SchemaProgramEnrolment {
        enrolment_datetime: Utc::now().to_rfc3339(),
        program_enrolment_id: Some("programEnrolmentId1".to_string()),
        status: Some(ProgramEnrolmentStatus::Active),
    }
}

fn program_hiv_care() -> hiv_care_program::HivcareProgramEnrolment {
    inline_init(|p: &mut hiv_care_program::HivcareProgramEnrolment| {
        p.enrolment_datetime = Utc::now().to_rfc3339();
        p.program_enrolment_id = Some("STR0001".to_string());
        p.status = Some(hiv_care_program::ProgramEnrolmentStatus::Active);
    })
}

fn program_hiv_testing() -> hiv_testing_program::HivtestingProgramEnrolment {
    inline_init(|p: &mut hiv_testing_program::HivtestingProgramEnrolment| {
        p.enrolment_datetime = Utc::now().to_rfc3339();
        p.program_enrolment_id = Some("STR0002".to_string());
        p.status = Some(hiv_testing_program::ProgramEnrolmentStatus::Active);
    })
}

fn encounter_hiv_testing_1(time: DateTime<Utc>) -> hiv_testing_encounter::HivtestingEncounter {
    inline_init(|e: &mut hiv_testing_encounter::HivtestingEncounter| {
        e.status = Some(hiv_testing_encounter::EncounterStatus::Completed);
        e.created_datetime = time.to_rfc3339();
        e.start_datetime = time.to_rfc3339();
    })
}

fn encounter_hiv_care_1(time: DateTime<Utc>) -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Completed);
        e.created_datetime = time.to_rfc3339();
        e.start_datetime = time.to_rfc3339();
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some("51.00".to_string());
                exam.blood_pressure = Some("120/80".to_string());
            },
        ));
        e.arv_medication = Some(inline_init(
            |e: &mut hiv_care_encounter::HivcareEncounterArvMedication| {
                e.quantity_prescribed = Some(8.0);
                e.regimen = Some("1a-New".to_string());
                e.regimen_status = Some("START".to_string());
            },
        ));
    })
}

fn encounter_hiv_care_2(time: DateTime<Utc>) -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Cancelled);
        e.created_datetime = time.to_rfc3339();
        e.start_datetime = time.to_rfc3339();
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some("52.00".to_string());
                exam.blood_pressure = Some("125/90".to_string());
            },
        ));
        e.arv_medication = Some(inline_init(
            |e: &mut hiv_care_encounter::HivcareEncounterArvMedication| {
                e.remaining_pill_count = Some(2.0);
                e.quantity_prescribed = Some(8.0);
                e.adherence_status = Some(85.7142835884354);
                e.regimen = Some("1a-New".to_string());
                e.regimen_status = Some("CONTINUE".to_string());
            },
        ));
    })
}

fn encounter_hiv_care_3(time: DateTime<Utc>) -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Completed);
        e.created_datetime = time.to_rfc3339();
        e.start_datetime = time.to_rfc3339();
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some("52.50".to_string());
                exam.blood_pressure = Some("128/00".to_string());
            },
        ));
        e.arv_medication = Some(inline_init(
            |e: &mut hiv_care_encounter::HivcareEncounterArvMedication| {
                e.remaining_pill_count = Some(5.0);
                e.quantity_prescribed = Some(8.0);
                e.adherence_status = Some(42.85714108560097);
                e.regimen = Some("2a-New".to_string());
                e.regimen_status = Some("CHANGE".to_string());
            },
        ));
    })
}

fn encounter_hiv_care_4(time: DateTime<Utc>) -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(hiv_care_encounter::EncounterStatus::Completed);
        e.created_datetime = time.to_rfc3339();
        e.start_datetime = time.to_rfc3339();
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some("51.00".to_string());
                exam.blood_pressure = Some("121/00".to_string());
            },
        ));
    })
}

fn encounter_hiv_care_5(
    time: DateTime<Utc>,
    status: hiv_care_encounter::EncounterStatus,
) -> hiv_care_encounter::HivcareEncounter {
    inline_init(|e: &mut hiv_care_encounter::HivcareEncounter| {
        e.status = Some(status);
        e.created_datetime = time.to_rfc3339();
        e.start_datetime = time.to_rfc3339();
        e.physical_examination = Some(inline_init(
            |exam: &mut HivcareEncounterPhysicalExamination| {
                exam.weight = Some("54.00".to_string());
                exam.blood_pressure = Some("118/00".to_string());
            },
        ));
    })
}

pub fn insert_programs_permissions(connection: &StorageConnection, user_id: String) {
    let user_store_join = UserStoreJoinRowRepository::new(&connection)
        .find_by_user_id(&user_id.clone())
        .unwrap()
        .unwrap();

    for user_store in user_store_join {
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some(PATIENT_TYPE.to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some(PATIENT_TYPE.to_string()),
            })
            .unwrap();

        // immunisation
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("RoutineImmunisationProgram".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("RoutineImmunisationProgram".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("RoutineImmunisation6WeeksEncounter".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("RoutineImmunisation6WeeksEncounter".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("RoutineImmunisation3MonthEncounter".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("RoutineImmunisation3MonthEncounter".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("RoutineImmunisation5MonthEncounter".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("RoutineImmunisation5MonthEncounter".to_string()),
            })
            .unwrap();

        // HIV Testing
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("HIVTestingProgram".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("HIVTestingProgram".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("HIVTestingEncounter".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("HIVTestingEncounter".to_string()),
            })
            .unwrap();

        // HIV Care
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("HIVCareProgram".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("HIVCareProgram".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentQuery,
                context: Some("HIVCareEncounter".to_string()),
            })
            .unwrap();
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&UserPermissionRow {
                id: uuid(),
                user_id: user_id.clone(),
                store_id: Some(user_store.store_id.clone()),
                permission: Permission::DocumentMutate,
                context: Some("HIVCareEncounter".to_string()),
            })
            .unwrap();
    }
}

fn insert_patient(
    connection: &StorageConnection,
    ctx: &ServiceContext,
    service_provider: &Arc<ServiceProvider>,
    patient_schema_id: String,
    site_id: u32,
    patient: Patient,
) {
    NameRowRepository::new(connection)
        .upsert_one(&NameRow {
            id: patient.id.clone(),
            first_name: patient.first_name.clone(),
            last_name: patient.last_name.clone(),
            name: "".to_string(),
            code: "".to_string(),
            r#type: NameType::Patient,
            is_customer: true,
            is_supplier: false,
            supplying_store_id: None,
            gender: None,
            date_of_birth: None,
            phone: None,
            charge_code: None,
            comment: None,
            country: None,
            address1: None,
            address2: None,
            email: None,
            website: None,
            is_manufacturer: false,
            is_donor: false,
            on_hold: false,
            created_datetime: None,
            is_deceased: false,
            national_health_number: None,
        })
        .unwrap();
    let store_id = StoreRepository::new(connection)
        .query_one(StoreFilter::new().site_id(EqualFilter::equal_to_i32(site_id as i32)))
        .unwrap()
        .unwrap()
        .store_row
        .id;
    let service = PatientService {};
    NameStoreJoinRepository::new(connection)
        .upsert_one(&NameStoreJoinRow {
            id: uuid(),
            name_id: patient.id.clone(),
            store_id: store_id.clone(),
            name_is_customer: true,
            name_is_supplier: false,
        })
        .unwrap();

    service
        .update_patient(
            &ctx,
            &service_provider,
            &store_id,
            "no user",
            UpdatePatient {
                data: serde_json::to_value(patient).unwrap(),
                schema_id: patient_schema_id.clone(),
                parent: None,
            },
        )
        .unwrap();
}

pub fn init_program_data(
    service_provider: &Arc<ServiceProvider>,
    site_id: u32,
    ctx: &ServiceContext,
) -> Result<(), RepositoryError> {
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
        config: None,
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
        config: None,
    })?;

    // hiv testing program
    let hiv_testing_program_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: hiv_testing_program_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(HIV_TESTING_PROGRAM_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(HIV_TESTING_PROGRAM_UI_SCHEMA).unwrap(),
    })?;
    let hiv_testing_program_id = uuid();
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: hiv_testing_program_id.clone(),
        document_type: "HIVTestingProgram".to_string(),
        context: DocumentContext::Program,
        name: Some("HIV Testing Program".to_string()),
        parent_id: None,
        form_schema_id: Some(hiv_testing_program_schema_id.clone()),
        config: None,
    })?;

    // hiv testing encounter
    let hiv_testing_encounter_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: hiv_testing_encounter_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(HIV_TESTING_ENCOUNTER_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(HIV_TESTING_ENCOUNTER_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: uuid(),
        document_type: "HIVTestingEncounter".to_string(),
        context: DocumentContext::Encounter,
        name: Some("HIV Testing Encounter".to_string()),
        parent_id: Some(hiv_testing_program_id.clone()),
        form_schema_id: Some(hiv_testing_encounter_schema_id.clone()),
        config: None,
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
        name: Some("HIV Care and Treatment".to_string()),
        parent_id: None,
        form_schema_id: Some(hiv_care_program_schema_id.clone()),
        config: None,
    })?;

    // hiv care encounter
    let hiv_care_encounter_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: hiv_care_encounter_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(HIV_CARE_ENCOUNTER_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(HIV_CARE_ENCOUNTER_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: uuid(),
        document_type: "HIVCareEncounter".to_string(),
        context: DocumentContext::Encounter,
        name: Some("HIV Care Encounter".to_string()),
        parent_id: Some(hiv_care_program_id.clone()),
        form_schema_id: Some(hiv_care_encounter_schema_id.clone()),
        config: Some(HIV_CARE_ENCOUNTER_CONFIG.to_string()),
    })?;

    let immunisation_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: immunisation_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(IMMUNISATION_PROGRAM_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(IMMUNISATION_PROGRAM_UI_SCHEMA).unwrap(),
    })?;
    let immunisation_program_id = uuid();
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: immunisation_program_id.clone(),
        document_type: "RoutineImmunisationProgram".to_string(),
        context: DocumentContext::Program,
        name: Some("Routine Immunisation Program".to_string()),
        parent_id: None,
        form_schema_id: Some(immunisation_schema_id.clone()),
        config: None,
    })?;
    let immunisation_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: immunisation_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(IMMUNISATION_ENCOUNTER_6WEEKS_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(IMMUNISATION_ENCOUNTER_6WEEKS_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: uuid(),
        document_type: "RoutineImmunisation6WeeksEncounter".to_string(),
        context: DocumentContext::Encounter,
        name: Some("Routine Immunisation 6 Weeks Encounter".to_string()),
        parent_id: Some(immunisation_program_id.clone()),
        form_schema_id: Some(immunisation_schema_id.clone()),
        config: None,
    })?;
    let immunisation_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: immunisation_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(IMMUNISATION_ENCOUNTER_3MONTH_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(IMMUNISATION_ENCOUNTER_3MONTH_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: uuid(),
        document_type: "RoutineImmunisation3MonthEncounter".to_string(),
        context: DocumentContext::Encounter,
        name: Some("Routine Immunisation 3 Month Encounter".to_string()),
        parent_id: Some(immunisation_program_id.clone()),
        form_schema_id: Some(immunisation_schema_id.clone()),
        config: None,
    })?;
    let immunisation_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: immunisation_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(IMMUNISATION_ENCOUNTER_5MONTH_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(IMMUNISATION_ENCOUNTER_5MONTH_UI_SCHEMA).unwrap(),
    })?;
    DocumentRegistryRowRepository::new(connection).upsert_one(&DocumentRegistryRow {
        id: uuid(),
        document_type: "RoutineImmunisation5MonthEncounter".to_string(),
        context: DocumentContext::Encounter,
        name: Some("Routine Immunisation 5 Month Encounter".to_string()),
        parent_id: Some(immunisation_program_id.clone()),
        form_schema_id: Some(immunisation_schema_id.clone()),
        config: None,
    })?;

    // patients
    insert_patient(
        connection,
        ctx,
        service_provider,
        patient_schema_id.clone(),
        site_id,
        patient_1(),
    );
    insert_patient(
        connection,
        ctx,
        service_provider,
        patient_schema_id.clone(),
        site_id,
        patient_2(),
    );

    // program
    let service = ProgramEnrolmentService {};
    service
        .upsert_program_enrolment(
            &ctx,
            &service_provider,
            "no user",
            UpsertProgramEnrolment {
                patient_id: patient_1().id,
                r#type: "TestProgram1".to_string(),
                data: serde_json::to_value(program_1()).unwrap(),
                schema_id: program_schema_id.clone(),
                parent: None,
            },
            vec!["TestProgram1".to_string()],
        )
        .unwrap();
    // hiv testing program
    service
        .upsert_program_enrolment(
            &ctx,
            &service_provider,
            "no user",
            UpsertProgramEnrolment {
                patient_id: patient_1().id,
                r#type: "HIVTestingProgram".to_string(),
                data: serde_json::to_value(program_hiv_testing()).unwrap(),
                schema_id: hiv_testing_program_schema_id,
                parent: None,
            },
            vec!["HIVTestingProgram".to_string()],
        )
        .unwrap();
    // hiv care program
    service
        .upsert_program_enrolment(
            &ctx,
            &service_provider,
            "no user",
            UpsertProgramEnrolment {
                patient_id: patient_1().id,
                r#type: "HIVCareProgram".to_string(),
                data: serde_json::to_value(program_hiv_care()).unwrap(),
                schema_id: hiv_care_program_schema_id,
                parent: None,
            },
            vec!["HIVCareProgram".to_string()],
        )
        .unwrap();

    // encounter
    let service = EncounterService {};
    let time = Utc::now().checked_sub_signed(Duration::weeks(5)).unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVTestingEncounter".to_string(),
                data: serde_json::to_value(encounter_hiv_testing_1(time)).unwrap(),
                schema_id: hiv_testing_encounter_schema_id.clone(),
                program: "HIVTestingProgram".to_string(),
                event_datetime: time,
            },
            vec!["HIVTestingEncounter".to_string()],
        )
        .unwrap();
    let time = Utc::now().checked_sub_signed(Duration::weeks(5)).unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_hiv_care_1(time)).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
                event_datetime: Utc::now(),
            },
            vec!["HIVCareEncounter".to_string()],
        )
        .unwrap();
    let time = Utc::now().checked_sub_signed(Duration::weeks(4)).unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_hiv_care_2(time)).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
                event_datetime: time,
            },
            vec!["HIVCareEncounter".to_string()],
        )
        .unwrap();
    let time = Utc::now().checked_sub_signed(Duration::weeks(3)).unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_hiv_care_3(time)).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
                event_datetime: time,
            },
            vec!["HIVCareEncounter".to_string()],
        )
        .unwrap();
    let time = Utc::now().checked_sub_signed(Duration::weeks(1)).unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_hiv_care_4(time)).unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
                event_datetime: time,
            },
            vec!["HIVCareEncounter".to_string()],
        )
        .unwrap();
    let time = Utc::now().checked_add_signed(Duration::weeks(1)).unwrap();
    service
        .insert_encounter(
            &ctx,
            &service_provider,
            "no user",
            InsertEncounter {
                patient_id: patient_1().id,
                r#type: "HIVCareEncounter".to_string(),
                data: serde_json::to_value(encounter_hiv_care_5(
                    time,
                    hiv_care_encounter::EncounterStatus::Scheduled,
                ))
                .unwrap(),
                schema_id: hiv_care_encounter_schema_id.clone(),
                program: "HIVCareProgram".to_string(),
                event_datetime: time,
            },
            vec!["HIVCareEncounter".to_string()],
        )
        .unwrap();

    // reports
    let report_repo = ReportRowRepository::new(&connection);
    report_repo
        .upsert_one(&ReportRow {
            id: uuid(),
            name: "Patient HIV Care Report".to_string(),
            r#type: repository::ReportType::OmSupply,
            template: PATIENT_REPORT.to_string(),
            context: ReportContext::Patient,
            comment: None,
            sub_context: Some("HIVCareProgram".to_string()),
            argument_schema_id: None,
        })
        .unwrap();

    // arg demo report
    let demo_arg_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: demo_arg_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(DEMO_ARG_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(DEMO_ARG_UI_SCHEMA).unwrap(),
    })?;
    report_repo
        .upsert_one(&ReportRow {
            id: uuid(),
            name: "Patient with first name like".to_string(),
            r#type: repository::ReportType::OmSupply,
            template: DEMO_PATIENT_REPORT.to_string(),
            context: ReportContext::Patient,
            comment: None,
            sub_context: Some("HIVCareProgram".to_string()),
            argument_schema_id: Some(demo_arg_schema_id),
        })
        .unwrap();

    // encounter list report
    let encounters_arg_schema_id = uuid();
    FormSchemaRowRepository::new(connection).upsert_one(&FormSchema {
        id: encounters_arg_schema_id.clone(),
        r#type: "JsonForms".to_string(),
        json_schema: serde_json::from_str(ENCOUNTERS_ARG_SCHEMA).unwrap(),
        ui_schema: serde_json::from_str(ENCOUNTERS_ARG_UI_SCHEMA).unwrap(),
    })?;
    report_repo
        .upsert_one(&ReportRow {
            id: uuid(),
            name: "List of Appointments".to_string(),
            r#type: repository::ReportType::OmSupply,
            template: ENCOUNTERS_REPORT.to_string(),
            context: ReportContext::Patient,
            comment: None,
            sub_context: Some("HIVCareProgram".to_string()),
            argument_schema_id: Some(encounters_arg_schema_id),
        })
        .unwrap();

    report_repo
        .upsert_one(&ReportRow {
            id: uuid(),
            name: "Viral Load Eligibility".to_string(),
            r#type: repository::ReportType::OmSupply,
            template: VL_ELIGIBILITY_REPORT.to_string(),
            context: ReportContext::Patient,
            comment: None,
            sub_context: Some("HIVCareProgram".to_string()),
            argument_schema_id: None,
        })
        .unwrap();

    report_repo
        .upsert_one(&ReportRow {
            id: uuid(),
            name: "Lost to follow up".to_string(),
            r#type: repository::ReportType::OmSupply,
            template: LTFU_REPORT.to_string(),
            context: ReportContext::Patient,
            comment: None,
            sub_context: Some("HIVCareProgram".to_string()),
            argument_schema_id: None,
        })
        .unwrap();

    Ok(())
}
