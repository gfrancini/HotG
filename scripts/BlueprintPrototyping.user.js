// ==UserScript==
// @name         BlueprintPrototyping
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Assist with blueprinting in HoTG.
// @author       stronzio, betatesting/suggestions by dekember
// @match        https://game288398.konggames.com/gamez/0028/8398/live/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // what does this script do?

    // it adds two buttons on the planet interface (also called planet overview).
    // the top one toggles between different modes. the bottom one executes the command selected.
    // prototypes are the first planet of each type (lava, terrestrial, ocean and so on) you would encounter in ascending influence order. You may set a different list below (and should, if you make promision hub!).
    // As a precaution, it is disabled for hub planets (only import from prototype is active) <- usually hubs have many one-time buildings which you really dont want to clone everywhere.
    // hub planets are detected via the autoroutes' script. if you dont have it, then this protection wont work.

    // BEWARE: it is not 100% gamelike.
    // Unlike the ingame exportBlueprint, here you will also export/import queued buildings, to better reproduce the commonly used "manually-import-blueprint-from-text-file" mechanic.
    // Using sortPlanets=true WILL change the ordering of your planets (they are initially ordered by conquering, and there is no variable to keep track of that). The new order is consistent and repeatable.
    // The ordering will be updated whenever you issue the *set as prototype* command, and once when you load the page.


    // MODES
    // *set as prototype* => sets the current planet as prototype for that type.
    // *import from prototype* => imports the blueprint from the prototype.
    // *prototype to galaxy* => exports the blueprint from the prototype to all planets of the same type in the same galaxy.
    // *prototype to empire* => exports the blueprint from the prototype to all planets of the same type in all galaxies.

    // ALWAYS BACKUP YOUR SAVE: this script interacts with game code. While it shouldnt cause any catastrophe, better safe than sorry.

//////////

    var copyUIsetting = true; //true => whenever you use the prototype blueprint it will also import the hide/show setting of building's UI
    var sortPlanets = false; //true => puts prototype planets at the start of planets' list, other planets are grouped by galaxy and ordered by influence (ties resolved by planet id).
    var protonames = ["promision", "vasilis", "aequoreas", "orpheus", "antirion", "lone nassaus", "epsilon rutheni", "xenovirgo", "magellan", "auriga", "forax"]; //order doesnt really matter, these will be your "default" prototypes.
    var protoset = true; //true => enable *set as prototype* mode
    var protoimport = true; //true => enable *import from prototype* mode
    var protoempire = true; //true => enable *export to empire* mode
    var protogalaxy = true; //true => enable *export to galaxy* mode

