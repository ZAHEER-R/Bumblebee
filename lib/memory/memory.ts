export type MemoryItem = {

  role:string;

  content:string;

};

const memory:MemoryItem[]=[];

export function saveMemory(item:MemoryItem){

  memory.push(item);

}

export function getMemory(){

  return memory;

}