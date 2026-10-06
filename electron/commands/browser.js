const { shell } = require("electron");

function openWebsite(url) {

    shell.openExternal(url);

}

module.exports = {

    openWebsite

};