//////////

    var config = { subtree: true, childList: true};
    var ele = document.getElementById("planet_interface");
    var cname = "action_proto404";
    var cname2 = "mode_proto404";
    var modes = {};
    modes.set = protoset;
    modes.import = protoimport;
    modes.empire = protoempire;
    modes.galaxy = protogalaxy;
    var modesNames = {};
    modesNames.set = "Set as Prototype:";
    modesNames.import = "Import from Prototype:";
    modesNames.empire = "Export to Empire:";
    modesNames.galaxy = "Export to Galaxy:";
    var activeModes = [];
    for(let key in modes){
        if(modes[key]) activeModes.push(key);
    }
    if( activeModes.length == 0) {
        console.log("BlueprintPrototyping: all modes inactive");
        return;
    }
    var prototypes = {};
    protonames.forEach((s) => {
        let p = game.planets.filter((item) => planets[item].name.toLowerCase() == s.toLowerCase());
        if( p.length != 1) console.log("error in prototypes (can probably ignore)"); //need a better idea for those checks
        else prototypes[planets[p[0]].type] = p[0]; //store planet id for ease.
    });
    let currentMode = activeModes[0];
    var obs = new MutationObserver(function(mutation) {
        if(document.getElementById(cname)) return;
        if(!document.getElementById("action_b")) return;
        var b_btn = document.getElementById("action_b");
        var bpp_btn = document.createElement("li");
        var bpp_mode_btn = document.createElement("li");
        var b1 = document.createElement("span");
        b1.className = b_btn.firstChild.className;
        var b2 = document.createElement("span");
        b2.className = b_btn.firstChild.className;
        bpp_btn.id = cname;
        bpp_mode_btn.id = cname2;
        bpp_btn.onclick = executeMode;
        bpp_mode_btn.onclick = toggleMode;
        bpp_btn.className = "button";
        bpp_mode_btn.className = "button";
        bpp_btn.appendChild(b1);
        bpp_mode_btn.appendChild(b2);
        updateButtonText();
        b_btn.parentNode.insertBefore(bpp_mode_btn,b_btn);
        b_btn.parentNode.insertBefore(bpp_btn,b_btn);
        if( sortPlanets) putPrototypesOnTop();
        return;

        function toggleMode(){
            let next = activeModes.indexOf(currentMode) +1;
            if(next >= activeModes.length) next = 0;
            currentMode = activeModes[next];
            updateButtonText();
        }

        function updateButtonText(){
            let str1 = "Toggle mode -> "+modesNames[currentMode];
            let type = planets[currentPlanet.id].type;
            let str2 = "["+type+"] ";
            switch(currentMode) {
                case "set":
                    str2 += currentPlanet.name;
                    break;
                case "import":
                case "empire":
                    str2 += planets[prototypes[type]].name;
                    break;
                case "galaxy":
                    str2 += planets[prototypes[type]].name;
                    str1 += " "+(planets[currentPlanet.id].map+1);
                    break;
            }
            let autob = document.getElementById("action_auto404"); //to identify hub i check the autoroutes' script button
            if(autob && autob.firstChild.textContent.includes("all") && currentMode != "import") {
                //str1 = "Hub detected";
                str2 = "Disabled for safety";
            }
            bpp_mode_btn.firstChild.textContent = str1;
            bpp_btn.firstChild.textContent = str2;
        }

        function putPrototypesOnTop(){
            let others = game.planets.filter((x) => !Object.values(prototypes).includes(x));
            let planet_list = game.planets.filter((x) => Object.values(prototypes).includes(x)).sort(byInfluence)
            .concat(
                others.filter((x) => planets[x].map == 0).sort(byInfluence),
                others.filter((x) => planets[x].map == 1).sort(byInfluence),
                others.filter((x) => planets[x].map == 2).sort(byInfluence)
            );
            game.planets = planet_list;
            return;
        }

        function byInfluence(a,b){ //comparator for planets id
            let r = planets[a].influence - planets[b].influence;
            if(r==0) return planets[a].id - planets[b].id;
            return r;
        }

        function findPrototypeBP(){
            let type = planets[currentPlanet.id].type;
            let blueprint = "";
            let db = new Array(planets[prototypes[type]].structure.length);
            Object.values(planets[prototypes[type]].structure).forEach((b) => db[b.building] = b.number);
            Object.values(planets[prototypes[type]]["queue"]).filter((q) => q && q.n > 0).forEach((q) => db[q.b] += q.n);//add queued buildings
            db.forEach(function(item,index) {if(item>0) blueprint += " " + buildings[index].displayName.replace(/\s/g, "_") + " " + item});
            //return planets[prototypes[type]].exportBlueprint(); //original function doesnt export queued items (0.42A).
            return blueprint;
        }

        function executeMode(){
            if(bpp_btn.firstChild.textContent.includes("disabled")){
                console.log("BlueprintPrototyping: function disabled");
                return;
            }
            let blueprint = findPrototypeBP();
            let targetlist = game.planets.filter((p) => planets[p].type == planets[currentPlanet.id].type);
            switch(currentMode) {
                case "set":
                    prototypes[planets[currentPlanet.id].type] = currentPlanet.id;
                    if( sortPlanets) putPrototypesOnTop();
                    return;
                case "import":
                    planets[currentPlanet.id].importBlueprint(blueprint);
                    if(copyUIsetting)
                        applyUIsetting(currentPlanet.id);
                    return;
                case "empire":
                    targetlist.forEach((p) => planets[p].importBlueprint(blueprint));
                    if(copyUIsetting)
                        targetlist.forEach((p) => applyUIsetting(p));
                    return;
                case "galaxy":
                    targetlist.filter((p) => planets[p].map == planets[currentPlanet.id].map).forEach((p) => planets[p].importBlueprint(blueprint));
                    if(copyUIsetting)
                        targetlist.filter((p) => planets[p].map == planets[currentPlanet.id].map).forEach((p) => applyUIsetting(p));
                    return;
            }
        }

        function applyUIsetting(target){
            let original = prototypes[planets[target].type];
            Object.values(planets[original].structure).forEach((b) => { planets[target].structure[b.building].showUI = b.showUI}); //b.building should also be the index in planets[p].structure
        }

    });
    obs.observe(ele,config);

})();