import { endOfReportMessage } from "./assist.js";
import { displayToCMD } from "./assist.js";
import { exportToCSV } from "./assist.js";
import { round } from "./assist.js";
import { currencyFormat } from "./assist.js";
import { reliabilityIndex } from "./assist.js";

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
        // step 1: Group data by contractor
        const contractors = data.reduce((acc, row) => {
            // Redo the code block: Split the contractor field by "/" to handle multiple contractors per row
            const contractorsInRow = row.Contractor.split('/').map(c => c.trim());
            
            // For each contractor in the row, add to the accumulator
            contractorsInRow.forEach(contractor => {
                if (!acc[contractor]) {  
                    acc[contractor] = {
                        name: contractor,
                        totalCost: 0,
                        numProjects: 0,
                        totalDelays: 0,
                        totalSavings: 0,
                        ReliabilityIndex: 0,
                        avgDelay: 0,
                        riskFlag: ""
                    };
                }
            });
            
            return acc;
        }, {}); // return an object with empty properties except name

        // step 2: Aggregate values for each contractor
        data.forEach(row => {
            // Split the contractor field by "/" to handle multiple contractors per row
            const contractorsInRow = row.Contractor.split('/').map(c => c.trim());
            
            // For each contractor in the row, update their aggregated values
            contractorsInRow.forEach(contractor => {
                if (contractors[contractor]) {  
                    contractors[contractor].totalCost += parseFloat(row.ContractCost) || 0;  
                    contractors[contractor].numProjects += 1;  
                    contractors[contractor].totalDelays += parseInt(row.CompletionDelayDays) || 0;  
                    contractors[contractor].totalSavings += parseFloat(row.CostSavings) || 0;  
                }
            });
        });

        // step 4: filter contractors with at least 5 projects
        Object.keys(contractors).forEach(contractorName => {
            if (contractors[contractorName].numProjects < 5) {
                delete contractors[contractorName];
            }
        });

        // step 5: Calculate derived metrics for each contractor
        Object.values(contractors).forEach(contractor => {
            contractor.avgDelay = contractor.numProjects > 0 ? contractor.totalDelays / contractor.numProjects : 0;
            contractor.ReliabilityIndex = reliabilityIndex(contractor.avgDelay, contractor.totalSavings, contractor.totalCost);
            contractor.riskFlag = contractor.ReliabilityIndex < 50 ? "HIGH RISK" : "LOW RISK";
        });

        // step 6: sort by ContractCost descending
        // step 7: assign ranks and limit to top 15
        let rank = 1;
        const rankedContractors = {};
        // Sort the contractors by totalCost descending once
        const sortedContractors = Object.values(contractors).sort((a, b) => b.totalCost - a.totalCost);
        sortedContractors.forEach(contractor => {
            if (rank <= 15) {
                rankedContractors[contractor.name] = {
                    Rank: rank,
                    Contractor: contractor.name,
                    TotalCost: contractor.totalCost,
                    NumProjects: contractor.numProjects,
                    AvgDelay: contractor.avgDelay,
                    TotalSavings: contractor.totalSavings,
                    ReliabilityIndex: contractor.ReliabilityIndex,
                    RiskFlag: contractor.riskFlag
                };
                rank++;
            }
        });

        // step 8: Format and filter contractors for display (apply only to top 15)
        Object.values(rankedContractors).forEach(contractor => {
            contractor.TotalCost = currencyFormat(round(contractor.TotalCost));
            contractor.AvgDelay = round(contractor.AvgDelay);
            contractor.NumProjects = Math.round(contractor.NumProjects);
            contractor.TotalSavings = currencyFormat(round(contractor.TotalSavings));
            contractor.ReliabilityIndex = round(contractor.ReliabilityIndex);
        });

        const newData = Object.values(rankedContractors);

        displayToCMD(header, newData);
        exportToCSV("report2_contractor_ranking", header, newData);
    } catch (error){
        console.log("Error generating Report 2: " + error.message);
    }
    endOfReportMessage("report2_contractor_ranking");
}   