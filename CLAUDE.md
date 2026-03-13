# CLAUDE.md

## Running Tests

Always use `cargo nextest run` to run tests. Do not use `cargo test`.

```bash
# Run all tests (sqlite, the default)
cargo nextest run

# Run all tests with postgres
cargo nextest run --features postgres

# Run a specific test
cargo nextest run <test_name>
```

If cargo-nextest is not installed, install the exact required version:

```bash
cargo install cargo-nextest --locked --version 0.9.121
```
