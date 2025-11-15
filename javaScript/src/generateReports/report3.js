import { endOfReportMessage } from "./assist.js";

export function report3(data){
    console.log("Report 3: Annual Project Type Cost Overrun Trends\n\n" +
                "Annual Project Type Cost Overrun Trends\n" +
                "(Grouped by FundingYear and TypeOfWork)\n"
    );
    try{
        const header = ["FundingYear", "TypeOfWork", "TotalProjects", "AvgSavings", "OverrunRate", "YoYChange"];
    } catch (error){
        console.log("Error generating Report 3: " + error);
    }
    endOfReportMessage("report3_annual_trends");
}