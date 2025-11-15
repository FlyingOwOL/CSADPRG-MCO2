export function endOfReportMessage(reportName){
    console.log(`(Full table exported to ${reportName}.csv)\n`);
}

export function displayToCMD(tableheaders, tableData){
    console.table(tableheaders);
}