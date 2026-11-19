# Russian (`ru`) translation guide

Read by the `translate` skill before drafting Russian.

**There is no team glossary for Russian yet.** Everything below is taken from the catalog itself
(`locales/ru/common.json`, 2,208 strings paired with `locales/en/common.json` by key), counted
with a script, not from general knowledge. When a Russian-speaking reviewer settles a term, record
it here; their word wins over a count.

## House style taken from the catalog

- **Formal _вы_** throughout: 81 strings use _вы/вас/вам/ваш…_, none use _ты_ or its forms.
  Requests are imperative plural (_Выберите…_, _Нажмите…_: 115 strings), often with
  _Пожалуйста, …_ (26 strings).
- **Buttons use the infinitive**: of 118 `button.` strings, 84 start with an infinitive
  (_Добавить_, _Распределить_, _Скачать_), 1 with an imperative (`button.acknowledge`
  _Нажмите, чтобы…_); the rest are nouns or adjective phrases (_Назад_, _Новый актив_).
- **Sentence case**: of the short multi-word labels, headings and buttons, 462 are in sentence
  case and 127 in Title Case (_Скачать Базу Данных_). Write sentence case.
- **_е_ rather than _ё_**: only 16 strings use _ё_; _отчет_ 20 vs _отчёт_ 3, _удаленн-_ and
  _обновленн-_ only with _е_. Write _е_.
- **No space before `:`** (68 strings with `x:`, none with `x :`).
- **Quotes**: straight single quotes around UI names (_'Черновик'_, 45 strings) are the
  majority; «ёлочки» appear in 7. See open questions.
- **Error openings**: "Unable to …" is _Невозможно …_ (33) more often than _Не удалось …_ (11);
  "Failed to …" and "Couldn't …" are _Не удалось …_ (17 and 5).
- **Plural keys**: the catalog has 83 plural sets, each with `_one`, `_few` and `_many` and no
  `_other`. Where the tooling asks for `_other` (fractional numbers, _1,5 таблицы_), fill it with
  the genitive singular, which is usually the `_few` form.

### Abbreviations the catalog uses

Shorten only where the usage is a column header, chip or tight label; write words in full in
sentences.

- _Кол-во_ for количество (9 strings, e.g. `label.unit-quantity` _Кол-во единиц_).
- _стр_ for страница, once (`label.rows-per-page` _Строк на стр:_).
- _№_ for "number"/"#" (`messages.confirm-delete-stocktake`).
- _ОК_ in Cyrillic (12 strings).
- Domain acronyms are introduced with their expansion: _МЗ_ (Месячный Запас), _УСД_, _ЖВНВ_,
  _АТХ_; also _ИКВ_ (VVM, 10), _ЗВН_ (SOH, 1).
- File formats and products stay in Latin: _Excel_, _CSV_, _JSON_.

No other abbreviations (_ед._, _шт._, _мес._) appear in the catalog.

## Glossary

Counts are Russian renderings among the strings whose English contains the term.

