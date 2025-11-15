import fs from 'fs';  // For file I/O (note: fs is built-in, so no path needed)
import Papa from 'papaparse';  // For CSV parsing   

export function loadData(){
    const csvData = fs.readFileSync('data/dpwh_flood_control_projects.csv', 'utf8'); // reads file
    const parsed = Papa.parse(csvData, { header: true });

    let origRows = parsed.data;

    let newRows;
    let countedRows = origRows.length - 1; // Exclude header row
    let validRows = 0;
    let invalidRows = 0;

    const allowedYears = ['2021', '2022', '2023'];
    // Clean data: remove rows with 2024 in data fields
    newRows = origRows.filter(row => {
        // Check for empty fields (any value is empty or just whitespace)
        if(Object.values(row).some(value => !value || value.trim() === '')){
            invalidRows += 1;
            return false;
        }

        // Check if FundingYear is not within 2021-2023 range
        if(!allowedYears.includes(row['FundingYear'])){
            invalidRows += 1;
            return false;
        }
        
        // Check if numeric fields are valid numbers
        if(isNaN(parseFloat(row['ApprovedBudgetForContract'])) || isNaN(parseFloat(row['ContractCost']))){
            invalidRows += 1;
            return false;
        }
        
        // Check if valid dates 
        // the new Date() will auto-correct invalid dates like Feb 30 to Mar 2
        const startDate = new Date(row['StartDate']);
        const endDate = new Date(row['ActualCompletionDate']);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate){
            invalidRows += 1;
            return false;
        };
        
        row['CostSavings'] = parseFloat(row['ApprovedBudgetForContract']) - parseFloat(row['ContractCost']);
        row['CompletionDelayDays'] = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));  // Days
        return true;
    });
    validRows = countedRows - invalidRows; 

    const newFields = [...parsed.meta.fields, 'CostSavings', 'CompletionDelayDays'];
    console.log(`Processing dataset... (${countedRows} rows loaded, ${validRows} filtered for 2021-2023)`)
    const newCSVData = Papa.unparse({
        fields: newFields,  // Array of header names (e.g., ['FundingYear', 'ActualCompletionDate', ...])
        data: newRows       // Your filtered array of objects
    });
    return Papa.parse(newCSVData, { header: true });
}