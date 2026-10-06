import {
setUltronStatus
} from "@/lib/status/statusManager";

let speaking = false;


export function speak(
    text:string,
    onEnd?:()=>void
){

    if(typeof window==="undefined")
        return;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
        console.error("Text-to-speech is not supported in this environment.");
        return;
    }

    stopSpeaking();

    setUltronStatus("SPEAKING");

    const utterance =
    new SpeechSynthesisUtterance(text);


    utterance.lang="en-US";

    utterance.rate=0.95;

    utterance.pitch=0.9;


    speaking=true;


utterance.onend = () => {

speaking=false;

setUltronStatus(
"READY"
);
onEnd?.();

};


    utterance.onerror=(event)=>{

        speaking=false;

        setUltronStatus("READY");
        if (event.error !== "canceled" && event.error !== "interrupted") {
            console.error("Speech synthesis failed:", event.error);
            onEnd?.();
        }

    };


    window.speechSynthesis.speak(
        utterance
    );

}



export function stopSpeaking(){

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    speaking=false;

}



export function isSpeaking(){

    return speaking;

}