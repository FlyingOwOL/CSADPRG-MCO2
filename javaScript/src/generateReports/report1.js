import { endOfReportMessage } from "./assist.js";

export function report1(data){
    console.log("Report 1: Regional Flood Mitigation Efficiency Summary\n" +
                "(Filtered 2021-2023 Projects)\n"
    );
    try{
        const header = ["Region", "MainIsland", "TotalBudget", "MedianSavings", "AvgDelay", "HighDelayPct", "EfficiencyScore"];
    } catch (error){
        console.log("Error generating Report 1: " + error.message);
    }
    endOfReportMessage("report1_regional_summary");
}