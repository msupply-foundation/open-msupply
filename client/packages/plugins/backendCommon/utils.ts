const wrapSql = (fields: string[], sqlStatement: string) => {
  if (sql_type() === 'sqlite') {
    return `
            SELECT json_object(${fields.map(field => `'${field}', ${field}`)}) AS json_row 
            FROM (${sqlStatement})
            `;
  }

  if (sql_type() === 'postgres') {
    return `
            SELECT json_agg(inner) AS json_row 
            FROM (${sqlStatement}) AS inner
            `;
  }

  throw new Error('Unknown sql_type');
};

export const sqlQuery = <K extends string>(
  fields: K[],
  sqlStatement: string
): Record<K, any>[] => {
  const adjustedStatement = wrapSql(fields, sqlStatement);
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
export const sqlList = (list: string[]) => '("' + list.join('","') + '")';
export const fromSqlDateTime = (datetime: string) => {
  // Will map '2023-01-01 10:10:10' to UTC '2023-01-01T10:10:10Z'
  return new Date(`${datetime.split(' ').join('T')}Z`);
};
