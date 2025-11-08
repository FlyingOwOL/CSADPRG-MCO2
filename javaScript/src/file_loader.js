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
        if(row['FundingYear'] === '2024' || 
           row['ActualCompletionDate'].startsWith('2024') ||    // only gets the year part of the ISO date
           row['StartDate'].startsWith('2024')){                // only gets the year part of the ISO date  
            
            // Check for empty fields (any value is empty or just whitespace)
            const hasEmptyFields = Object.values(row).some(value => !value || value.trim() === '');
            if (has2024 || hasEmptyFields) {
                invalidRows += 1;
                return false;  
            }
        } 
        countedRows += 1;
        return true;
    });
    validRows = countedRows - invalidRows; 

    console.log(`Processing dataset... (${validRows} rows loaded, ${invalidRows} filtered for 2021-2023)`)
    return newRows; 
}