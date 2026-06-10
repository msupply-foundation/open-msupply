// Command loadseed creates+migrates a SQLite DB and seeds N invoices for load testing.
// Usage: go run ./cmd/loadseed -db loadtest.sqlite -n 5000
package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/migrations"
)

func main() {
	dbPath := flag.String("db", "loadtest.sqlite", "SQLite path")
	n := flag.Int("n", 5000, "number of invoices to seed")
	flag.Parse()

	conn, err := db.OpenSQLite(*dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()
	if _, err := migrations.Migrate(conn, db.SQLite, migrations.Registry(), nil); err != nil {
		log.Fatal(err)
	}

	mustExec := func(q string, args ...any) {
		if _, err := conn.Exec(q, args...); err != nil {
			log.Fatalf("%s: %v", q, err)
		}
	}
	// 10 names + links, one store.
	for i := 0; i < 10; i++ {
		mustExec(`INSERT INTO name (id,name,code,is_customer,is_supplier,type) VALUES (?,?,?,?,?,?)`,
			fmt.Sprintf("name-%d", i), fmt.Sprintf("Party %d", i), fmt.Sprintf("P%d", i), true, false, "FACILITY")
		mustExec(`INSERT INTO name_link (id,name_id) VALUES (?,?)`, fmt.Sprintf("link-%d", i), fmt.Sprintf("name-%d", i))
	}
	mustExec(`INSERT INTO store (id,code,site_id,name_link_id) VALUES (?,?,?,?)`, "store-1", "S1", 1, "link-0")

	statuses := []string{"NEW", "ALLOCATED", "PICKED", "SHIPPED", "VERIFIED"}
	types := []string{"OUTBOUND_SHIPMENT", "INBOUND_SHIPMENT"}
	tx, err := conn.Begin()
	if err != nil {
		log.Fatal(err)
	}
	stmt, err := tx.Prepare(`INSERT INTO invoice (id,store_id,invoice_number,on_hold,created_datetime,name_link_id,status,type)
	                         VALUES (?,?,?,?,?,?,?,?)`)
	if err != nil {
		log.Fatal(err)
	}
	for i := 0; i < *n; i++ {
		_, err := stmt.Exec(
			fmt.Sprintf("inv-%d", i), "store-1", i+1, false,
			fmt.Sprintf("2024-01-01T%02d:%02d:00", i/60%24, i%60),
			fmt.Sprintf("link-%d", i%10), statuses[i%len(statuses)], types[i%len(types)],
		)
		if err != nil {
			log.Fatal(err)
		}
	}
	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}
	log.Printf("seeded %d invoices into %s", *n, *dbPath)
}
