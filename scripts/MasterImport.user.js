// ==UserScript==
// @name         MasterImport
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds a button to import blueprint everywhere in HotG
// @author       stronzio, betatesting by dekember
// @match        https://game288398.konggames.com/gamez/0028/8398/live/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
//////////

    var excludedTypes = ["carbon","ammonia"]; //planet types excluded from the master import (blueprint wont be applied to them) => to turn it off simply comment out this row (write // before var)

//////////


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
})();