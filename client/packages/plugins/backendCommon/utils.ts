const wrapSql = (fields: string[], sqlStatement: string) => {
  const jsonObjectFunction =
    sql_type() === 'sqlite' ? 'json_object' : 'json_build_object';

  return `
      SELECT ${jsonObjectFunction}(${fields.map(field => `'${field}', ${field}`)}) AS json_row 
      FROM (${sqlStatement})
  `;
};

export const sqlQuery = <K extends string>(
  fields: K[],
  sqlStatement: string
): Record<K, any>[] => {
  const adjustedStatement = wrapSql(fields, sqlStatement);
  // log(adjustedStatement);
  return sql(adjustedStatement) as Record<K, any>[];
};

export const startOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0);
  start.setMinutes(0);
  start.setSeconds(0);
  return start;
};
export const endOfDay = (date: Date) => {
  const end = new Date(date);
  end.setHours(23);
  end.setMinutes(59);
  end.setSeconds(59);
  return end;
};

export const sqlDateTime = (date: Date) =>
  // toJSON will make it utc
  date.toJSON().replace('T', ' ').split('.')[0];
export const localDate = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};
export const sqlList = (list: string[]) => `('${list.join(`','`)}')`;
export const fromSqlDateTime = (datetime: string) => {
  // Will map '2023-01-01 10:10:10' to UTC '2023-01-01T10:10:10Z'
  return new Date(`${datetime.split(' ').join('T')}Z`);
};
