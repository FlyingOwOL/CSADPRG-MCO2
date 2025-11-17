import fs from 'fs';  // For file I/O (note: fs is built-in, so no path needed)
import Papa from 'papaparse';  // For CSV parsing
import jsonfile from 'jsonfile';  // ES module import for jsonfile


export function endOfReportMessage(reportName){
    console.log(`(Full table exported to ${reportName}.csv)\n`);
}

export function displayToCMD(tableHeaders, tableData) {
    // Ensure tableData is an array of arrays (convert objects if needed)
    const MAX_CHAR = 19;
    const dataRows = tableData.map(row => 
        Array.isArray(row) ? row : tableHeaders.map(header => row[header] !== undefined && row[header] !== null ? row[header] : '')
    );
    
    // turns excess long strings into truncated strings with "..."
    const prepareString = (str) => {
        const string = String(str);
        return string.length > MAX_CHAR ? string.substring(0, 16) + '...' : string;
    };
    
    // Calculate column widths: max length of prepared strings in each column (headers + data), capped at MAX_CHAR
    const columnWidths = tableHeaders.map((header, colIndex) => {
        const headerLength = prepareString(header).length;
        const maxDataLength = Math.max(...dataRows.map(row => prepareString(row[colIndex] || '').length));
        return Math.min(MAX_CHAR, Math.max(headerLength, maxDataLength));
    });
    
    // Function to pad a string to a specific width
    const padString = (str, width) => prepareString(str).padEnd(width);
    
    // Print header row with leading and trailing "|"
    const headerRow = '|' + tableHeaders.map((header, i) => padString(header, columnWidths[i])).join(' | ') + '|';
    console.log(headerRow);
    
    // Print separator row with dashes, adjusted for "|"
    const separatorRow = '|' + columnWidths.map(width => '-'.repeat(width)).join('-+-') + '|';
    console.log(separatorRow);
    
    // Print each data row with leading and trailing "|"
    dataRows.forEach(row => {
        const dataRow = '|' + row.map((cell, i) => padString(cell, columnWidths[i])).join(' | ') + '|';
        console.log(dataRow);
    });
    console.log(""); // Extra newline after table
}


export function exportToCSV(reportName, tableHeaders, tableData){
    try{
        const folderLocation = 'javaScript/savedReports/';
        const csv = Papa.unparse({
            fields: tableHeaders,
            data: tableData
        });
        fs.writeFileSync(folderLocation + reportName + '.csv', csv);
    } catch (error){
        console.log("Error exporting to CSV: " + error.message);
    }
}

export function round(value) {
    return Math.round(value * 100) / 100;
}

export function currencyFormat(value) {
    const formattedValue = new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
    return formattedValue;
}

export function efficiencyScore(rawScore, min, max) {
    return ((rawScore - min) / (max - min)) * 100;
}

export function reliabilityIndex(avgDelay, totalSavings, totalCost) {
   return (1 - (avgDelay / 90)) * (totalSavings / totalCost) * 100;
}

export function generateJSON(data){
    try{
        const filepath = 'javaScript/savedReports/summary.json';

        jsonfile.writeFileSync(filepath,  data, { spaces: 2 });
    } catch (error){
        console.log("Error exporting to JSON: " + error.message);
    }    
}