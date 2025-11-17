import { generateJSON } from "./assist.js";
import { currencyFormat } from "./assist.js";
import { round } from "./assist.js";


export function generateSummary(data) {
    console.log("Summary Stats (summary.json):");
    try {
        const summary = {
            total_projects: 0,
            total_contractors: 0,
            total_provinces: 0,
            total_regions: 0,
            global_avg_delay: 0,
            global_total_savings: 0,
            global_total_budget: 0,
            date_range: '2021-2023'
        };

        const provinces = [];
        const regions = [];
        const contractors = [];
        let totalDelays = 0;

        data.forEach(row => {
            // Count unique contractors
            const contractorsInRow = row.Contractor.split('/').map(c => c.trim());
            contractorsInRow.forEach(contractor => {
                if (!contractors.includes(contractor)) {  
                    contractors.push(contractor);
                }
            });

            summary.total_projects++;  // Increment per row

            // Collect unique provinces
            if (!provinces.includes(row.Province)) {
                provinces.push(row.Province);
            }

            // Collect unique regions
            if (!regions.includes(row.Region)) {
                regions.push(row.Region);
            }

            totalDelays += parseInt(row.CompletionDelayDays || 0);;
            summary.global_total_savings += parseFloat(row.CostSavings || 0);
            summary.global_total_budget += parseFloat(row.ApprovedBudgetForContract || 0);
        });

        // Assign counts after collecting uniques
        summary.total_contractors = contractors.length;
        summary.total_provinces = provinces.length;
        summary.total_regions = regions.length;

        // Calculate average delay
        summary.global_avg_delay = data.length > 0 ? totalDelays / data.length : 0;

        // Format currency
        summary.global_total_budget = currencyFormat(summary.global_total_budget);
        summary.global_total_savings = currencyFormat(summary.global_total_savings);

        console.log(`{global_avg_delay: ${round(summary.global_avg_delay)}, global_total_savings: ${summary.global_total_savings}}\n`);
        generateJSON(summary);
    } catch (error) {
        console.log("Error generating Summary.JSON " + error.message);
    }
}
