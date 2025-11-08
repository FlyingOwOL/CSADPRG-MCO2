import fs from 'fs';  // For file I/O (note: fs is built-in, so no path needed)
import Papa from 'papaparse';  // For CSV parsing   

export function loadData(){
    const csvData = fs.readFileSync('data/dpwh_flood_control_projects.csv', 'utf8'); // reads file
    const parsed = Papa.parse(csvData, { header: true });

    let origRows = parsed.data;

    let newRows;
    let countedRows = 0;
    let validRows = 0;
    let invalidRows = 0;
    // Clean data: remove rows with 2024 in data fields
    newRows = origRows.filter(row => {
        countedRows += 1;
        // Check for empty fields (any value is empty or just whitespace)
        const hasEmptyFields = Object.values(row).some(value => !value || value.trim() === '');
        const has2024 = row['FundingYear'] === '2024' || 
                 (row['ActualCompletionDate'] && row['ActualCompletionDate'].startsWith('2024')) ||  // Check if exists and starts with '2024'
                 (row['StartDate'] && row['StartDate'].startsWith('2024'));                          // Check if exists and starts with '2024'
        if (has2024 || hasEmptyFields) {
            invalidRows += 1;
            return false;  
        }
        return true;
    });
    validRows = countedRows - invalidRows; 

    console.log(`Processing dataset... (${countedRows} rows loaded, ${validRows} filtered for 2021-2023)`)
    const newCSVData = Papa.unparse({
        fields: parsed.meta.fields,  // Array of header names (e.g., ['FundingYear', 'ActualCompletionDate', ...])
        data: newRows                // Your filtered array of objects
    });
    return newCSVData; 
}