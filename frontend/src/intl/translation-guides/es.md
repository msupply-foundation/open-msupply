# Spanish (`es`) translation guide

Read by the `translate` skill before drafting Spanish.

**No team glossary exists yet for Spanish.** Everything below is taken from the current
catalog (`locales/es/common.json`, 1,805 keys, 1,700 of them paired with a current English
key), counted by script, not from general knowledge. When the Spanish-speaking PMs write a
glossary, it takes precedence over this file; fix this file to match it.

## House style taken from the catalog

- **Informal _tú_** throughout. 112 strings use _tú_ forms (_tu/tus/te_, _tienes_, _puedes_,
  _estás_, _haz clic_, _selecciona_, _intenta_); 12 use _usted_ forms (_su_, _haga clic_,
  _ingrese_, _¿Está seguro?_), mostly older auth and search strings
  (`auth.timeout-message`, `heading.are-you-sure`, `control.search.below-min-chars`). Write
  instructions as tú imperatives: _Selecciona el archivo de nuevo_.
- **Buttons use the infinitive**: 83 of 107 `button.` strings start with an infinitive
  (_Descargar_, _Importar_, _Crear envío_, _Cambiar ubicación_); one uses an imperative
  (`button.acknowledge` _Presiona…_); the rest are nouns (_Nueva Entrada_, _Historial_).
- **Sentence case** for short labels: 360 short `button./label./heading./table.` strings
  capitalise only the first word, 95 capitalise every word (_Agregar Artículo_, _Nuevo
  Activo_). Write sentence case.
- **Errors**: "Unable to …" is _No se puede …_ (30 strings; _No se pudo_ 3, _No es posible_
  4). "Couldn't / Could not …" is _No se pudo …_ (4).
- **Plurals**: `_many` repeats `_other` in all 61 existing plural sets.

## Shortened forms already in the catalog

The catalog writes Spanish words in full. It has no dotted Spanish abbreviations (no _Cant._,
_Ref._, _Nº_): English short forms are expanded (`label.qty-item-name` _Cantidad/Nombre del
artículo_, `report.our-ref` _Nuestra referencia_, `label.customer-soh` "avail." →
_disponible_). What it does keep:

- English acronyms, untranslated: _ID_ (21 strings), _AMC_ (17), _MOS_ (13), _OK_ (12),
  _CCE_ (7), _SOH_ (6), plus _URL_, _API_, _CSV_, _UTC_.
- _#_ for "number" next to a value (9 strings: _Dosis #_, _Prescripción #{{number}}_).
- The keyboard label _Bloq Mayús_ (`warning.caps-lock`).

Don't introduce new abbreviations; where space is tight, choose a shorter word.

## Glossary

Counts are Spanish renderings in strings whose English contains the term.

| English                   | Spanish                        | Count                          | Notes                                                            |
| ------------------------- | ------------------------------ | ------------------------------ | ---------------------------------------------------------------- |
| import (verb / noun)      | importar / importación         | 22 of 22                       |                                                                  |
| export                    | exportar                       | 4 of 4                         |                                                                  |
| upload                    | cargar                         | 7 keys                         | vs _subir_ 4 keys; see open questions                            |
| download                  | descargar                      | 8 of 8                         |                                                                  |
| file                      | archivo                        | 11 of 11                       | never _fichero_                                                  |
| row                       | fila                           | 12 of 12                       |                                                                  |
| column                    | columna                        | 3 of 3                         |                                                                  |
| sheet (worksheet)         | hoja                           | 2 of 2                         |                                                                  |
| table                     | tabla                          | —                              | no existing string; _tabla_ is the only usual word               |
| record (generic data row) | registro                       | 10                             | _prescripción_ (11) is "dispensing record", not generic          |
| unit                      | unidad                         | 27                             | `label.units` _Unidades_                                         |
| item                      | artículo                       | 80                             | vs _elemento_ 8; `items` _Artículos_                             |
| location                  | ubicación                      | 25                             |                                                                  |
| location type             | tipo de almacenamiento en frío | 2                              | `label.location-type(s)`; see open questions                     |
| user                      | usuario                        | 10 of 10                       |                                                                  |
| preview                   | vista previa                   | —                              | no existing string                                               |
| change (noun)             | cambio                         | 8                              | vs _modificación_ 1; verb _cambiar_ 10                           |
| new (status)              | nuevo / nueva                  | 53                             | `label.new`, `status.new` _Nuevo_; masculine for generic records |
| updated                   | actualizado / actualizada      | 6                              | agree with the noun; masculine for generic records               |
| deleted                   | eliminado / eliminada          | 44 of 44 (forms of _eliminar_) | never _borrado_                                                  |
| unchanged                 | sin cambios                    | —                              | no existing string                                               |
| error                     | error / errores                | 30 of 31                       |                                                                  |
| problem                   | problema                       | 5 of 5                         | keep distinct from _error_                                       |
| filter                    | filtro                         | 10 of 10                       | clear filter → _Limpiar filtro_                                  |
| search                    | buscar / búsqueda              | 17 of 17                       | "X contains" → _X contiene_ (2 of 2)                             |
| status                    | estado                         | 41 of 45                       |                                                                  |
| total                     | total                          | 23 of 23                       |                                                                  |
| choose / select           | seleccionar                    | 20 of 21                       | vs _escoger_ 1 (`button.choose-file`)                            |

## Open questions for the PMs

- **upload: _cargar_ vs _subir_.** _cargar_ in `label.upload`, `label.upload-files`,
  `heading.upload-cce-documents`, `messages.upload-invite`, `messages.upload-error`,
  `filename.cce`, `filename.cce-failed-uploads`; _subir_ in `button.choose-file`,
  `messages.import-error-on-upload`, `messages.import-warning-on-upload`,
  `messages.no-documents-uploaded`. _cargar_ also means "load" (`error.unable-to-load-data`
  _al cargar los datos_), so _subir_ may read more clearly.
- **choose: _seleccionar_ vs _escoger_.** `button.choose-file` _Escoger archivo para subir_
  is the only _escoger_.
- **item: _artículo_ vs _elemento_.** _elemento_ in `error.no-inbound-items`,
  `error.no-internal-order-items`, `error.no-items-filter-on`,
  `messages.click-to-return-to-item-list`.
- **location type**: `label.location-type` / `label.location-types` say _Tipo(s) de
  almacenamiento en frío_ ("cold-storage type"), while location is _ubicación_ everywhere
  else. _Tipo de ubicación_ would match.
- **deleted: gender.** Status strings agree with their record (`log.invoice-deleted`
  _Eliminado_, `log.prescription-deleted` _Eliminada_); generic rows use the masculine.
- **register**: the 12 _usted_ strings listed above.
- **clear: _limpiar_ vs _borrar_ vs _remover_.** `label.clear-filter` _Limpiar filtro_,
  `label.clear-selection` _Borrar selección_, `label.remove-all-filters` _Remover todos los
  filtros_ (_remover_ is a regionalism; _quitar_ is more neutral).

## Likely errors in existing translations

Found while seeding this guide. The skill doesn't fix these.

- `label.location-type(s)` _Tipo(s) de almacenamiento en frío_: see open questions.
- `messages.mark-as-visited` starts _Estate encuentro_ (typo for _Este_).
- `messages.empty-unallocated-lines_*` _limes de marcador_ (typo for _líneas_).
- `error.snapshot-total-mismatch` starts _EL número_.
- `error.unable-to-save-log` _Nos e puede_; `control.search.error.no-document` _Nop se puede_.
- `messages.deleted-generic_one` _{{count}} eliminado del registro_ ("deleted from the
  record") for "Deleted {{count}} record".
