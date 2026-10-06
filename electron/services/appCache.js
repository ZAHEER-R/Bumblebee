let installedApps = [];

function setApps(apps = []) {
    installedApps = apps;
}

function getApps() {
    return installedApps;
}

function findApp(name) {

    if (!name) return null;

    const search = name
        .toLowerCase()
        .trim();

    return installedApps.find(app =>
        app.name.toLowerCase() === search
    );

}

module.exports = {
    setApps,
    getApps,
    findApp
};