import { detectIntent } from "./intentDetector";

export async function executeDesktopCommand(text: string) {

    const result = detectIntent(text);

    switch (result.intent) {

        case "OPEN_APP": {
            if (!result.app) return false;

            const response = await window.ultron.openApp(result.app);

            console.log("OPEN RESPONSE:", response);

            return response?.success === true;

        }

        case "CLOSE_APP": {
            if (!result.app) return false;

            const response = await window.ultron.closeApp(result.app);

            console.log("CLOSE RESPONSE:", response);

            return response?.success === true;

        }

        default:

            return false;
    }

}