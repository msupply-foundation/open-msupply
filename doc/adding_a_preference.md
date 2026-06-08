# How to Add a New Preference

This documents the end-to-end steps for adding a preference to open-mSupply, based on the existing pattern used by preferences like `DisableManualReturns` (bool) and `NumberOfMonthsThresholdToShowLowStockAlertsForProducts` (i32).

## Preference Types

| Type | Rust `Value` | GraphQL Input | Frontend Renderer |
|------|-------------|---------------|-------------------|
| Boolean | `bool` | `BoolStorePrefInput` / direct `bool` | Switch toggle |
| Integer | `i32` | `IntegerStorePrefInput` / direct `i32` | NumericTextInput |
| String | `String` | `StringStorePrefInput` / direct `String` | TextInput |
| Colour | `String` | `StringStorePrefInput` | Colour picker |
| Custom | any `Serialize + DeserializeOwned` | custom InputObject | custom component |

## Scope: Global vs Store

- **Global** preferences have no `store_id`. Stored with ID `{key}_global`. Single value across the system.
- **Store** preferences are per-store. Stored with ID `{key}_{store_id}`. GraphQL input is an array of `{ storeId, value }` pairs.

## Steps

### 1. Create the preference struct

Create a new file in `server/service/src/preference/preferences/`:

```rust
// server/service/src/preference/preferences/my_new_preference.rs
use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct MyNewPreference;

impl Preference for MyNewPreference {
    type Value = bool; // or i32, String, custom struct, etc.

    fn key(&self) -> PrefKey {
        PrefKey::MyNewPreference
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store // or PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean // must match Value type
    }
}
```

The default value comes from `Default` trait on the `Value` type (`false` for bool, `0` for i32). Override `fn default_value()` if you need something else.

### 2. Add to PrefKey enum

`server/service/src/preference/types.rs` - add entry under the appropriate section (Global or Store):

```rust
pub enum PrefKey {
    // ...
    MyNewPreference,
}
```

### 3. Register in PreferenceProvider

`server/service/src/preference/preferences/mod.rs` - three places:

```rust
// 1. Module import (top of file)
pub mod my_new_preference;
pub use my_new_preference::*;

// 2. Struct field (in PreferenceProvider)
pub struct PreferenceProvider {
    // ...
    pub my_new_preference: MyNewPreference,
}

// 3. Factory instantiation (in get_preference_provider())
pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        // ...
        my_new_preference: MyNewPreference,
    }
}
```

### 4. Add to preference descriptions query

`server/service/src/preference/mod.rs` - add to the destructuring of `PreferenceProvider` and append to the list:

```rust
// In get_preference_descriptions():
let PreferenceProvider {
    // ...
    my_new_preference,
} = self.get_preference_provider();

// ...
append_if_type(my_new_preference, &mut prefs, &input)?;
```

This makes the preference appear in the admin preferences UI automatically.

### 5. Add to UpsertPreferences

`server/service/src/preference/upsert.rs`:

```rust
// In UpsertPreferences struct:
pub struct UpsertPreferences {
    // For store prefs:
    pub my_new_preference: Option<Vec<StorePrefUpdate<bool>>>,
    // For global prefs:
    // pub my_new_preference: Option<bool>,
}

// In upsert_preferences() - destructuring:
my_new_preference: my_new_preference_input,

// In PreferenceProvider destructuring:
my_new_preference,

// In the transaction body (store pref):
if let Some(input) = my_new_preference_input {
    upsert_store_input(connection, my_new_preference, input)?;
}
// Or for global pref:
// if let Some(input) = my_new_preference_input {
//     my_new_preference.upsert(connection, input, None)?;
// }
```

### 6. Add GraphQL resolver

`server/graphql/types/src/types/preferences.rs`:

```rust
// In PreferencesNode #[Object] impl:
pub async fn my_new_preference(&self) -> Result<bool> {
    self.load_preference(&self.preferences.my_new_preference)
}

// In PreferenceKey enum:
pub enum PreferenceKey {
    // ...
    MyNewPreference,
}
```

### 7. Add GraphQL upsert input

`server/graphql/preference/src/upsert.rs`:

```rust
// In UpsertPreferencesInput:
pub my_new_preference: Option<Vec<BoolStorePrefInput>>, // store
// pub my_new_preference: Option<bool>, // global

// In to_domain() destructuring:
my_new_preference,

// In to_domain() return:
my_new_preference: my_new_preference
    .as_ref()
    .map(|i| i.iter().map(|i| i.to_domain()).collect()),
// For global, just: my_new_preference: *my_new_preference,
```

### 8. Build and generate

```bash
cd server && cargo check
cd client && yarn generate
```

`cargo check` validates Rust. `yarn generate` exports the updated schema and regenerates TypeScript types. The preference will automatically appear in the admin preferences UI with the correct renderer based on `PreferenceValueType`.

### 9. Add translation label

Add to `client/packages/common/src/intl/locales/en/common.json`:

```json
"preference.myNewPreference": "My new preference label"
```

The admin UI looks up the label using `preference.{camelCasedKey}`.

## Reading a preference in Rust service code

```rust
use service::preference::preferences::get_preference_provider;

let prefs = get_preference_provider();
let value = prefs.my_new_preference.load(connection, Some(store_id))?;
```

## Reading a preference in the frontend

Preferences are available via the `storePreferences` query on the store. Example from existing code:

```graphql
query {
  store(id: "...") {
    preferences {
      myNewPreference
    }
  }
}
```

In React, use the existing `useStorePreference` pattern or query the store preferences directly.

## File Checklist

- [ ] `server/service/src/preference/preferences/{name}.rs` - preference struct
- [ ] `server/service/src/preference/types.rs` - PrefKey enum
- [ ] `server/service/src/preference/preferences/mod.rs` - module + provider (3 places)
- [ ] `server/service/src/preference/mod.rs` - descriptions query (2 places)
- [ ] `server/service/src/preference/upsert.rs` - UpsertPreferences struct + logic (3 places)
- [ ] `server/graphql/types/src/types/preferences.rs` - resolver + PreferenceKey enum
- [ ] `server/graphql/preference/src/upsert.rs` - GraphQL input + to_domain (3 places)
- [ ] `client/packages/common/src/intl/locales/en/common.json` - translation label
- [ ] Run `cargo check` + `yarn generate`
