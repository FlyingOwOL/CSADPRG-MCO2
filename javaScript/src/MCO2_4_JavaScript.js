/*********************
Last names: Dela Torre, Espada, Laguerta, Sy
Language: JavaScript
Paradigm(s): Procedural, Functional, Data-Oriented
*********************/

import promptSync from "prompt-sync";
import { loadData } from "./file_loader.js";
import { generateReport } from "./generate_report.js";

const prompt = promptSync();
let userChoice = null;
let loadedData = null;
do{
    console.log("Select Language Implementation:\n" +
                "[1] Load the file\n" + 
                "[2] Generate reports\n" +
                "[3] Exit program\n");
    userChoice = prompt("Enter choice: ");
    switch(userChoice){
        case '1':
            loadedData = loadData();
            break;
        case '2':
            generateReport(loadedData);
            break;
        case '3':
            console.log("Exiting program...\n");
            break;
        default:
            console.log("Invalid option\n");
            break;
    }
}while(userChoice != 3);
