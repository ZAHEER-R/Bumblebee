const { exec } = require("child_process");

function shutdown() {

    exec("shutdown /s /t 0");

}

function restart() {

    exec("shutdown /r /t 0");

}

module.exports = {

    shutdown,
    restart

};