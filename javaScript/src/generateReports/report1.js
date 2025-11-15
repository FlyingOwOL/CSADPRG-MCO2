import { endOfReportMessage } from "./assist.js";
import { displayToCMD } from "./assist.js";
import { exportToCSV } from "./assist.js";

export function report1(data) {
    console.log("Report 1: Regional Flood Mitigation Efficiency Summary\n" +
                "(Filtered 2021-2023 Projects)\n"
    );

    try {
        const header = ["Region", "MainIsland", "TotalBudget", "MedianSavings", "AvgDelay", "HighDelayPct", "EfficiencyScore"];

        // Step 1: Group data by region using reduce
        const groupedByRegion = data.reduce((acc, row) => {
            const region = row.Region;
            if (!acc[region]) {
                acc[region] = {
                    rows: [],
                    mainIsland: row.MainIsland  // Assume consistent per region
                };
            }
            acc[region].rows.push(row);
            return acc;
        }, {});

        // Step 2: First pass - Calculate rawScore for each region and collect them
        const rawScores = [];
        Object.keys(groupedByRegion).forEach(region => {
            const group = groupedByRegion[region];
            const rows = group.rows;

            let totalDelays = 0;
            let delayCount = 0;
            let savingsArray = [];

            rows.forEach(row => {
                const delay = parseInt(row.CompletionDelayDays);
                totalDelays += delay;
                delayCount++;
                savingsArray.push(parseFloat(row.CostSavings));
            });

            // Calculate rawScore
            savingsArray.sort((a, b) => a - b);
            const medianSavings = Math.round(savingsArray[Math.floor(savingsArray.length / 2)] * 100) / 100;
            const avgDelay = delayCount > 0 ? Math.round(totalDelays / delayCount) : 0;
            const rawScore = avgDelay > 0 ? (medianSavings / avgDelay) * 100 : 0;
            rawScores.push(rawScore);
        });

        const min = Math.min(...rawScores);
        const max = Math.max(...rawScores);

        // Step 3: Second pass - Map over groups to calculate final aggregates with normalized efficiencyScore
        const newData = Object.keys(groupedByRegion).map(region => {
            const group = groupedByRegion[region];
            const rows = group.rows;

            let totalBudget = 0;
            let totalDelays = 0;
            let delayCount = 0;
            let delaysOver30 = 0;
            let savingsArray = [];

            rows.forEach(row => {
                totalBudget += parseFloat(row.ApprovedBudgetForContract);
                const delay = parseInt(row.CompletionDelayDays);
                totalDelays += delay;
                delayCount++;
                if (delay > 30) delaysOver30++;
                savingsArray.push(parseFloat(row.CostSavings));
            });

            savingsArray.sort((a, b) => a - b);
            const medianSavings = Math.round(savingsArray[Math.floor(savingsArray.length / 2)] * 100) / 100;
            const avgDelay = delayCount > 0 ? Math.round(totalDelays / delayCount) : 0;
            const highDelayPct = delayCount > 0 ? Math.round(((delaysOver30 / delayCount) * 100) * 100) / 100 : 0;

            const rawScore = avgDelay > 0 ? (medianSavings / avgDelay) * 100 : 0;
            // Normalize using global min/max
            const efficiencyScore = max > min ? Math.round((((rawScore - min) / (max - min)) * 100) * 100) / 100 : 0;

            totalBudget = Math.round(totalBudget * 100) / 100;
            const formattedBudget = new Intl.NumberFormat('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(totalBudget);
            const formattedMedianSaving = new Intl.NumberFormat('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(medianSavings);

            return {
                Region: region,
                MainIsland: group.mainIsland,
                TotalBudget: formattedBudget,
                MedianSavings: formattedMedianSaving,
                AvgDelayInDays: avgDelay,
                HighDelayPct: highDelayPct,
                EfficiencyScore: efficiencyScore
            };
        });
        // Step 4: Sort by EfficiencyScore descending
        newData.sort((a, b) => b.EfficiencyScore - a.EfficiencyScore);

        exportToCSV("report1_regional_summary", header, newData);
        displayToCMD(header, newData);
    } catch (error) {
        console.log("Error generating Report 1: " + error.message);
    }
    endOfReportMessage("report1_regional_summary");
}
