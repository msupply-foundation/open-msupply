# Layers

Most of the source code in this repository is split into tree layers.
These layers are the repository layer, the service layer, and the API layer.
There are a couple of advantages to maintain these three layers.
For example, the repository layer decouples the business logic from database details.
Similarly, the business logic in the service layer is independent of the API layer, e.g. a single service can be used for Graphql or Rest endpoints.
This architecture is very similar to the so-called "clean architecture" in domain driven design.

The three layers should not have any circular dependencies.
For example, the repository layer can be used by the service layer or the API layer while the service layer can only be used by the API layer.
This is enforced by putting the layers in separate Rust crates which can't have circular dependencies either.

## Repository Layer

The repository layer provides an abstraction over the used database.
For example, entities returned from the repository layer look the same for Postgres and Sqlite.
This database abstraction should be as small as possible, e.g. instead of adding specific queries for specific use-cases, existing query method should be reused where possible.

Furthermore, the repository layer keeps the service logic decoupled from database schema changes.
For example, a table schema change should only affect the repository that uses the changed table.
This can be achieved by mapping the data returned from the database to a "domain object" which is database independent.
For example, rows from the mSupply tables `name` and `item` are not referenced directly by their `id` but joined via a link table to allow name and item merges.
While the database row may look like:

```rust
struct MyDieselRow {
   ...
   name_link_id
}
```

the domain object should only contain the information used in the business logic, i.e. the `name_id` instead of the internal `name_link_id`:

```rust
pub struct MyEntity {
  ...
  name_id
}
```

However, currently this pattern is only followed in a few places.
The reason for this is that for most entities the database object looks exactly like the domain object and for this reason the database object is used as the domain object, i.e. to avoid trivial object mapping.
In this case a simple type def should be used, keeping the internal database struct private:

```rust
pub type MyEntity = MyDieselRow;
```

## Service Layer

The service layer contains the main business logic and uses the repository layer to query or mutate data while enforcing invariants.

Services are implementing a service trait.
The [`ServiceProvider`](service/src/service_provider.rs) struct contains all available services.
The `ServiceProvider` should be used in higher layer, e.g. in GraphQl endpoint to get a service instance.

The `ServiceProvider` allows us to configure which services are used.
This is mainly used for testing purposes where services can easily be swapped out for a mock service.
For example, when testing GraphQL related logic such as data mapping a mock service can be configured to always return the required data for a specific test.

## API Layer

The API layer provides an interface for the server, e.g. GraphQL or REST endpoints used by the browser UI or other users.
The API layer can use one or more services to query or mutate data.
While we mainly use GraphQL for our endpoints it would easily be possible to provide REST endpoints reusing the existing services.

Before doing the service call the API layer calls an auth service to verify that a user is allowed to call the current endpoint.
Note, this auth check could be further moved into service layer.
However, this would either make a service very specific to particular endpoint, i.e. service becomes hard to reuse, or another endpoint specific service would need to be introduced.

# Horizontal and Vertical Layers

The three layers mentioned above are organized in horizontal slices.
This means all repositories are in one Rust crate, all services are in another Rust crate and all GraphQL endpoints are organized in a set of crates.
However, in principle there is no reason why a single feature could not be organized in a vertical slice, i.e. all three layers of a single feature are located in a single crate.
