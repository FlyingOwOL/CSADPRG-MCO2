import { report1 } from "./generateReports/report1.js";
import { report2 } from "./generateReports/report2.js";
import { report3 } from "./generateReports/report3.js";


export function generateReport(data){
    report1(data);
    report2(data);
    report3(data);
}