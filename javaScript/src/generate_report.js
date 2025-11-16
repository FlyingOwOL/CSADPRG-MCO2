import { report1 } from "./generateReports/report1.js";
import { report2 } from "./generateReports/report2.js";
import { report3 } from "./generateReports/report3.js";
import { generateSummary } from "./generateReports/report3.js";

export function generateReport(data){
    console.log("\nGenerating Reports. . .\n" +
        "Outputs saved to individual files...\n"
    );
    report1(data.data);
    report2(data.data);
    report3(data.data);
    generateReport(data.data);
}