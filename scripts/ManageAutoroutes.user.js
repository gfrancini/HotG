// ==UserScript==
// @name         ManageAutoroutes
// @namespace    https://github.com/gfrancini/HotG
// @version      0.7
// @description  Assists with creating/increasing autoroutes in HoTG with a single click.
// @author       stronzio, betatesting/ideas by dekember
// @match        https://game288398.konggames.com/gamez/0028/8398/live/*
// @downloadURL  https://github.com/gfrancini/HotG/raw/master/scripts/ManageAutoroutes.user.js
// @updateURL    https://github.com/gfrancini/HotG/raw/master/scripts/ManageAutoroutes.user.js
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==



(async function () {
    'use strict';

    // what does this script do?

    // it adds a button on the planet interface (also called planet overview) with text "create autoroute to hub" or "create all autoroutes" (when on hub planet)
    // when clicked, this button creates an autoroute between that planet and the (player-chosen) hub for that galaxy - if that planet is not the hub.
    // if the planet is the hub, it creates an autoroute to every player-owned planet in that galaxy.
    // if you change parameters you need to save and reload the game page for the changes to take effect.
    // parameters need to be set correctly before using the script.
    // works only with orion and andromeda cargo. (if you are using any earlier cargo, you probably have few planets and little resources)

    // ALWAYS BACKUP YOUR SAVE: this script interacts with game code. While it shouldnt cause a catastrophe, better safe than sorry.

    // BEWARE: it is not 100% gamelike.
    // Unlike the autoroutes you create ingame, here you will pre-set transfer rates for (yet) undiscovered resources,
    // the "extend to new resources" option enabled ingame does not actually do this correctly

    //////////

    var ignoreStoredValues = false; //true => save current parameters and load them.   when this is set to false. When the script (auto)updates this will be set to false (to avoid messing with your game): you should restore parameters to your liking and set this to true.


    //if you dont own one of the hubs, the button will be disabled (in that galaxy), but will become active again after you conquer that hub.
    var hubGalaxy1 = "ishtar gate";
    var hubGalaxy2 = "solidad";
    var hubGalaxy3 = "xirandrus";
    var shipsPerAutoroute = 1;
    var transferPercent = 101;
    var useLategameExclusions = false; //false => transfer all resources, true => no shipping of plastic except for radioactive/acid and no shipping of graphite/titanium for lava *** 
    var noDuplicates = true; // true => do not create autoroute if target planet already has one, false => create a new autoroute every time button is pressed NOT RECOMMENDED
    var takeFromHubfleet = true; //true => try to split ships from hubfleet (buy ships only if there aren't enough), false => always buy ships
    var topUp = true; // true => if there is already an autoroute, will try to build enough ships to stop any present overloading (will also set noDuplicates to true), false => script only creates autroutes and does not interact with already created ones.
    var redundancy = 10; //percent of extra ships to build, useful to "make space" for future increases in production. Set to zero to disable. (won't affect the "shipsPerAutoroute" value).

    //////////

    if (ignoreStoredValues)
        saveParam();
    else
        await loadParam();
    var hubG1 = planets.filter((item) => item.name.toLowerCase() == hubGalaxy1.toLowerCase() && item.map == 0);
    hubG1 = hubG1.length > 0 ? hubG1[0].id : -1; //needed to avoid duplicate names
    var hubG2 = planets.filter((item) => item.name.toLowerCase() == hubGalaxy2.toLowerCase() && item.map == 1);
    hubG2 = hubG2.length > 0 ? hubG2[0].id : -1; //needed to avoid duplicate names
    var hubG3 = planets.filter((item) => item.name.toLowerCase() == hubGalaxy3.toLowerCase() && item.map == 2)
    hubG3 = hubG3.length > 0 ? hubG3[0].id : -1; //needed to avoid duplicate names
    var hubs = [hubG1, hubG2, hubG3];
    var orion = { id: 70, slvl: 14 };
    var andromeda = { id: 102, slvl: 17 };
    if (shipsPerAutoroute <= 0 || transferPercent <= 0 || redundancy < 0) {
        console.log("ManageAutoroutes: invalid parameters");
        return false;
    }
    var config = { subtree: true, childList: true };
    var ele = document.getElementById("planet_interface");
    var cname = "action_auto404";
    var obs = new MutationObserver(function (mutation) {
        if (document.getElementById(cname)) return;
        if (!document.getElementById("action_auto")) return;
        var galaxy = game.planets.filter((item) => planets[item].map == currentPlanet.map);
        var t_hub = (hubs.filter((item) => item >= 0 && planets[item].map == currentPlanet.map)[0] + 1) || -1; //need the +1 to include index 0 (promision)
        var currentHub = t_hub - 1; //stays negative if errors
        var hubPending = planets.filter((item, index) => index >= 0 && item.map == planets[currentPlanet.id].map && hubs.includes(item.id) && item.civis != game.id).length > 0;
        var cargo = orion;
        if (game.researches[23].level > 0) { cargo = andromeda; }
        var needed = planets[0].resources.slice();
        ships[cargo.id].cost.forEach((item, index) => { needed[index] = item });
        var hubSelected = currentPlanet.id == currentHub;
        let targets = Array.of(currentPlanet.id);
        if (hubSelected) targets = galaxy;
        var auto_btn = document.getElementById("action_auto");
        var auto404_btn = document.createElement("li");
        auto404_btn.className = "button";
        var b1 = document.createElement("span");
        auto404_btn.appendChild(b1);
        //blueprint script checks if button text contains "all" to recognize hub planets.
        if (currentHub >= 0) {
            if (!hubPending) {
                b1.className = "blue_text";
                b1.textContent = hubSelected ? topUp ? "Top-up all Autoroutes (gal " + (planets[currentHub].map + 1) + ")" : "Create all Autoroutes (gal " + (planets[currentHub].map + 1) + ")" : topUp ? "Top-up Autoroute to " + planets[currentHub].name : "Create Autoroute to " + planets[currentHub].name;
            }
            else {
                b1.className = "red_text";
                b1.textContent = "ManageAutoroutes disabled (Conquer hub)";
            }
        }
        else {
            b1.className = "red_text";
            b1.textContent = "ManageAutoroutes disabled (Check spelling)";
        }
        auto404_btn.id = cname;
        auto404_btn.onclick = function () { createAutoroutes(targets); }
        auto_btn.parentNode.insertBefore(auto404_btn, auto_btn);
        return;

        function createAutoroutes(targets) {
            if (currentHub < 0 || hubPending) return false;
            let hub = currentHub;
            targets.forEach((dest) => {
                if (dest == hub) return;
                if (topUp) noDuplicates = true;
                let f, pos, neededShips, currentRoute;
                neededShips = shipsPerAutoroute;
                let exclusions = [];
                if (planets[dest].type != "acid" && planets[dest].type != "radioactive") exclusions.push(15);
                if (planets[dest].type == "lava") exclusions.push(4, 2);
                if (noDuplicates) {
                    let ff = fleetSchedule.fleets.filter((item) => item && item.type == "auto" && item.civis == game.id && ((item.autoMap[dest] == 1 && item.autoMap[hub] == 0)
                        || (item.autoMap[dest] == 0 && item.autoMap[hub] == 1))); //is a route to hub already present?

                    if (!topUp && ff.length > 0) {
                        console.log("ManageAutoroutes: autoroute already present at " + planets[dest].name);
                        return false;
                    }
                    if (topUp && ff.length > 0) {
                        currentRoute = ff[0];
                        let neededCargoIn = -planets[dest].globalRaw.filter((item) => item && item < 0).reduce((acc, cur) => acc + cur, 0);
                        let neededCargoOut = planets[dest].globalRaw.filter((item) => item && item > 0).reduce((acc, cur) => acc + cur, 0);
                        let distance = shortestRouteId(hub, dest)[0];
                        if (useLategameExclusions) {
                            let excludedIn = -planets[dest].globalRaw.filter((item, index) => item && exclusions.includes(index) && item < 0).reduce((acc, cur) => acc + cur, 0);
                            let excludedOut = planets[dest].globalRaw.filter((item, index) => item && exclusions.includes(index) && item > 0).reduce((acc, cur) => acc + cur, 0);
                            neededCargoIn -= excludedIn;
                            neededCargoOut -= excludedOut;
                        }
                        let currentSpeed = currentRoute.travelSpeed() * idleBon; //idlebon here to get a useful console output
                        //console.log("cargo space needed: "+planets[dest].name+" --> "+neededCargoOut*(transferPercent/100)*2*distance/currentSpeed+" , "+planets[hub].name+" --> " +neededCargoIn*(transferPercent/100)*2*distance/currentSpeed); //seems always a bit higher than ingame during idle time (??)
                        neededShips = Math.max(Math.ceil(Math.max(neededCargoIn, neededCargoOut) * (transferPercent / 100) * 2 * distance / currentSpeed / ships[cargo.id].maxStorage * (1 + redundancy / 100)), currentRoute.ships[cargo.id]) - currentRoute.ships[cargo.id];
                    }
                }
                let enoughHubfleet = takeFromHubfleet && planets[hub].fleets.hub.ships[cargo.id] > neededShips;
                let enoughResources = enoughHubfleet || !needed.some((item, index) => planets[hub].resources[index] < item * neededShips);
                if (!enoughResources) {
                    console.log("ManageAutoroutes: insufficient resources (dest: " + planets[dest].name + ")");
                    return false;
                }
                if (enoughHubfleet) {
                    f = new Fleet(game.id, "Auto_" + planets[dest].name);
                    f.ships[cargo.id] += neededShips;
                    planets[hub].fleets.hub.ships[cargo.id] -= neededShips;
                    for (pos = 1; planets[hub].fleets[pos];) pos++; //find the correct orbit slot to place the new fleet
                    planets[hub].fleets[pos] = f;
                    f.pushed = true;
                }
                else {
                    if (planets[hub].structure[buildingsName.shipyard].number < cargo.slvl) {
                        console.log("ManageAutoroutes: shipyard level too low (gal " + (planets[currentHub].map + 1) + ")");
                        return false;
                    }
                    planets[hub].shipyardFleet = new Fleet(game.id, "n");
                    planets[hub].shipyardFleet.pushed = false;
                    planets[hub].buyMultipleShip(cargo.id, neededShips);
                    planets[hub].shipyardFleet.name = "Auto_" + planets[dest].name;
                    planets[hub].fleetPush(planets[hub].shipyardFleet);
                    planets[hub].shipyardFleet.pushed = true;
                    pos = parseInt(Object.keys(planets[hub].fleets).filter((key) => planets[hub].fleets[key].name == "Auto_" + planets[dest].name)[0]); //if multiple matches (how?), i'll just take the first one
                    f = planets[hub].fleets[pos];
                }
                if (topUp && currentRoute) {
                    let hubpos = currentRoute.origin == hub ? 1 : 0;
                    let destpos = currentRoute.origin == dest ? 1 : 0;
                    currentRoute.autoMap[hub] = hubpos;
                    currentRoute.autoMap[dest] = destpos;
                    for (let i = 0; i < currentRoute.autoPct.length; i++) {
                        currentRoute.autoPct[i] = true;
                        currentRoute.autoRes[hubpos][i] = 0;
                        currentRoute.autoRes[destpos][i] = transferPercent * 100; //could set undiscovered resources to 0 to be really legit
                        if (useLategameExclusions && exclusions.includes(i)) currentRoute.autoRes[destpos][i] = 0;
                    }
                    currentRoute.fusion(f);
                }
                else {
                    currentRoute = f;
                    currentRoute.autoMap[hub] = 0;
                    currentRoute.autoMap[dest] = 1;
                    for (let i = 0; i < currentRoute.autoPct.length; i++) {
                        currentRoute.autoPct[i] = true;
                        currentRoute.autoRes[1][i] = transferPercent * 100; //could set undiscovered resources to 0 to be really legit
                        if (useLategameExclusions && exclusions.includes(i)) currentRoute.autoRes[1][i] = 0;
                    }
                    fleetSchedule.push(currentRoute, hub, hub, dest, "auto");
                }
                if (currentRoute.shipNum() > currentRoute.ships[cargo.id])
                    console.log("ManageAutoroutes: mixing ships in autoroutes is not advised (" + planets[dest].name + ")");
                delete planets[hub].fleets[pos];
            });
        }
    });
    obs.observe(ele, config);

    function saveParam() {
        let savestring = {
            hubGalaxy1: hubGalaxy1,
            hubGalaxy2: hubGalaxy2,
            hubGalaxy3: hubGalaxy3,
            shipsPerAutoroute: shipsPerAutoroute,
            transferPercent: transferPercent,
            useLategameExclusions: useLategameExclusions,
            noDuplicates: noDuplicates,
            takeFromHubfleet: takeFromHubfleet,
            topUp: topUp,
            redundancy: redundancy
        };
        GM.setValue("s404", JSON.stringify(savestring));
    }

    async function loadParam() {
        try {
            let loadstring = JSON.parse(await GM.getValue("s404"));
            hubGalaxy1 = loadstring["hubGalaxy1"];
            hubGalaxy2 = loadstring["hubGalaxy2"];
            hubGalaxy3 = loadstring["hubGalaxy3"];
            shipsPerAutoroute = loadstring["shipsPerAutoroute"];
            transferPercent = loadstring["transferPercent"];
            useLategameExclusions = loadstring["useLategameExclusions"];
            noDuplicates = loadstring["noDuplicates"];
            takeFromHubfleet = loadstring["takeFromHubfleet"];
            topUp = loadstring["topUp"];
            redundancy = loadstring["redundancy"];
        } catch (e) { return; } //revert to given params if errors
    }
})();