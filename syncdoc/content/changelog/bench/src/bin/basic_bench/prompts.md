# Prompts used to build basic_bench

All user prompts from the conversation that produced this tool, in order.

---

**1.**
> In the selected text, could Bernoulli be slow ?

*(Selected `generate_random_insert` function from bench.rs lines 107-155)*

**2.**
> I want to create a more basic benchmark, just make it one file, it can be built and run withing the project here but with a different bin description to main.rs, it will have a different config.toml
>
> The bench would have the following logic.
>
> - Re-create changelog table.
> - Add indexes from config.toml.
> - Insert "bench_interval" number of record (defined in config.toml), using the generate series function
> - Insert "bench_batch_size" number of records, "bench_batch_repeat" number of times, capture latencies (for insert method only), using the same 'generate series' method, flush them to output files often.
> - Continue until bench_max_size is reached.
> - Repeate for another scenario (which for now will just have the index definition as a point of difference).
> - At the end create graph, comparing scenarios, with 'number of records inserted per second' on one axis and 'number of records in database' on the other
> - since bench_batch_repeat will have multiple letancies for 'number of recrds in database' each scenario can have three lines (of the same color, with 'average' being dashed and max and min solid)
> - 'number of records in database' on the graphq/chart would refer to number of recrds in database at the end of 'bench_interval'.
>
> Other config settings will include
> - postres connection as per existing config.toml
> - null profile (per scenario), this is applied in sql insert statement, when using 'generate series'

**3.**
> i am running the tests, i want my system to stay awake, on mac, is there something i can do without re-starting the test ?

**4.**
> It's working great, I am running the script and it's taking a long time to finish, I want to generate graphs/charts based on the data that exists right now, can you make cli to generate those graphs. I also want a graphs per scenario and combined graph, both as per previous instructions

**5.**
> Add a setting to chart generation that will remove outliers. Also chart series for 'Rows inserted per second' should be bound by the values

**6.**
> Adjust remote-outlier to only think about a batch when removing values

**7.**
> Atually remove the outlier logic, and just show one line (no min, max and average), this one line would show the average of the fastest % of values (% can be specified in cli, defaults to 50)

**8.**
> Actually do show the fastest also

**9.**
> what does this line say (selected line)

*(Selected `let take = take.max(1).min(sorted.len());` on line 333)*

**10.**
> I am not quite seeing the thin line rendered

**11.**
> I am still not seeing it, run this one and look at output files yourself: cargo run --bin basic_bench -- --generate-charts ./results-basic/results.json  --top-pct 10

**12.**
> great, now lastly is it possible to show the slowest value on the chart

**13.**
> no I mean show the slowest possible value on the chart (like what is the slowest rows inserte per second, single value out of the whole chart

**14.**
> dont' draw the thin slowest batch line, just the thick top-pct and thin fastest batch, the stat that is being drawn that is tht slowest point, should be from the fastest in the batch

**15.**
> For the combined graphs, show slowest point per scenario

**16.**
> can the charts be higher definition

**17.**
> You can split the files now to be better organised, on top of thats:
> - I should be able to combine files in the chart generator
> - I should be able to specify where to output the result files
> - A new scenario parameter to have partitioning, the parameter would specify the size of partition table in terms of number of cursors, partitioning should be by cursor range, and bench would be responsible for adding partition tables when needed
> - Maximum running time for individual scenario can be added to config

**18.**
> When combining files in chart generator, does it matter what bench_interval is used ?

**19.**
> What is the parameter i asked about for max running period ?

**20.**
> make that one minutes

**21.**
> The longest indicator is hidden off the screen, can you make the 'buffer' space for the chart a bit more on the right side

**22.**
> Write a reademe file under bin/basic_bench about the bench and how to use it

**23.**
> max_scenario_secs should be max_scenario_minutes, update in config, code and readme

**24.**
> Do you have access to my prompts ? Can you write them all out for this chat into prompts.md file
