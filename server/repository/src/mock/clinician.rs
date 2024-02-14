use util::inline_init;

use crate::ClinicianRow;

pub fn clinician_a() -> ClinicianRow {
    inline_init(|r: &mut ClinicianRow| {
        r.id = String::from("clinician_a");
        r.code = String::from("Clinician A");
        r.last_name = String::from("Clinician A");
        r.initials = String::from("CA");
        r.is_active = true;
    })
}

pub fn clinician_b() -> ClinicianRow {
    inline_init(|r: &mut ClinicianRow| {
        r.id = String::from("clinician_b");
        r.code = String::from("Clinician B");
        r.last_name = String::from("Clinician B");
        r.initials = String::from("CB");
        r.is_active = true;
    })
}

pub fn clinician_c() -> ClinicianRow {
    inline_init(|r: &mut ClinicianRow| {
        r.id = String::from("clinician_c");
        r.code = String::from("Clinician C");
        r.last_name = String::from("Clinician C");
        r.initials = String::from("CC");
        r.is_active = true;
    })
}

pub fn mock_clinicians() -> Vec<ClinicianRow> {
    vec![clinician_a(), clinician_b(), clinician_c()]
}
