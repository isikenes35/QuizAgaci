const fs = require('fs');

let hostFile = 'frontend/src/pages/HostGamePage.tsx';
let hostText = fs.readFileSync(hostFile, 'utf8');

hostText = hostText.replace(/const handleExportCSV = \(\) => {[\s\S]*?};\n/g, '');

fs.writeFileSync(hostFile, hostText);

let utilsFile = 'frontend/src/utils/caseConverter.ts';
if (fs.existsSync(utilsFile)) {
    let utilText = fs.readFileSync(utilsFile, 'utf8');
    utilText = utilText.replace(/export type CamelCase\S[\s\S]*?};\n/g, '');
    fs.writeFileSync(utilsFile, utilText);
}
