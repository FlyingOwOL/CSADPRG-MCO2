const fs = require('fs');  // For file I/O
const Papa = require('papaparse');  // For CSV parsing/unparsing


export function loadData(){
    const csvData = fs.readFileSync('data/dpwh_flood_control_projects.csv', 'utf8'); // reads file
    const parsed = Papa.parse(csvData, { header: true });
    
}