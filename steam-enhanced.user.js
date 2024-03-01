// ==UserScript==
// @name         Steam Enhanced
// @namespace    https://sergiosusa.com
// @version      0.13
// @description  This script enhanced the famous marketplace steam with some extra features.
// @author       Sergio Susa (sergio@sergiosusa.com)
// @match        https://store.steampowered.com/account/history/
// @match        https://store.steampowered.com/account/registerkey*
// @match        https://steamcommunity.com/*tradingcards/boostercreator/
// @match        https://steamcommunity.com/*
// @match        https://*.steampowered.com/*
// @grant        GM_setClipboard
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
    Renderer.call(this);

    this.rendererList = [
        new HistoryChart(),
        new MassiveActivator(),
        new BoosterPackPricesExtractor(),
        new TradeOffersHelper(),
        new GameCardLinks(),
    ];

    this.globalRenderList = [
        new RedeemButton()
    ];
}

SteamEnhanced.prototype = Object.create(Renderer.prototype);

function Renderer() {
    this.rendererList = [];
    this.globalRenderList = [];

    this.render = () => {
        let renderer = this.findRenderer();
        if (renderer) {
            renderer.render();
        }
        this.globalRender();
    }

    this.findRenderer = () => {
        return this.rendererList.find(renderer => renderer.canHandleCurrentPage());
    };

    this.globalRender = function () {
        return this.globalRenderList.map(renderer => renderer.render());
    }
}

function Renderable() {
    this.handlePage = "";

    this.canHandleCurrentPage = () => {
        return null !== document.location.href.match(this.handlePage);
    };

    this.showAlert = (text) => {
        alert(text);
    }
}

function GameCardLinks() {
    Renderable.call(this);

    this.handlePage = /https:\/\/steamcommunity\.com\/id\/(.*)\/gamecards\//g

    this.render = () => {
        let container = document.querySelector(".profile_small_header_text");
        container.innerHTML += this.template();
    }

    this.template = () => {

        let appId = document.location.pathname.match(/\/id\/(.*)\/gamecards\/(\d+)\//)[2];

        return '<div class="apphub_OtherSiteInfo" style="float: right;margin-left: 5px;"><a class="btnv6_blue_hoverfade btn_medium" href="https://www.steamcardexchange.net/index.php?inventorygame-appid-' + appId + '"\n' +
            '           target="_blank">\n' +
            '            <span>Steam Card Exchange</span>\n' +
            '        </a></div>';
    }
}

GameCardLinks.prototype = Object.create(Renderable.prototype);

function TradeOffersHelper() {
    Renderable.call(this);

    this.handlePage = /https:\/\/steamcommunity\.com\/id\/(.*)\/tradeoffers\//g

    this.render = () => {

        let tradeItems = document.querySelectorAll(".trade_item");

        for (let index = 0; index < tradeItems.length && index < 30 ; index++) {
            let tradeItem = tradeItems[index];

            let itemInfo = tradeItem.getAttribute("data-economy-item").match(/classinfo\/(\d*)\/(\d*)/);

            fetch(
                "https://steamcommunity.com/economy/itemclasshover/[APP]/[CLASS]/0?content_only=1&l=english"
                    .replace("[APP]", itemInfo[1])
                    .replace("[CLASS]", itemInfo[2])
            ).then(function (response) {
                return response.text();
            }).then(function (text) {
                tradeItem.innerHTML = tradeItem.innerHTML + template(text.match(/app_(\d*)/)[1]);
                tradeItem.style.height = "95px";
            }).catch(function (err) {
                console.warn('Something went wrong.', err);
            });
        }
    };

    function template(appid) {
        return  "<div style='text-align:center;'>" +
        "<a target='_blank' href='https://www.steamcardexchange.net/index.php?inventorygame-appid-" + appid + "'>" +
        "<img style='width: 16px;' src='https://www.steamcardexchange.net/favicon-16x16.png' />" +
        "</a>" +
        "<a target='_blank' href='https://steamcommunity.com/my/gamecards/" + appid + "'>" +
        "<img style='width: 16px;' src='https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxH5rd9eDAjcFyv45SRYAFMIcKL_PArgVSL403ulRUWEndVKv6gpycAAojcwZW4uKnfQYxh6qfI24W7Y7hzIPTz_TwZb-Ix24HuZYl0--ZoMLlhlOh3Pqokg/16fx16fdpx2x' />" +
        "</a>" +
        "</div>";
    }
}

TradeOffersHelper.prototype = Object.create(Renderable.prototype);

function MassiveActivator() {
    Renderable.call(this);
    this.handlePage = /https:\/\/store.steampowered\.com\/account\/registerkey(\?.*)*/g;
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

        this.fillKeysField();

    };

    this.startActivating = () => {

        let keys = document.querySelector("#textarea-keys").value;

        if (!keys) {
            this.showAlert("There are no keys to activate.")
            return;
        }

        this.keyList = keys.split(",");

        document.querySelector("#massiveActivatorContainer").style.opacity = "0.2";

        this.processId = setInterval((() => {

            if (this.keyList.length === 0) {
                clearInterval(this.processId);
                document.querySelector("#massiveActivatorContainer").style.opacity = "1";
                if (this.gamesActived.length > 0) {
                    this.showAlert("The activation process has finished.\n\nThe following games have been activated:\n" + this.gamesActived.join("\n"));
                    this.gamesActived = [];
                } else {
                    this.showAlert("No key has been activated successfully");
                }
                return;
            }

            let key = this.keyList.shift();
            document.querySelector("#product_key").value = key.trim();
            RegisterProductKey();

            setTimeout((() => {
                let responseContainer = document.querySelector("div.registerkey_lineitem");

                if (responseContainer) {
                    let gameName = responseContainer.innerHTML;
                    if (this.gamesActived.indexOf(gameName) === -1) {
                        this.gamesActived.push(gameName);
                    }
                }

            }).bind(this), 3000);

        }).bind(this), 5000);
    };

    this.fillRequiredFields = () => {
        setInterval(() => {
            document.querySelector("#accept_ssa").checked = true;
        }, 500);
    };

    this.fillKeysField = () => {
        let urlSearchParams = new URLSearchParams(window.location.search);

        if (urlSearchParams.has("key")) {
            document.querySelector("#textarea-keys").innerText = urlSearchParams.get("key");
        }
    };
}

