use super::Preference;

pub struct UsePaymentsInPrescriptions;

impl Preference<bool> for UsePaymentsInPrescriptions {
    fn key() -> &'static str {
        "use_payments_in_prescriptions"
    }
}
