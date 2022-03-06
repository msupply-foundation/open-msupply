// Disclamer: script is not bulletproof, make sure you commit your changes before running it
// so that script changes to file can be discarded without loosing your work

// Usage: node util/src/to_inline_init.js {filepath} {type}
const fs = require("fs");
const { argv } = require("process");

const file_path = argv[2];
const type = argv[3];

const lines = fs.readFileSync(file_path, 'utf-8').split('\n');
let result = [];

// \\"n\\/a\\"\\.to_owned\\(\\) = match '"n/a".to_string()'
let defaults = ['None', 'false', '0', '0.0', '\\"n\\/a\\"\\.to_owned\\(\\)']

// (?<!(struct|->) ) = no strarting with `struct ` or '-> '
const findStartRegex = `(?<!(struct|->) )${type} {`;

const process = () => {
    for (let current_line_index = 0; current_line_index < lines.length; current_line_index++) {
        const current_line = lines[current_line_index];

        const match = current_line.match(new RegExp(findStartRegex));
        const foundStart = match?.length > 0;

        if (foundStart) {
            const { replacements, next_index } = replace(current_line_index, match)
            current_line_index = next_index;

            result = result.concat(replacements);
            continue
        }

        result.push(current_line);
    }

    return result;
}

const replace = (start_index, startMatch) => {
    let changedResult = [];
    let notChangedResult = [];

    const findEndRegex = `^[ ]+}`;
    const findFalseEndRegex = `^[ ]+}: `;
    let firstLine = lines[start_index];
    const startOfFieldRegex = `^[ ]+[\\w_#]+:`;

    changedResult.push(firstLine.replace(startMatch[0], `inline_init(|r: &mut ${type}|{`))
    notChangedResult.push(firstLine)

    let first_line = true;
    for (let current_line_index = start_index + 1; current_line_index < lines.length; current_line_index++) {
        const current_line = lines[current_line_index];
        notChangedResult.push(current_line);

        let matchEndRegex = current_line.match(new RegExp(findEndRegex));
        const foundEnd = matchEndRegex?.length > 0;
        let matchFalseEndRegex = current_line.match(new RegExp(findFalseEndRegex));
        const foundFalseEnd = matchFalseEndRegex?.length > 0;

        if (foundFalseEnd) {
            return { replacements: notChangedResult, next_index: current_line_index };
        }

        if (foundEnd) {
            if (!first_line) {
                let lastIndex = changedResult.length - 1
                changedResult[lastIndex] = `${changedResult[lastIndex].slice(0, -1)};`
            }
            changedResult.push(current_line.replace(new RegExp(findEndRegex), '})'));
            return { replacements: changedResult, next_index: current_line_index };
        }

        let startOfFieldOriginalMatch = current_line.match(new RegExp(startOfFieldRegex));
        let foundStartOfField = startOfFieldOriginalMatch?.length > 0;

        let changed_line = current_line;
        if (foundStartOfField) {
            let startOfFieldOriginal = startOfFieldOriginalMatch[0]

            let startOfField = startOfFieldOriginal.slice(0, -1)
            changed_line = current_line.replace(startOfFieldOriginal, `r.${startOfField} = `);

            if (!first_line) {
                let lastIndex = changedResult.length - 1
                changedResult[lastIndex] = `${changedResult[lastIndex].slice(0, -1)};`
            }
        }

        let endsWithDefault = defaults.some(d => {
            const endsWithDefautlMatch = current_line.match(new RegExp(` ${d},$`));
            return endsWithDefautlMatch?.length > 0;
        });


        if (!endsWithDefault) {
            changedResult.push(changed_line);
        }
        first_line = false;
    }

    return { replacements: [firstLine], next_index: start_index };
}
// console.log(process().join('\n'))
fs.writeFileSync(file_path, process().join('\n'))
