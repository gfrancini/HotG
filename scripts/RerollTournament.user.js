// ==UserScript==
// @name         RerollTournament
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Reroll button for tournament in HoTg
// @author       stronzio
// @match        https://game288398.konggames.com/gamez/0028/8398/live/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var cname = "reroll_btn";
    var obs = new MutationObserver(function(mutation){
        if(document.getElementById(cname)) return;
        var b_btn = document.getElementById("fight_button");
        if(!b_btn) return;
        var r_btn = document.createElement("li");
        r_btn.id = cname;
        r_btn.className = "button";
        var b1 = document.createElement("span");
        b1.textContent = "Reroll opponent";
        b1.className = "blue_text";
        r_btn.style.position = "absolute";
        r_btn.style.top = "80px";
        r_btn.style.left = "60%";
        b1.onclick = reroll;
        r_btn.appendChild(b1);
        b_btn.parentNode.appendChild(r_btn);
    });

    function reroll(){
        qurisTournament.fleet = null;
        generateQurisTournamentFleet();
        $("#b_tournament_icon").click();
    }

    var ele = document.getElementById("profile_interface");
    var config = { childList: true, subtree: true };
    obs.observe(ele, config);
})();