const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/PlayerGamePage.tsx', 'utf8');

code = code.replace(
  /\{\(currentQuestion\.type \|\| currentQuestion\.Type\) === 'OpenEnded' \? \(/g,
  `{String(currentQuestion.type || currentQuestion.Type || '').toLowerCase() === 'openended' ? (`
);

code = code.replace(
  /const isMultiSelect = \(currentQuestion\.type \|\| currentQuestion\.Type\) === 'MultipleSelect';/g,
  `const isMultiSelect = String(currentQuestion.type || currentQuestion.Type || '').toLowerCase() === 'multipleselect';`
);

fs.writeFileSync('frontend/src/pages/PlayerGamePage.tsx', code);
console.log('PlayerGamePage patched');
