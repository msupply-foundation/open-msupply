## Prompts

Used about 3% weekly

```
I want to add a new field to stock_line, manufacturer_id, it should use the name_link pattern as it will link to name, it's optional field. The task you will need to perform:
* Adding the new field to stock_line, adding migration for the new field
* Add sync translations for the new field
* Whenever stock_line is added this new field should be specified in graphql
* When stock_line is created from things like invoice_line, those types shoudl also have manufacturer_id and populate stock_line with manufacturer_id where appropriate, also add migrations that are needed
* In front end this will also need to be added whenever stock_line is displayed or edited, including when stock line will be added by things like invoice_line
* In front end the selection for manufacturer can be the same as in item variant configuration
````

```
use yarn generate to align types from backend api to front end typescripts
```

```
Make manufacturer input behaviour similar to campaign and program input behaviour. Add manufacturer to stock list view.
```