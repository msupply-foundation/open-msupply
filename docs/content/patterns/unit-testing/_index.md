+++
title = "Unit Testing & Mocking"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Unit Testing & Mocking

## Why we do them

Unit test serve to validate that logic complies with specifications, they are also useful when a bug is found to quickly replicate it. Unit test are super important in managing regression, and increase confidence in doing refactor work.

## Examples

### Checking postgres enum vs rust enum

Derive strum on the enum

```rust
#[cfg_attr(test, derive(strum::EnumIter))]
enum MyEnum {
```

In test

```rust
#[actix_rt::test]
async fn test_enum() {
    let (_, connection, _, _) =
        setup_all("test_enum", MockDataInserts::none()).await;

    let repo = Repository::new(&connection);
    // Try upsert all variants, confirm that diesel enums match postgres
    for variant in MyEnum::iter() {
        let id = format!("{variant:?}");
        let result = repo.upsert_one(&Row {
            id: id.clone(),
            enum: variant.clone(),
            ..Default::default()
        });
        assert_matches!(result, Ok(_));

        assert_eq!(
            repo.find_one_by_id(&id),
            Ok(Some(Row {
                id,
                enum: variant.clone(),
                ..Default::default()
            }))
        );
    }
}
```

## Mocking the repository layer

The most confidence we can get that a piece of our app works is by testing it end to end - click some things in the UI, does it now look as I expect, all the data updated correctly? But these tests are expensive to write, run, and maintain. Whether done manually or automatically, it would be impossible to test every possible state of every area of our app in this way.

Meanwhile, a small unit test is very fast to write, and easy to read and maintain. They give us confidence that each building block works as expected. But they don't ensure that the building blocks all work together for the outcome we intend.

Good test coverage is best implemented with a layered testing approach. Layered testing accepts these facts, and so encourages us to write many unit tests, and then a few integration and end-to-end tests to ensure the critical paths hang together.

