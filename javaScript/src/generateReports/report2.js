import { endOfReportMessage } from "./assist.js";

export function report2(data){
    console.log("Report 2: Top Contractors Performance Ranking\n\n" +
                "Top Contractors Performance Ranking\n" +
                "(Top 15 by TotalCost, >=5 projects)\n"
    );
    try{
        const header = ["Rank", "Contractor", "TotalCost", "NumProjects", "AvgDelay", "TotalSavings", "ReliabilityIndex", "RiskFlag"];
    } catch (error){
        console.log("Error generating Report 2: " + error.message);
    }
    endOfReportMessage("report2_contractor_ranking");
}   