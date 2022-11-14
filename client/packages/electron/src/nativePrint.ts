import { BrowserWindow } from 'electron';

export const nativePrint = async (html: string) => {
  const data = await convertToPdf(html);

  let urlData = `data:application/pdf;base64,${Buffer.from(data).toString(
    'base64'
  )}`;

  const previewWindow = new BrowserWindow({
    title: 'Print Preview',
    show: true,
  });
  previewWindow.on('page-title-updated', function (e) {
    e.preventDefault();
  });
  await previewWindow.loadURL(urlData);
};

const convertToPdf = async (html: string) => {
  const convertToPdfWindow = new BrowserWindow({
    title: 'convertToPdfWindow',
    show: false,
  });

  var urlData = `data:text/html;charset=UTF-8,'<!DOCTYPE html>${encodeURIComponent(
    html
  )}`;
  await convertToPdfWindow.loadURL(urlData);

  const printOptions = {};
  return await convertToPdfWindow.webContents.printToPDF(printOptions);
};
