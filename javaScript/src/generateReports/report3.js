import { endOfReportMessage } from "./assist.js";
import { displayToCMD } from "./assist.js";
import { currencyFormat } from "./assist.js";
import { round } from "./assist.js";
import { exportToCSV } from "./assist.js"; 

export function report3(data){
    console.log("Report 3: Annual Project Type Cost Overrun Trends\n\n" +
                "Annual Project Type Cost Overrun Trends\n" +
                "(Grouped by FundingYear and TypeOfWork)\n"
    );
    
    try{   
        const header = ["FundingYear", "TypeOfWork", "TotalProjects", "AvgSavings", "OverrunRate", "YoYChange"];

        // step 1: Group data by FundingYear and TypeOfWork
        const newData = data.reduce((acc, row) => {
            const key = `${row.FundingYear}||${row.TypeOfWork}`;
            if (!acc[key]) {
                acc[key] = {
                    FundingYear: row.FundingYear,
                    TypeOfWork: row.TypeOfWork,
                    TotalProjects: 0,
                    TotalSavings: 0,
                    noOfSavings: 0,
                    TotalCost: 0
                };
            }
            return acc;
        }, {});

        // step 2: Aggregate values for each FundingYear and TypeOfWork
        data.forEach(row => {
            const key = `${row.FundingYear}||${row.TypeOfWork}`;
            if (newData[key]) {
                newData[key].TotalProjects++;
                newData[key].TotalSavings += parseFloat(row.CostSavings) || 0;
                newData[key].noOfSavings += (parseFloat(row.CostSavings) > 0) ? 1 : 0;  // Fixed: Use CostSavings instead of Savings
                newData[key].TotalCost += parseFloat(row.ContractCost) || 0;
            }
        });
        
        // step 3: Calculate derived metrics
        Object.values(newData).forEach(group => {
            // Fix for Problem 2: Handle NaN in AvgSavings
            group.AvgSavings = group.noOfSavings > 0 ? group.TotalSavings / group.noOfSavings : 0;
            
            // OverrunRate: Savings rate as a percentage (TotalSavings / TotalCost * 100, or 0 if no cost)
            group.OverrunRate = group.TotalCost > 0 ? (group.TotalSavings / group.TotalCost) * 100 : 0;
            
            // Fix for Problem 3: YoYChange with string FundingYear (convert to number for comparison)
            const prevGroup = Object.values(newData).find(g => Number(g.FundingYear) < Number(group.FundingYear) && g.TypeOfWork === group.TypeOfWork);
            group.YoYChange = prevGroup && prevGroup.TotalCost > 0 ? ((group.TotalCost - prevGroup.TotalCost) / prevGroup.TotalCost) * 100 : 0;
        });

        // step 4: sort by FundingYear Asc, then by AvgSavings desc
        // Fix for Problem 4 (via Problem 3): Convert FundingYear to number for sorting
        const sortedData = Object.values(newData).sort((a, b) => {
            const yearA = Number(a.FundingYear), yearB = Number(b.FundingYear);
            if (yearA !== yearB) {
                return yearA - yearB;
            }
            return b.AvgSavings - a.AvgSavings;
        });

        const displayData = sortedData.map(group => ({
            FundingYear: group.FundingYear,
            TypeOfWork: group.TypeOfWork,
            TotalProjects: group.TotalProjects,
            AvgSavings: currencyFormat(group.AvgSavings),
            OverrunRate: round(group.OverrunRate),
            YoYChange: round(group.YoYChange)
        }));

        displayToCMD(header, displayData);
        exportToCSV("report3_annual_trends", header, displayData);
    } catch (error){
        console.log("Error generating Report 2: " + error.message);
    }    
    endOfReportMessage("report3_annual_trends");
}
