// ==UserScript==
// @name         Steam Enhanced
// @namespace    https://sergiosusa.com
// @version      0.1
// @description  This script enhanced the famous marketplace steam with some extra features.
// @author       Sergio Susa (sergio@sergiosusa.com)
// @match        https://store.steampowered.com/account/history/
// @match        https://store.steampowered.com/account/registerkey
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js
// ==/UserScript==

(function () {
    'use strict';
    try {
        let steamEnhanced = new SteamEnhanced();
        steamEnhanced.render();
    } catch (exception) {
        alert(exception);
    }
})();

function SteamEnhanced() {

    this.rendererList = [
        new HistoryChart(),
        new MassiveActivator()
    ];

    this.render = () => {
        let renderer = this.findRenderer();
        renderer.render();
    }

    this.findRenderer = () => {
        return this.rendererList.find(renderer => renderer.canHandleCurrentPage());
    };
}

function Renderer() {
    this.handlePage = "";

    this.canHandleCurrentPage = () => {
        return document.location.href.includes(this.handlePage);
    };

    this.showAlert = (text) => {
        alert(text);
    }
}

function MassiveActivator() {
    Renderer.call(this);
    this.handlePage = "https://store.steampowered.com/account/registerkey";
    this.processId = null;
    this.keyList = [];
    this.gamesActived = [];

    this.render = () => {
        this.fillRequiredFields();

        let referenceBlock = document.querySelector("#purchase_confirm_ssa").previousElementSibling;
        let contentDiv = document.createElement("div");
        contentDiv.id = "massiveActivatorContainer";
        contentDiv.setAttribute("style", "display: flex;align-items: flex-end;");
        contentDiv.innerHTML = '<div style="width: 452px;"><br><label for="textarea-keys">Product Codes (separated by comma)</label><textarea id="textarea-keys"></textarea><br \></div><div class="button_row"><a id="activatingButton" class="btnv6_blue_hoverfade btn_medium" href="#" ><span>Continue</span></a></div>';
        referenceBlock.append(contentDiv);

        let activatingButton = document.querySelector("#activatingButton");
        activatingButton.onclick = this.startActivating;
    };

    this.startActivating = () => {

        let keys = document.querySelector("#textarea-keys").value;

        if (!keys) {
            this.showAlert("There are no keys to activate.")
            return;
        }

        let keyList = keys.split(",");

        document.querySelector("#massiveActivatorContainer").style.opacity = "0.2";

        this.processId = setInterval((() => {

            if (this.keyList.length === 0) {
                clearInterval(this.processId);
                document.querySelector("#massiveActivatorContainer").style.opacity = "1";
                if (this.gamesActived.length > 0) {
                    this.showAlert("The activation process has finished.\n\nThe following games have been activated:\n" + this.gamesActived.join("\n"));
                } else {
                    this.showAlert("No key has been activated successfully");
                }
                return;
            }

            let key = keyList.shift();
            document.querySelector("#product_key").value = key.trim();
            RegisterProductKey();

            setTimeout((() => {
                let gameName = document.querySelector("div.registerkey_lineitem").innerHTML;
                if (this.gamesActived.indexOf(gameName) === -1) {
                    this.gamesActived.push(gameName);
                }
            }).bind(this), 3000);


        }).bind(this), 5000);
    };

    this.fillRequiredFields = () => {
        document.querySelector("#accept_ssa").checked = true;
    };
}

MassiveActivator.prototype = Object.create(Renderer.prototype);

function HistoryChart() {
    Renderer.call(this);
    this.handlePage = "https://store.steampowered.com/account/history/";

    this.labels = [];
    this.delta = [];
    this.wallet = [];

    this.render = () => {

        let contentDiv = document.createElement("div");
        contentDiv.setAttribute("style", "height: 500px;width: 500px;margin: 0 auto;");
        contentDiv.innerHTML = '<canvas id="myChart" width="400" height="400"></canvas>';
        document.querySelector(".page_header_ctn").appendChild(contentDiv);

        this.initializeChart();

    };

    this.collectData = () => {

        let rows = document.querySelectorAll(".wallet_history_table tbody tr:not(#more_history)");

        let labels = [];
        let delta = [];
        let wallet = [];

        let index = -1;
        let lastDate = "";

        rows.forEach((row) => {

            let currentDate = row.querySelector(".wht_date").innerText.replace(/\d+\s/i, "");
            let currentDelta = parseFloat(row.querySelector(".wht_wallet_change").innerText.replace("€", "").replace(",", "."));
            let currentWallet = parseFloat(row.querySelector(".wht_wallet_balance").innerText.replace("€", "").replace(",", "."));

            if (lastDate !== currentDate) {
                index++;
                lastDate = currentDate;
                labels[index] = currentDate;
            }

            if (delta[index] === undefined) {
                delta[index] = 0.0;
            }

            if (wallet[index] === undefined) {
                wallet[index] = currentWallet;
            }

            delta[index] += currentDelta;

        });

        this.labels = labels.reverse();
        this.delta = delta.reverse();
        this.wallet = wallet.reverse();

    };

    this.initializeChart = () => {
        this.collectData();
        const ctx = document.getElementById('myChart').getContext('2d');

        const myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.labels,
                datasets: [
                    {
                        label: 'Change',
                        data: this.delta,
                        fill: false,
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    },
                    {
                        label: 'Wallet',
                        data: this.wallet,
                        fill: false,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };
}

HistoryChart.prototype = Object.create(Renderer.prototype);