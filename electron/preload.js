console.log("BUMBLEBEE PRELOAD LOADED");

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ultron", {

    openApp: (app) => ipcRenderer.invoke("app:open", app),

    closeApp: (app) => ipcRenderer.invoke("app:close", app),

    typeInNotepad: (text) => ipcRenderer.invoke("notepad:type", text),

    setAlarm: (time) => ipcRenderer.invoke("alarm:set", time),

    openUserFolder: (location) => ipcRenderer.invoke("explorer:open", location),

    createUserFolder: (location, name) => ipcRenderer.invoke("folder:create", location, name),

    searchMusic: (provider, query) => ipcRenderer.invoke("music:search", provider, query),

    calculate: (expression) => ipcRenderer.invoke("calculator:compute", expression),

    openWebsite: (url) => ipcRenderer.invoke("browser:open", url),

    ping: () => ipcRenderer.invoke("ping"),

    chat: (message) => ipcRenderer.invoke("agent:chat", message),

    getModel: () => ipcRenderer.invoke("agent:model"),

});

/*

contextBridge.exposeInMainWorld(
    "ultron",
    {


        ping:()=>{

            return ipcRenderer.invoke(
                "ping"
            );

        },


        hello:()=>{

            return "Bumblebee Bridge Working";

        },


        openApp:(appName)=>{

            return ipcRenderer.invoke(
                "app:open",
                appName
            );

        },


        closeApp:(appName)=>{

            return ipcRenderer.invoke(
                "app:close",
                appName
            );

        },


        openWebsite:(url)=>{

            return ipcRenderer.invoke(
                "browser:open",
                url
            );

        }


    }
);

*/