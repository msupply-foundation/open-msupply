Help with the sync v7 changelog insert performance benchmark tool.

Arguments: $ARGUMENTS (what you want to do: run, seed, add-scenario, results, explain, etc.)

Context:
- The benchmark tool lives in `syncdoc/content/changelog/bench/`
- It tests PostgreSQL insert performance on the changelog table under different PG configs, index strategies, and partition strategies
- Uses Docker to spin up Postgres containers, pre-generated seed dumps for data, and the `plotters` crate for graphs
- See `syncdoc/content/changelog/bench/config.toml` for all scenarios
- Related issue: https://github.com/msupply-foundation/open-msupply/issues/11086
- Related doc: `syncdoc/content/v7.md` (changelog section)

Steps:

1. Read `syncdoc/content/changelog/bench/config.toml` to understand current configuration
2. Based on the user's request ($ARGUMENTS), help with one of:

   **run** — Help run benchmarks
   - Check seeds exist: `cargo run -- --seed-only`
   - Run specific phase: `cargo run -- --phase <1|2|3> -n <values>`
   - Run specific scenario: `cargo run -- -s <name> -n <values>`
   - Full run: `cargo run`

   **seed** — Generate or regenerate seed data
   - Generate missing: `cargo run -- --seed-only`
   - Force regenerate: `cargo run -- --seed-only --reseed -n <values>`

   **add-scenario** — Add a new benchmark scenario
   - Add entry to `config.toml`
   - If new index set needed, add variant to `IndexSet` enum in `src/config.rs` and `index_sql()` in `src/schema.rs`
   - If new partition strategy needed, add to `PartitionConfig` in `src/config.rs`

   **results** — Analyze results
   - Read `results_*/results.json` for raw data
   - Check `results_*/phase*_*/` for generated graphs
   - Help interpret latency numbers

   **explain** — Explain how the tool works
   - Read relevant source files and explain the architecture

3. Always read the relevant source files before making changes
4. Run `cargo test` after any code changes
5. Remind the user to reseed (`--reseed`) if schema changes were made
