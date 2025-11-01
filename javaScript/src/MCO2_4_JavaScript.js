import promptSync from "prompt-sync";
const prompt = promptSync();


let userChoice = null;

do{
    console.log("Select Language Implementation:\n" +
                "[1] Load the file\n" + 
                "[2] Generate reports\n" +
                "[3] Exit program\n");
    userChoice = prompt("Enter choice: ");
    switch(userChoice){
        case '1':
            console.log("in-progress...\n\n\n");
            break;
        case '2':
            console.log("in-progress...\n\n\n");
            break;
        case '3':
            console.log("Exiting program...\n");
            break;
        default:
            console.log("Invalid option\n");
            break;
    }
}while(userChoice != 3);
