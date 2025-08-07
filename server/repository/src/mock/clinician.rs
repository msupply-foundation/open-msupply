use crate::ClinicianRow;

pub fn clinician_a() -> ClinicianRow {
    ClinicianRow {
        id: String::from("clinician_a"),
        code: String::from("Clinician A"),
        last_name: String::from("Clinician A"),
        initials: String::from("CA"),
        is_active: true,
        ..Default::default()
    }
}

pub fn clinician_b() -> ClinicianRow {
    ClinicianRow {
        id: String::from("clinician_b"),
        code: String::from("Clinician B"),
        last_name: String::from("Clinician B"),
        initials: String::from("CB"),
        is_active: true,
        ..Default::default()
    }
}

pub fn clinician_c() -> ClinicianRow {
    ClinicianRow {
        id: String::from("clinician_c"),
        code: String::from("Clinician C"),
        last_name: String::from("Clinician C"),
        initials: String::from("CC"),
        is_active: true,
        ..Default::default()
    }
}

pub fn mock_clinicians() -> Vec<ClinicianRow> {
    vec![clinician_a(), clinician_b(), clinician_c()]
}
