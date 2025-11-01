import promptSync from "prompt-sync";
const prompt = promptSync();


let userChoice = null;

do{
    userChoice = prompt("Exit?");
}while(userChoice != 3);
