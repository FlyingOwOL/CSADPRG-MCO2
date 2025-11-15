import fs from 'fs';  // For file I/O (note: fs is built-in, so no path needed)
import path from 'path';  // For handling file paths
import Papa from 'papaparse';  // For CSV parsing   

export function endOfReportMessage(reportName){
    console.log(`(Full table exported to ${reportName}.csv)\n`);
}

export function displayToCMD(tableheaders, tableData){
    console.table(tableheaders + "\n");
    console.table(tableData);
}

export function exportToCSV(reportName, tableHeaders, tableData){
    try{
        const folderLocation = 'javaScript/savedReports/';
        const csv = Papa.unparse({
            fields: tableHeaders,
            data: tableData
        });
        fs.writeFileSync(folderLocation + reportName + '.csv', csv);

        console.log(`CSV exported to: ${folderLocation + reportName + '.csv'}`);
    } catch (error){
        console.log("Error exporting to CSV: " + error.message);
    }
}