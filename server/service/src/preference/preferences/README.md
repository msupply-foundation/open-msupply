# Preferences

When adding a new preference, first define a struct for it, and implement the `Preference` trait for it.

```rs
pub struct UsePaymentsInPrescriptions;

impl Preference<bool> for UsePaymentsInPrescriptions {
    fn key() -> &'static str {
        "use_payments_in_prescriptions"
    }
}
```

You'll need to define a unique key for the preference, and specify it's type. This example is a `bool` type, but note that if you define custom types, you'll need to implement `Default` and `Deserialize` for it.

Next, add your new preference to the `Preferences` struct in the `mod.rs` file of this folder.
