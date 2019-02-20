// ==UserScript==
// @name         MasterImport
// @namespace    https://github.com/gfrancini/HotG
// @version      0.2
// @description  Adds a button to import blueprint everywhere in HotG
// @author       stronzio, betatesting by dekember
// @match        https://game288398.konggames.com/gamez/0028/8398/live/*
// @downloadURL  https://github.com/gfrancini/HotG/raw/master/scripts/MasterImport.user.js
// @updateURL    https://github.com/gfrancini/HotG/raw/master/scripts/MasterImport.user.js
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

(async function() {
    'use strict';
//////////

    var ignoreStoredValues = false; //true => save current parameters and load them when this is set to false. When the script (auto)updates this will be set to false (to avoid messing with your game): you should restore parameters to your liking and set this to true.

    var excludedTypes = ["carbon","ammonia"]; //planet types excluded from the master import (blueprint wont be applied to them) => to turn it off simply comment out this row (write // before var)

//////////

    if(ignoreStoredValues)
        saveParam();
    else
        await loadParam();
    var config = { subtree: true, childList: true};
    var ele = document.getElementById("planet_interface");
    var cname_m = "action_master404";
    var obs_m = new MutationObserver(function(mutation){
        if(document.getElementById(cname_m)) return;
        if(!document.getElementById("blueprintarea")) return;
        if(excludedTypes && excludedTypes.includes(currentPlanet.type)) return;
        var ok_btn = document.getElementById("popup_ok_button");
        var m_btn = document.createElement("li");
        var m_b1 = document.createElement("span");
        m_b1.className = ok_btn.firstChild.className;
        m_b1.textContent = "Master Export";
        m_btn.id = cname_m;
        m_btn.onclick = toggle_m;
        m_btn.className = "button";
        m_btn.appendChild(m_b1);
        ok_btn.parentNode.insertBefore(m_btn,ok_btn);
    });

    function toggle_m(){
        if(this.firstChild.textContent.includes("Click")){
            var blueprint = document.getElementById("blueprintarea").value;
            if(!blueprint) return;
            var planetList = game.planets;
            if(excludedTypes) planetList = planetList.filter((p) => !excludedTypes.includes(planets[p].type));
            planetList.forEach((p) => planets[p].importBlueprint(blueprint));
            document.getElementById("blueprintinfo").innerHTML = "<span class=\"green_text\"> Master Import Done! </span>";
            this.firstChild.textContent = "Master Import";
            return;
        }
        if(this.firstChild.textContent.includes("Master")){
            document.getElementById("blueprintinfo").innerHTML = "";
            this.firstChild.textContent = "Click again to execute Master Import";
            return;
        }
    }
    obs_m.observe(ele,config);

    function saveParam(){
        let savestring = {
            excludedTypes: excludedTypes
        };
        GM.setValue("s404",JSON.stringify(savestring));
    }

    async function loadParam(){
        let loadstring = JSON.parse(await GM.getValue("s404"));
        try {
            excludedTypes = loadstring["excludedTypes"];
        } catch(e){return;} //revert to given params if errors
    }
})();