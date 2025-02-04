export interface Option {
  id: string;
  name: string;
  direction: string;
}

export const getPrescriptionDirections = (input: string, options: Option[]) => {
  const output = input.split(' ');
  const matchedString = output.map(output => {
    const match = options.find(
      option => option.name.toLowerCase() === output.toLowerCase()
    );
    return match ? match.direction : output;
  });
  return matchedString.join(' ');
};
