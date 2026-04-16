examine 'check sqlite.sql' and 'check postgres.sql', make changes to both files to count date DOS when previous date balance is 0 and current date balance is 0.

Create setup and data insert in 'check setup sqlite/postgres' files.

Look at days_out_of_stock.rs for example data in comment tables

---

don't try to mimic database in tests, just create those views as tables and created mock data in them

---

create a bash file to run the test, for sqlite just use in memory, for postgres use `psql`, print out results
