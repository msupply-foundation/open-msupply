/* eslint-disable camelcase */
import knex from 'knex';
import chunk from 'lodash.chunk';
import {
  InvoiceLineData,
  ItemData,
  NameData,
  StoreData,
  StockLineData,
  InvoiceData,
} from './data/data';

const db = knex({
  client: 'sqlite3',
  connection: { filename: './src/omsupply-database.sqlite' },
  useNullAsDefault: true,
});

const delay = () => new Promise(r => setTimeout(r, 5000));

/**
 * This is a simple script to take the mock data in /data and insert into an
 * sqlite database named omsupply-database.sqlite in the src dir.
 *
 */

const main = async () => {
  const items = await db('item').insert(
    ItemData.map(({ id, code, name }) => ({ id, name, code }))
  );

  console.log('-------------------------------------------');
  console.log('items inserted', items);
  console.log('-------------------------------------------');

  await delay();

  const names = await db('name').insert(
    NameData.map(({ id, code, name, isCustomer, isSupplier }) => ({
      id,
      name,
      code,
      is_customer: isCustomer,
      is_supplier: isSupplier,
    }))
  );

  console.log('-------------------------------------------');
  console.log('names inserted', names);
  console.log('-------------------------------------------');

  await delay();

  const stores = await db('store').insert(
    StoreData.map(({ id, code, nameId }) => ({ id, code, name_id: nameId }))
  );

  console.log('-------------------------------------------');
  console.log('stores inserted', stores);
  console.log('-------------------------------------------');

  await delay();

  const stockLines = await Promise.all(
    chunk(StockLineData, 50).map(chunk =>
      db('stock_line').insert(
        chunk.map(
          ({
            itemId,
            storeId,
            totalNumberOfPacks,
            availableNumberOfPacks,
            costPricePerPack,
            sellPricePerPack,
            packSize,
            batch,
            id,
          }) => ({
            batch,
            id,
            item_id: itemId,
            store_id: storeId,
            pack_size: packSize,
            total_number_of_packs: totalNumberOfPacks,
            available_number_of_packs: availableNumberOfPacks,
            cost_price_per_pack: costPricePerPack,
            sell_price_per_pack: sellPricePerPack,
          })
        )
      )
    )
  );

  console.log('-------------------------------------------');
  console.log('stockLines inserted', stockLines);
  console.log('-------------------------------------------');

  await delay();

  const invoices = await Promise.all(
    chunk(InvoiceData, 50).map(chunk =>
      db('invoice').insert(
        chunk.map(
          ({
            id,
            nameId,
            invoiceNumber,
            status,
            entryDatetime,
            allocatedDatetime,
            type,
            comment,
            storeId,
          }) => {
            return {
              id,
              name_id: nameId,
              invoice_number: invoiceNumber,
              status,
              entry_datetime: entryDatetime,
              confirm_datetime: allocatedDatetime,
              type,
              comment,
              store_id: storeId,
            };
          }
        )
      )
    )
  );

  console.log('-------------------------------------------');
  console.log('invoices', invoices);
  console.log('-------------------------------------------');

  await delay();

  const invoiceLines = await Promise.all(
    chunk(InvoiceLineData, 50).map(chunk =>
      db('invoice_line').insert(
        chunk.map(
          ({
            id,
            invoiceId,
            itemId,
            stockLineId,
            itemName,
            itemCode,
            batchName,
            costPricePerPack,
            sellPricePerPack,
            totalAfterTax,
            numberOfPacks,
            packSize,
          }) => {
            return {
              id,
              invoice_id: invoiceId,
              item_id: itemId,
              stock_line_id: stockLineId,
              item_name: itemName,
              item_code: itemCode,
              batch: batchName,
              cost_price_per_pack: costPricePerPack,
              sell_price_per_pack: sellPricePerPack,
              total_after_tax: totalAfterTax,
              number_of_packs: numberOfPacks,
              pack_size: packSize,
            };
          }
        )
      )
    )
  );

  console.log('-------------------------------------------');
  console.log('invoiceLines', invoiceLines);
  console.log('-------------------------------------------');

  await delay();

  console.log('-------------------------------------------');
  console.log('fin');
  console.log('-------------------------------------------');
};

main();