![Testing pyramid](https://github.com/user-attachments/assets/55bb2baf-abdf-400e-a9c7-6bb3238241b7)

The typical tests we write in our service layer would be considered integration tests: set up a database with some test data, call a service function, and assert that data, potentially across many tables, has been updated successfully. Many units have to work together to get the desired outcome. They're pretty time consuming to write, and often hard to read/determine was is actually being tested.

Here's an example:

```rs
  #[actix_rt::test]
    async fn update_stocktake() {
        fn mock_stocktake_finalised() -> StocktakeRow {
            inline_init(|r: &mut StocktakeRow| {
                r.id = "mock_stocktake_finalised".to_string();
                r.store_id = "store_a".to_string();
                r.stocktake_number = 20;
                r.created_datetime = NaiveDate::from_ymd_opt(2024, 12, 14)
                    .unwrap()
                    .and_hms_milli_opt(12, 33, 0, 0)
                    .unwrap();
                r.status = StocktakeStatus::Finalised;
            })
        }


        fn mock_stocktake_finalised_line() -> StocktakeLineRow {
            inline_init(|r: &mut StocktakeLineRow| {
                r.id = "mock_stocktake_finalised_line".to_string();
                r.stocktake_id = mock_stocktake_existing_line().id;
                r.stock_line_id = Some(mock_existing_stock_line().id);
                r.counted_number_of_packs = Some(20.0);
                r.snapshot_number_of_packs = 20.0;
                r.item_link_id = mock_item_a().id;
                r.cost_price_per_pack = Some(1.0);
                r.sell_price_per_pack = Some(2.0);
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_stocktake",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.stocktakes = vec![
                    mock_stocktake_finalised(),
                ];
                r.stocktake_lines = vec![
                    mock_stocktake_finalised_line(),
                ];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context("store_a".to_string(), "".to_string())
            .unwrap();
        let service = service_provider.stocktake_service;

        // error: CannotEditFinalised
        let stocktake = mock_stocktake_finalised();
        let error = service
            .update_stocktake(
                &context,
                inline_init(|i: &mut UpdateStocktake| {
                    i.id = stocktake.id;
                    i.comment = Some("Comment".to_string());
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeError::CannotEditFinalised);
```

These tests are super valuable, but we wouldn't want to have to set up every single success and error case in this manner - it's too time consuming!

Enter ✨mocking✨

Mocking allows us to assume that a dependency works as expected, and has been tested separately, so we can fake its responses. We can then easily provide different states to the code under test, and ensure we get the right result in each case.

When I test each `validate` step in the service layer, the dependency is our database/repository layer. By comparison, we could write something like this:

```rs
 #[test]
    fn cant_edit_verified_error() {
        let verified_stocktake = StocktakeRow {
            id: "verified".to_string(),
            status: StocktakeStatus::Finalised;
            ..Default::default()
        };

        let mock_repo = MockStocktakeRowRepository {
            find_one_by_id_result: Some(verified_stocktake)
        };

        let input = UpdateStocktake {
            id: "verified".to_string(),
            ..Default::default()
        };

       let error = validate(mock_repo, input).unwrap_err();
        assert_eq!(error, UpdateStocktakeError::CannotEditFinalised);
    }
```

### How does it work?

In Rust, mocking is made possible with traits. Traits describe the methods available on a struct (their names, input and output types) but they don't describe the internal workings. This is the trait for our Clinician Row Repository:

```rs
pub trait ClinicianRowRepositoryTrait<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError>;
   // ... other methods as needed
}
```

Then, our usual runtime code ClinicianRowRepository implements this trait, here is a snippet:

```rs
impl<'a> ClinicianRowRepositoryTrait<'a> for ClinicianRowRepository<'a> {
    fn find_one_by_id(&self, row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError> {
        let result = clinician::dsl::clinician
            .filter(clinician::dsl::id.eq(row_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}
```

Now, in our service layer, instead of calling `ClinicianRowRepository` directly, we can expect _something that implements the ClinicianRowRepositoryTrait_ to be passed in:

```rs
 pub fn validate<'a>(
    clinician_repo: impl ClinicianRowRepositoryTrait<'a>,
    input: InsertClinicianInput
) -> Result<(), InsertClinicianError> {
    let clinician = clinician_repo.find_one_by_id(&input.id)?;

    if clinician.is_some() {
        return Err(InsertClinicianError::ClinicianAlreadyExists);
    }

    ...
}
```

Our runtime service code would pass in the usual repo:

```rs
 let clinician_repo = ClinicianRowRepository::new(connection);
 validate(clinician_repo, input)?;
```

But in our tests, we can provide a different implementation! We define a `mock` clinician row repo, and implement the same trait - except this time, we just return some data, rather than accessing any database:

```rs
#[derive(Default)]
pub struct MockClinicianRowRepository {
    pub find_one_by_id_result: Option<ClinicianRow>,
}


impl<'a> ClinicianRowRepositoryTrait<'a> for MockClinicianRowRepository {
    fn find_one_by_id(&self, _row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError> {
        Ok(self.find_one_by_id_result.clone())
    }
}
```

This allows our test setup to look a little more like this:

```rs
 #[test]
    fn clinician_already_exists_error() {
        let mock_repo = MockClinicianRowRepository {
            find_one_by_id_result: Some(ClinicianRow::default_with_id("existing_id")), // Simulate existing clinician,
        };

        let input = InsertClinician {
            id: "existing_id".to_string(),
            ..Default::default()
        };

        assert_eq!(
            validate(mock_repo, &input),
            Err(InsertClinicianError::ClinicianAlreadyExists)
        );
    }
```

No in-memory database setup, no extra test data required. We used mocking to set up the exact environment we needed for the area of code under test, and nothing more.

### A little deeper

You'll notice the MockClinicianRowRepository has a `find_one_by_id_result` - a helper field, so we only need to set the expected value, rather implementing the whole `find_one_by_id` method for each test.

Mocking gives us lots of flexibility though, if we wanted, we could have implemented the mock `find_one_by_id` as:

```rs
fn find_one_by_id(&self, row_id: &str) -> Result<Option<ClinicianRow>, RepositoryError> {
    assert_eq!(row_id, "existing_id");
    Some(ClinicianRow::default())
}
```

i.e. we can do custom assertions on the thing that find_one_by_id got called with! Just think of the possibilities! 😁

The actual validate function for clinicians looks slightly more complex, you can check it out [here](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/clinician/insert/validate.rs). It passes all required repositories in on a struct, which requires boxing. It was implemented this way to ensure this pattern was possible even with many dependent repositories, but to keep your code and tests simpler, I'd recommend avoiding the parent `Repositories` struct until necessary!
