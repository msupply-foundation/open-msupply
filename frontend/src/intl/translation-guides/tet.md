# Tetum (`tet`) translation guide

Read by the `translate` skill before drafting Tetum (as used in Timor-Leste).

**No team glossary exists yet for Tetum.** Nobody on the team has supplied rules or a word list,
so this guide is seeded from the catalog itself: every claim below was counted with a script over
`frontend/src/intl/locales/tet/common.json`, paired with `en/common.json` by key. When a Tetum
reviewer supplies a glossary, it takes precedence and this file should be fixed to match it.

The catalog is small: 589 keys, 566 of them translated (23 are still identical to English). Counts
below are numbers of translated keys, so small totals mean thin evidence.

## House style

- **Address the user as _Ita_** (20 strings), never _o_ (0) or _imi_ (0). _Ita bo'ot_ appears
  once (`auth.timeout-message`). Possessive is _ita nia_ (`description.our-soh`).
- **Requests use _Favor …_** (5 strings, e.g. `error.site-auth-timeout`); there is no _por favor_
  or _halo favor_. Plain instructions use the bare verb: _Klik OK atu …_, _Koko troka …_.
- **Buttons are a bare verb** (24 of 30 translated buttons start with one: _Aumenta_, _Kria_,
  _Hili_, _Salva_, _Konfirma_, _Exporta_). The other 6 are nouns (_Remessa foun_, _Lingua_). No
  button uses _Ita_ or _Favor_.
- **Status words** are mostly verb + _ona_: _Aloka Ona_, _Entrega Ona_, _Finaliza Ona_,
  _Manda Ona_, _Hili tiha ona_ (6), against the Portuguese participle _Konfirmadu_, _Verifikadu_ (2).
- **Sentence case** is the slight majority for multi-word labels, headings and buttons (93 vs 81
  with every word capitalised). Follow the English, which is sentence case.
- **Spelling** follows the catalog, not the INL standard where they differ:
  - _ne'ebe_ (58), never _ne'ebé_ (0);
  - _ida ne'e_ (25) over _ida-ne'e_ (2);
  - _labele_ (20) over _la bele_ (3); _laiha_ (22) over _la iha_ (8);
  - _husi_ (29), never _hosi_ (0); _wainhira_ (5) over _bainhira_ (2); _mak_ (8) over _maka_ (2).
