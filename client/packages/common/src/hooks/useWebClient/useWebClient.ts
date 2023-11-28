export const useWebClient = () => {
  const saveFile = ({
    fileName,
    fileContent,
  }: {
    fileName: string;
    fileContent: string;
  }) => {
    const fileData = JSON.stringify({ name: fileName, content: fileContent });
    const blob = new Blob([fileData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'user-info.json';
    link.href = url;
    link.click();
  };

  return {
    saveFile,
  };
};
