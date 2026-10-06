export type VoiceCommandResult = {
  handled:boolean;
  action?:string;
};


export function handleVoiceCommand(
  text:string
):VoiceCommandResult {


  const command=text
    .toLowerCase()
    .trim();



  if(
    command.includes("stop listening") ||
    command.includes("stop microphone")
  ){

    return {
      handled:true,
      action:"STOP_LISTENING"
    };

  }



  if(
    command.includes("stop speaking") ||
    command.includes("be quiet") ||
    command.includes("mute yourself")
  ){

    return {
      handled:true,
      action:"STOP_SPEAKING"
    };

  }



  if(
    command.includes("clear chat") ||
    command.includes("clear conversation")
  ){

    return {
      handled:true,
      action:"CLEAR_CHAT"
    };

  }



  if(
    command.includes("hello bumblebee") ||
    command.includes("hi bumblebee")
  ){

    return {
      handled:true,
      action:"GREETING"
    };

  }



  return {
    handled:false
  };

}