MassiveActivator.prototype = Object.create(Renderable.prototype);

function HistoryChart() {
    Renderable.call(this);
    this.handlePage = /https:\/\/store\.steampowered\.com\/account\/history\//g;

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

HistoryChart.prototype = Object.create(Renderable.prototype);

function BoosterPackPricesExtractor() {
    Renderable.call(this);

    this.handlePage = /https:\/\/steamcommunity\.com\/(\/)?tradingcards\/boostercreator(\/)?/g;

    this.render = () => {

        let container = document.querySelector(".goostatus_right");
        let paragraph = document.createElement('p');
        paragraph.innerHTML = '<a id="extractButton" href="javascript:void()">Extract the games\' list with the price in gems to the clipboard.</a>';
        container.appendChild(paragraph);
        document.querySelector('#extractButton').onclick = this.extract;
    }

    this.extract = () => {
        let boosterGameSelector = document.querySelector("#booster_game_selector");
        let result = [];

        for (let index = 1; index < boosterGameSelector.options.length; index++) {

            let boosterGameNode = CBoosterCreatorPage.CreateBoosterOption(boosterGameSelector.options[index].value, false);
            if (boosterGameNode && boosterGameNode[0] !== undefined) {
                result.push(boosterGameSelector.options[index].text + "\t" + parseInt((/\d+\.*\d+/g).exec(boosterGameNode[0].innerText)[0].replace(".", "")));
            }
        }
        GM_setClipboard(result.join("\n"));
        alert("Game list copied");
    };
}

BoosterPackPricesExtractor.prototype = Object.create(Renderable.prototype);

function RedeemButton() {
    Renderable.call(this);

    this.handlePage = /.*/g;

    this.render = () => {

        switch (window.location.pathname) {
            case "/chat/":
                this.renderButtonInChatPage();
                break;
            default:
                this.renderButtonStandardPage();
        }
    }

    this.renderButtonStandardPage = () => {
        let pivotElement = document.querySelector(".supernav_container a.username");

        if (null == pivotElement) {
            return;
        }

        let redeemLink = this.getRedeemBaseButton();
        redeemLink.className = "menuitem";
        redeemLink.href = "https://store.steampowered.com/account/registerkey?key=";
        pivotElement.parentNode.insertBefore(redeemLink, pivotElement.nextSibling);
    }

    this.renderButtonInChatPage = () => {
        let intervalId = setInterval((() => {
            let pivotElement = document.querySelector('#friendslist-container > div > div[class*="main_SteamPageHeader"] > a:nth-child(4)');

            if (null == pivotElement) {
                return;
            }

            clearInterval(intervalId);

            let redeemLink = this.getRedeemBaseButton();
            redeemLink.className = pivotElement.className;
            pivotElement.parentNode.insertBefore(redeemLink, pivotElement.nextSibling);
        }).bind(this), 2000);
    }

    this.getRedeemBaseButton = () => {
        let redeemLink = document.createElement("a");
        redeemLink.href = "https://store.steampowered.com/account/registerkey?key=";
        redeemLink.innerText = "redeem";
        redeemLink.target = "_blank";
        return redeemLink;
    }
}

BoosterPackPricesExtractor.prototype = Object.create(RedeemButton.prototype);