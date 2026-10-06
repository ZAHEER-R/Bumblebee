export type UltronStatus =
  | "READY"
  | "LISTENING"
  | "THINKING"
  | "SPEAKING"
  | "SLEEPING";


let currentStatus: UltronStatus = "READY";


const listeners = new Set<
(status: UltronStatus)=>void
>();


export function setUltronStatus(
status: UltronStatus
){

currentStatus = status;


console.log(
"BUMBLEBEE STATUS:",
status
);


listeners.forEach(
(listener)=>
listener(status)
);

}



export function getUltronStatus(){

return currentStatus;

}



export function subscribeStatus(
listener:(status:UltronStatus)=>void
){

listeners.add(listener);


return ()=>{

listeners.delete(listener);

};

}