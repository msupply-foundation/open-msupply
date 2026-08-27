export interface Option {
  id: string;
  text: string;
  expansion: string;
}

export const getPrescriptionDirections = (input: string, options: Option[]) => {
  const output = input.split(' ');
  const matchedString = output.map(output => {
    const match = options.find(
      option => option.text.toLowerCase() === output.toLowerCase()
    );
    return match ? match.expansion : output;
  });
  return matchedString.join(' ');
};