| English                  | Russian                                       | Count / notes                                                                                    |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| import                   | импорт / импортировать                        | 27 of 27                                                                                         |
| export                   | экспорт / экспортировать                      | 4 of 4                                                                                           |
| upload                   | загрузить / загрузка                          | 15 of 17                                                                                         |
| download                 | скачать                                       | 6 of 8; _загрузить_ in 2 (see open questions)                                                    |
| file                     | файл                                          | 14 of 14                                                                                         |
| row                      | строка                                        | 11 of 13; _ряд_ in 2                                                                             |
| line (document line)     | строка                                        | 95 of 125; _линия_ 22, _позиция_ 3                                                               |
| column                   | столбец                                       | 2 of 3; _колонка_ 1                                                                              |
| sheet (Excel worksheet)  | лист                                          | 1 (_Лист инвентаризации_); _ведомость_ 1 is a printed report; _лист_ is Excel's own term         |
| workbook                 | книга Excel                                   | no catalog evidence; Excel's own Russian term                                                    |
| table                    | таблица                                       | 1 of 1                                                                                           |
| record (generic)         | запись                                        | 12; _рецепт_ (14) only for "dispensing record"                                                   |
| unit                     | единица                                       | 36 of 42 (the rest use the `{{unit}}` token)                                                     |
| item                     | товар                                         | 112 of 125; _предмет_, _элемент_, _препарат_ 1 each                                              |
| location                 | локация                                       | 22 of 33; _место/местоположение_ 9, mostly geolocation                                           |
| location type            | тип холодильного склада                       | 2 of 2 (`label.location-type(s)`); see open questions                                            |
| user                     | пользователь                                  | 10 of 10                                                                                         |
| preview                  | предварительный просмотр                      | no catalog evidence                                                                              |
| change (noun / verb)     | изменение / изменить                          | 42 of 51; _сменить_ 3 (server, location, campaign)                                               |
| new                      | новый (status); _Добавить_ on "New …" buttons | _нов-_ 65, _добав-_ 16                                                                           |
| updated                  | обновлено                                     | 13 of 15; _изменено_ 1                                                                           |
| deleted                  | удалено                                       | 35 of 35                                                                                         |
| unchanged                | без изменений                                 | no catalog evidence                                                                              |
| error                    | ошибка                                        | 33 of 37 (the rest put the `{{error}}` token after a colon)                                      |
| problem                  | проблема                                      | 5 of 5 (_ошибка_ also in 2 of them)                                                              |
| filter                   | фильтр                                        | 13 of 14                                                                                         |
| search                   | поиск                                         | 18 of 19                                                                                         |
| status                   | статус                                        | 63 of 66                                                                                         |
| total                    | depends on use                                | _общий_ 18 (total cost/quantity), _итого_ 10 (a sum line), _всего_ 8 (counts), _сумма_ 4 (money) |
| name (of a thing)        | наименование                                  | 16 of 41; _имя_ 11, _название_ 6 (see open questions)                                            |
| contains (search filter) | содержит                                      | 3 of 3                                                                                           |
| confirm                  | подтвердить                                   | 19 of 20                                                                                         |
| choose / select          | выбрать / выберите                            | 41 of 46                                                                                         |
| clear (filter)           | очистить                                      | 2 of 2                                                                                           |

## Open questions

- **download: _скачать_ vs _загрузить_.** _Скачать_ is the majority (6). _Загрузить_ is used for
  a download in `messages.import-error-assets`, where it reads as "upload", the word's majority meaning (15). Drafts use _скачать_ for download only.
- **row: _строка_ vs _ряд_.** `label.new-row` _Новый Ряд_ and `error.provide-reason` _…всех
  рядов…_ use _ряд_; the other 11 use _строка_.
- **line: _строка_ vs _линия_.** 22 strings say _линия_ (`button.outstanding-lines` _Невыполненные
  Линии_, `button.upload-purchase-order-lines` _Импортировать линии_); _строка_ is the majority.
- **column: _столбец_ vs _колонка_.** `table.show-columns` _Показать / скрыть колонки_ uses
  _колонка_; the two report help texts use _столбец_, which is also Excel's term.
- **name: _наименование_ vs _имя_ vs _название_.** _Наименование_ (16) is the majority and the
  usual word for an item's name; _имя_ (11) is used for people and in
  `label.code-or-name-contains` _Код или имя содержит_; _название_ (6) for courses and variants.
- **location type = _тип холодильного склада_.** Narrower than the English (a location type
  need not be cold storage). It may be deliberate, since location types mostly describe cold
  storage; a reviewer should confirm.
- **Quotes:** straight single quotes (45) vs «» (7). Drafts follow the majority.
- **Title Case:** 127 labels capitalise every word (_Новый Заказ на Закупку_); the majority
  doesn't.

## Likely errors in existing translations

Found while seeding this guide. The skill doesn't fix these.

- `label.units` = _Единиц_ (genitive); as a table name it should be _Единицы_.
- `label.active` = _Активно_ but `label.inactive` = _Неактивный_: the pair disagree in gender
  and appear side by side in status filters.
- `label.search` has no Russian translation.
- `messages.import-error-on-upload` ends _…и перезапустите_ ("restart") for "re-upload".
- `label.refused` = _Отказался_ ("he refused"), not a status.
