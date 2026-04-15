# Prompts

A record of the prompts used while building the sync buffer benchmark scripts
(`bench_sync_buffer.py`, `plot_sync_buffer.py`, `bench_config.json`, `README.md`).

---

## 1. Initial refactor

> I want to refactor sync_buffer bench scripts to:
>
> Do insert operations rathern the upsert, sync buffer can use auto increment cursor as primary key rather then using record_id.
>
> ### Create config file where I can add global config and scenarios to test
>
> #### There is global config which includes
>
> - Number of records to insert before benchmark is started
> - Batch size of bench inserts and number of iterations for those inserts, result of each iteration would need to be recorded to csv file as often as possible
> - Number of times to run the queries, result of each query iteration should be recorded as often as possible
> - Max number of minutes to run each bench
> - Max number of records to run the test for
> - Number of records to have in sync buffer with is_integrated status after bench is finished, this would require in a single transaction to set is_integrate to true and integration_datetime to now.
>
> Each bench results should record number of records in the table at the time of bench start.
>
> #### Each scenarios should have
>
> - A name
> - A type, there are three types
>    - Basic, with no partitioning
>    - Basis partitioning by is_integrated, with indexes on both tables
>    - Partitioning by is_integrated, with indexes only on is_integrated = true partition
>    - Partitioning by is_integrated = false and cursor, and just is_integrated = true, with parameter to say how many cursors to have in each partition, these will be pre-created when scenario start
>
> The plot generation script should be able to take multiple csv files as a result when making graphs, it should generate a graph for individual scenarios and for scenarios combined, and charts are further split by, inserts, query and update speed.
>
> At the start of each scenario table will be dropped and re-created.
>
> #### Other
>
> Action can be changed to just be a boolean, which does not require indexes, since there are only 2 possible values.
>
> Indexes should be made to just support one query: "SELECT * FROM sync_buffer where table_name = {} and is_upsert = {} and source_size_id = {} order by received_datetime desc" <- In bench when running this query we don't want to test serialization/deserialization of sync_buffer rows, just the query speed. Also when inserting into sync_buffer row make sure that table_name, source_site_id are evenly spaced, can use generate_series for inserts, offloading records mocking to postgres. When querying should check each table and source_site_id in query.

---

## 2. Keep `record_id` but cursor as PK

> record_id to remain but using cursor as primary key

---

## 3. Rename `target_integrated_after_bench`

> target_integrated_after_bench should be target pending integration after bench

---

## 4. Drop `initial_records`

> why is there initial_records, i want number of record to insert between each benches

---

## 5. Add `insert_between_benches`

> I still want every bench to happen after an interval of inserts, so say i have parameter called insert between benches that would constantly add that number of records in between each bench

---

## 6. How to run

> How do i run the script

---

## 7. Postgres config in JSON, auto-create database

> Config file to include configurations for postgres, database to be created automatically, no need fo schema or keep schema

---

## 8. Try running and fix errors

> try run the bench and fix, once fixed exit test so i can run it locally

---

## 9. Add logging

> can you add some logging, i can just seet Starting scenario

---

## 10. Why it stopped

> It's stopped ast astarting basic why ?

---

## 11. Query filter

> One other thing for query, it should only query for is_integrated = false

---

## 12. List / kill python commands

> how do i see all python command and kill them

---

## 13. Keep caffeinated

> how do i keep cafeniated

---

## 14. Inline SQL, remove helpers

> You have indexes by scenario defined in a helper method, it's hard to read, i want all indexes in creation scripts, similar for any other sqls apart from partitioning table creations, even for those as much inline sql as possible

---

## 15. Basic also indexed

> basic test should also have indexes

---

## 16. Global index on pending partition

> partitioned pending should just be global index for rhat table

---

## 17. Update bench is too slow

> Update bench leaving "" penidng is taking too long, it should be quick operation

---

## 18. Print creation SQL

> print out sql for creation of all 4 scenarios

---

## 19. Swap behaviours for two scenarios

> - partitioned-indexed-true-only should index the false value not the true value
> - and partitioned-pending-cursor should partition by cursor on sync_buffer_done not pending

---

## 20. Stop script when Ctrl+C fails

> how do i stop running script, ctrl + c doesn't work

---

## 21. Insert graph as rows/sec

> can the graphs for inserts show number of records inserted per second

---

## 22. Print creation SQL (again, after rename)

> print out sql for creation of all 4 scenarios

---

## 23. Partition pruning question

> does postgres know that when the query runs on partition-indexed-pending-onlyto only look at pending partition because of value partition
>
> (with attached EXPLAIN plan screenshot showing Bitmap Index Scan on `sync_buffer_pending` using `idx_sb_pending_query`)
>
> is this right:

---

## 24. Pre-generate table names & site ids

> - table_names can be pre generated, can use uuid as long as they are not sequential, have a settings to set how many unique table_names to use
> - source_site_ids are just numbers have a settings to specify how many source_site_ids to use

---

## 25. Generate README

> generate README.md with instructions on how to use the scripts, including how to use on windows to run in detached process using Start-Process, make sure to also include what different scenarios mean as actual sql statement that run to generate the tables and what query is used. Lastly describe the flow of the test itself

---

## 26. This prompt

> Look at all of the prompts i've asked here and add them all to one prompts.md
