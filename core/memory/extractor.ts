import {
saveMemory
} from "./memoryManager";



export function extractMemory(
message:string
){


const lower =
message.toLowerCase();



if(
lower.includes("my name is")
){

const name =
message
.split("is")
[1]
.trim();


saveMemory(
"user",
"name",
name,
5
);


}



if(
lower.includes("i like")
){

const interest =
message
.split("like")
[1]
.trim();


saveMemory(
"preference",
"interest",
interest,
3
);


}



}