/*import { speak } from "./tts";

export async function askUltron(text: string) {

  const res = await fetch("/api/chat",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      message:text
    })
  });

  const data = await res.json();

  const reply =
    data.reply ??
    data.error ??
    "Unable to connect.";

  speak(reply);

  return reply;
}*/

import {
  startListening,
  stopListening,
} from "./speech";

import {
  speak,
  stopSpeaking,
} from "./tts";


let active = false;

let conversationMode = false;


export function startVoiceConversation(
  onText:(text:string)=>void
){

    active=true;
    conversationMode=true;

    startListening(
        (text)=>{
            onText(text);
        },
        ()=>{
            console.log(
              "🎤 Listening started"
            );
        },
        ()=>{
            console.log(
              "🎤 Listening ended"
            );
        }
    );
}



export function speakAndListen(
    text:string,
    onText:(text:string)=>void
){

    stopListening();


    speak(
        text,
        ()=>{

            if(
              conversationMode &&
              active
            ){

                startVoiceConversation(
                    onText
                );

            }

        }
    );

}



export function stopVoice(){

    active=false;

    conversationMode=false;


    stopListening();

    stopSpeaking();


    console.log(
      "Voice system stopped"
    );

}



export function enableConversation(){

    conversationMode=true;

}



export function disableConversation(){

    conversationMode=false;

}