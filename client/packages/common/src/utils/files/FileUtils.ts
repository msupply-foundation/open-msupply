import { Formatter } from '..';

const exportFile = (data: string, type: string, title?: string) => {
  let extension = 'txt';
  switch (type) {
    case 'text/csv':
      extension = 'csv';
      break;
  }

  const today = Formatter.naiveDate(new Date());
  const filename = `${title || 'export'}_${today}.${extension}`;
  const blob = new Blob([data], { type: `${type};charset=utf-8;` });
  const link = document.createElement('a');

  // Browsers that support HTML5 download attribute
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const FileUtils = {
  exportCSV: (data: string, title: string) =>
    exportFile(data, 'text/csv', title),
};
