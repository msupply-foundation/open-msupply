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

const downloadFile = async (url: string) => {
  const res = await fetch(url);
  const data = await res.blob();
  const header = res.headers.get('Content-Disposition');
  const filename = header?.match(/filename="(.+)"/)?.[1];
  const a = document.createElement('a');
  a.href = window.URL.createObjectURL(data);
  if (filename) a.download = filename;
  a.click();
  a.remove();
};

export const FileUtils = {
  exportCSV: (data: string, title: string) =>
    exportFile(data, 'text/csv', title),
  downloadFile,
};
