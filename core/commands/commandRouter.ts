import { executeDesktopCommand } from "./desktopCommands";

export async function processCommand(text: string) {

    const executed = await executeDesktopCommand(text);

    if (executed) {

        return {
            type: "desktop",
            reply: "Done.",
        };

    }

    const response = await fetch("/api/chat",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({
            message:text
        })

    });

    const data = await response.json();

    return {

        type:"ai",

        reply:data.reply

    };

}