- **Numbers with nouns**: the catalog is split, noun before number (19, _Lina {{count}} aloka
  tiha ona_, _Fulan {{count}}_) against number before noun (16, _{{count}} item ne'ebe hili_).
  Follow the slight majority and native word order: noun, then number.
- **Plurals of loan nouns** usually take the Portuguese _-s_: _linas_ (17) vs _lina sira_ (2),
  _Items_ (14) vs _item sira_ (2). In `_one`/`_other` pairs, 9 add _-s_ to the `_other` noun,
  5 leave it bare and 3 use _sira_. Use _-s_ on the noun in `_other` forms and plural labels.
- **Number format**: `tet` formats numbers as `en-US` (`locales.ts`: `numberLocale: 'en-US'`), so
  a number written into a string uses a comma for thousands (_100,000_) to match `{{…}}` values.
- **Ellipsis**: three dots `...` (4), not `…` (0).

## Abbreviations

The catalog shortens almost nothing. The only short forms it uses are acronyms kept from English:

- _SOH_ (3: `label.soh`, `label.our-soh`, `label.customer-soh`), _AMC_ (1, `title.amc`), _MOS_ (1),
  _ID_ (9), _OK_ (9), _ATC_ (1), _URL_ (1);
- _Ref_ (1, `label.customer-ref` _Ref Konsumidor_), without a dot.

No dotted Tetum abbreviation (_Kuant._, _Nº_ and the like) appears; write words in full.

## Portuguese loans, Tetum words and English

- **Everyday actions use native Tetum verbs**: _hamos_ delete (25 of 25), _hili_ select/choose
  (18 of 18), _hatudu_ show (13, vs _mostra_ 1), _hadia_ edit (9 of 9), _buka_ search (4 of 4),
  _taka_/_loke_ close/open, _labele_ unable (all 18 _unable/cannot_ strings).
- **Technical nouns and some verbs are Portuguese loans in Tetum spelling** (_k_ for _c/qu_,
  _-saun_ for _-ção_): _aumenta_ add (12, no native _hatama_/_tau_), _salva_ save (9, no _rai_),
  _mudansa/muda_ change (14, vs _troka_ 2), _registu_, _ujuáriu_, _lina_, _koluna_, _unidade_,
  _estatus_, _dadus_, _servedor_, _sinkroniza_, _konfirma_, _atualiza_, _exporta_, _erru_,
  _problema_, _lokalizasaun_, _remessa_, _pedidu_, _kuantidade_.
- **Some product terms stay in English**: _Stock_ (40), _Item(s)_ (30), _Stocktake_ (15),
  _Store_ (8), _Master List_ (6), _Settings_ (5), _Invoice_ (5), _Filter_ (3 of 3), _Log_ (3),
  _Login_ (2).

So: a native verb where the catalog has one, otherwise the Portuguese loan, and the English word
for the product terms listed above.

## Glossary

Counts are catalog strings whose English uses the term, by Tetum rendering. "No evidence" means
the catalog has no string with the term yet; the choice is the drafts' and listed in open
questions.

| English              | Tetum                     | Evidence                                                                            |
| -------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| import (verb / noun) | importa / importasaun     | no evidence; formed like _exporta_                                                  |
| export (verb / noun) | exporta / exportasaun     | _Exporta_ (`button.export`, 1 of 1); keeps the catalog's _x_ (INL spells _esporta_) |
| upload               | upload (English)          | no evidence; follows the catalog's English IT terms (_Login_, _Log_, _Settings_)    |
| download             | download (English)        | no evidence; as upload                                                              |
| file                 | arkivu                    | no evidence for "file"; _arkivu_ appears once, in `label.order-history`             |
| row                  | lina, pl. linas           | 5 of 5; "line" is also _lina_ (36 of 38)                                            |
| column               | koluna                    | 1 of 1 (`table.show-columns`)                                                       |
| sheet (Excel)        | folla                     | no evidence                                                                         |
| table (data)         | tabela                    | no evidence; not _meza_ (furniture)                                                 |
| record               | registu                   | 3 of 4; the fourth (`error.integration-timeout-reached`) leaves it out              |
| unit                 | unidade, pl. unidades     | 7 of 11; the rest say _kuantidade_ for "number of units"                            |
| item                 | Item, pl. Items (English) | 23 of 26                                                                            |
| location type        | Tipo lokalizasaun         | 1 of 1 (`label.location-types`)                                                     |
| user                 | ujuáriu                   | 5 of 5                                                                              |
| preview              | (no settled term)         | no evidence; avoid _previzaun_, which the catalog uses for "forecast"               |
| change (noun / verb) | mudansa / muda            | _mudansa_ 9, _muda_ 5, _troka_ 2 of 21                                              |
| new                  | foun                      | 12 of 14, plus `label.new`, `status.new`                                            |
| updated              | atualiza ona              | _atualiza_ 2 of 2 (one spelt _actualiza_)                                           |
| deleted              | hamos ona                 | _hamos_ 25 of 25                                                                    |
| unchanged            | la muda                   | no evidence                                                                         |
| clear (filter)       | halakon                   | 1 of 1 (`label.clear-filter`)                                                       |
| error                | erru                      | 5 of 7; _sala_ 1, _problema_ 1                                                      |
| problem              | problema                  | 3 of 3                                                                              |
| filter               | Filter (English)          | 3 of 3                                                                              |
| search               | buka                      | 4 of 4                                                                              |
| status               | estatus                   | 9 of 18; English _status_ 5; the rest leave it out                                  |
| total                | total                     | 10 of 10                                                                            |
| count (verb)         | sura                      | _sura_ 2, _konta_ 2                                                                 |
| try again            | koko fila fali            | 2 of 4                                                                              |
| server               | servedor                  | 18 of 18                                                                            |

## Open questions

- **Status vs Estatus**: _estatus_ (9, e.g. `label.status`) vs _status_ kept in English (5:
  `button.save-and-confirm-status`, `info.manual-shipment`, `messages.off-hold-confirmation`).
- **error**: _erru_ (5) vs _sala_ (`auth.alert-title`) vs _problema_ (`error.unable-to-load-data`).
- **change**: _mudansa/muda_ (14) vs _troka_ (`log.stock-batch-change`, `error.no-items-filter-on`).
- **remove**: _hasai_ (16) vs _hamos_ (4, e.g. `messages.confirm-delete-shipment-lines_one`) for
  the same "This will permanently remove …" message.
- **count**: _sura_ (`label.count-this-line`) vs _konta_ (`report.counted-number-of-packs`).
- **row/line spelling**: _lina_ (41) vs Portuguese _linha_ (`label.show-zeroed-lines`); the INL
  spelling _liña_ appears nowhere.
- **Number placement**: noun before number (19) vs number before noun (16), see House style.
- **Plural marking**: Portuguese _-s_ (majority) vs Tetum _sira_ (`messages.select-rows-to-delete-them`,
  `error.no-outbound-items`); a Tetum reviewer may prefer _sira_ or no marker after a numeral.
- **export spelling**: the catalog's _Exporta_ vs the INL standard _esporta_.
- **Status words**: verb + _ona_ (6) vs _-adu_ participles (`label.confirmed`, `label.verified`).
- **Capitalisation**: 81 labels capitalise every word (_Remessa Foun_, _Naran Ujuáriu_).
- **sync**: _sinkroniza_ (6) vs _sinál_ (`error.unknown-sync-error`), which means "signal".
- **user's address**: _Ita_ (20) vs _Ita bo'ot_ (`auth.timeout-message`).

## Likely errors in existing translations

Found while counting. The skill doesn't fix these; they're for a Tetum reviewer.

- `log.stocktake-deleted` = _Remessa hamos ona_ ("shipment deleted") for a stocktake.
- `heading.edit-line` = _Hadia Item_ ("edit item") for "Edit line".
- `label.order-history` = _Arkivu Pedidu_ ("order archive") for "Status history".
- `messages.confirm-delete-lines_*` say _Invoice_ for "prescription".
- `error.unknown-sync-error` = _Erru sinál …_ ("signal error") for "sync error".
- `error.rnr-has-errors` is still English.
- `button.refresh` = _Refesh_, a typo.
