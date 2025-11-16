import { endOfReportMessage } from "./assist.js";

export function report2(data){
    console.log("Report 2: Top Contractors Performance Ranking\n\n" +
                "Top Contractors Performance Ranking\n" +
                "(Top 15 by TotalCost, >=5 projects)\n"
    );
    try{
        const header = ["Rank", "Contractor", "TotalCost", "NumProjects", "AvgDelay", "TotalSavings", "ReliabilityIndex", "RiskFlag"];
        
        /** contractors contains a group of sub objects with:
         * { sample 
         * name: attribute to group by,
         * totalCost: sum of TotalCost,
         * numProjects: count of projects,
         * totalDelays: sum of delays,
         * totalSavings: sum of savings,
         * reliabilityIndex: calculated later,
         * avgDelay: calculated later,
         * riskFlag: calculated later
         * }, 
         * next object
         */
        const contractors = { // Group data by contractor object

        };
        const newData = data.map(row => {
            return {
                Rank: row.Rank,
                Contractor: row.Contractor,
                TotalCost: row.TotalCost,
                NumProjects: row.NumProjects,
                AvgDelay: row.AvgDelay,
                TotalSavings: row.TotalSavings,
                ReliabilityIndex: row.ReliabilityIndex,
                RiskFlag: row.RiskFlag
            };
        });
        displayToCMD(header, newData);
    } catch (error){
        console.log("Error generating Report 2: " + error.message);
    }
    endOfReportMessage("report2_contractor_ranking");
}   