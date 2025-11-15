import { endOfReportMessage } from "./assist.js";
import { displayToCMD } from "./assist.js";

export function report1(data){
    console.log("Report 1: Regional Flood Mitigation Efficiency Summary\n" +
                "(Filtered 2021-2023 Projects)\n"
    );
    try{
        const header = ["Region", "MainIsland", "TotalBudget", "MedianSavings", "AvgDelay", "HighDelayPct", "EfficiencyScore"];
        const regionsVisited = [];
        let totalBudget, medianSavings, avgDelay, highDelayPct, efficiencyScore;
        let totalDelays = 0;
        let delayCounts = 0;
        let delaysOver30 = 0;
        let savingsArray = [];
        const newData = data.map(row => {
            if(!regionsVisited.includes(row.Region)){ //check if region already processed
                if (regionsVisited.length > 0){       //regionsVisited is not empty
                    medianSavings = savingsArray[Math.floor(savingsArray.length / 2)];
                    avgDelay = parseFloat(delayCounts / totalDelays);
                    highDelayPct = parseFloat((delaysOver30 / totalDelays) * 100);
                    efficiencyScore = medianSavings / avgDelay * 100;

                    return { //returned processed row
                        Region: row.Region,
                        MainIsland: row.MainIsland,
                        TotalBudget: totalBudget,   
                        MedianSavings: medianSavings,
                        AvgDelay: avgDelay,
                        HighDelayPct: highDelayPct,
                        EfficiencyScore: efficiencyScore
                    };
                }
            }

            if (!regionsVisited.includes(row.Region)){ 
                regionsVisited.push(row.Region);
                totalBudget = 0;
                medianSavings = 0;
                avgDelay = 0;
                highDelayPct = 0;
                efficiencyScore = 0;     
            }
            totalBudget += parseFloat(row.ApprovedBudgetForContract); 
            delayCounts += parseInt(row.CompletionDelayDays);
            totalDelays++;
            row.CompletionDelayDays > 30 ? delaysOver30++ : null;
            savingsArray.push(parseFloat(row.CostSavings));
        });
        displayToCMD(header, newData);
    } catch (error){
        console.log("Error generating Report 1: " + error.message);
    }
    endOfReportMessage("report1_regional_summary");
}