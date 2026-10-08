/*import { ChatMessage } from "./types";
import { generateContent } from "./gemini";


export async function think(
  messages: ChatMessage[]
): Promise<string> {


  const prompt = messages
    .map((msg)=>
      `${msg.role}: ${msg.content}`
    )
    .join("\n");


  try {

    const response =
      await generateContent(prompt);


    return response;


  } catch(error) {

    console.error(
      "Gemini Error:",
      error
    );


    return "Bumblebee connection failed.";

  }

}*/

import {askGemini} from "./gemini";

import {
saveMessage,
getHistory
} from "./memory/history";

import {
extractMemory
} from "./memory/extractor";

import {
getImportantMemories
} from "./memory/memoryManager";


export async function think(
message:string
){

extractMemory(message);

saveMessage(
"user",
message
);

const memories =
getImportantMemories();


const memoryContext =
memories
.map(
(m:any)=>
`${m.key}: ${m.value}`
)
.join("\n");


const history =
getHistory();

const context = history
.map(
(item:any)=>
`${item.role}: ${item.message}`
)
.join("\n");

const prompt = `

You are Bumblebee AI.

Known user memories:

${memoryContext}


Conversation:

${context}


User:

${message}


Respond naturally.

`;

const result =
await askGemini(prompt);
const reply = result.reply;

saveMessage(
"assistant",
reply
);

return reply;


}