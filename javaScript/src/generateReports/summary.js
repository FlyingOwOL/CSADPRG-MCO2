import { generateJSON } from "./assist.js";

export function generateSummary (data){
    console.log("Summary Stats (summary.json:")
    try{
        const summary = {
            total_projects : 0, 
            total_contractors : 0, 
            total_provinces : 0, 
            total_regions: 0, 
            global_avg_delay: 0, 
            global_total_savings: 0,
            global_total_budget: 0,
            date_range: 0
        };
        generateJSON(summary);w
    } catch (error){
        console.log("Error generating Summary.JSOn " + error.message);
    }    
}   