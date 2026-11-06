// ==UserScript==
// @name         Steam Enhanced
// @namespace    https://sergiosusa.com
// @version      0.20
// @description  This script enhanced the famous marketplace steam with some extra features.
// @author       Sergio Susa (sergio@sergiosusa.com)
// @match        https://store.steampowered.com/account/history/
// @match        https://store.steampowered.com/account/registerkey*
// @match        https://steamcommunity.com/*tradingcards/boostercreator/
// @match        https://steamcommunity.com/id/*/gamecards*
// @match        https://steamcommunity.com/*
// @match        https://*.steampowered.com/*
// @grant        GM_setClipboard
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js
// ==/UserScript==

(function () {
    'use strict';

    class Renderer {
        constructor() {
            this.rendererList = [];
            this.globalRenderList = [];
        }

        render() {
            let renderer = this.findRenderer();

            renderer.forEach(renderer => {
                renderer.render();
            });

            this.globalRender();
        }

        findRenderer() {
            return this.rendererList.filter(renderer => renderer.canHandleCurrentPage());
        }

        globalRender() {
            return this.globalRenderList.map(renderer => renderer.render());
        }
    }

    class SteamEnhanced extends Renderer {
        constructor() {
            super();

            this.rendererList = [
                new WalletBalanceChart(),
                new MassiveActivator(),
                new BoosterPackPricesExtractor(),
                new TradeOffersHelper(),
                new GameCardLinks(),
                new BoosterPackFrequencyAnalyser(),
                new BadgeGameInformation()
            ];

            this.globalRenderList = [
                new RedeemButton()
            ];
        }
    }

    class Renderable {
        constructor(handlePage = "") {
            this.handlePage = handlePage;
        }

        canHandleCurrentPage() {
            return null !== document.location.href.match(this.handlePage);
        }

        showAlert(text) {
            alert(text);
        }
    }

    class BadgeGameInformation extends Renderable {
        constructor() {
            super(/https:\/\/steamcommunity\.com\/id\/(.*)\/gamecards\//g);
        }

        render() {
            const referenceElement = document.querySelector('.badge_detail_tasks');

            const htmlPanel = `<div id="steam-cards-summary-panel" style="border: 1px solid #2d2b2b; border-radius: 3px; min-width: 320px; padding: 12px; background-color: rgba(0, 0, 0, 0.3); color: #afafaf; font-size: 13px; line-height: 1.6;max-width: 50%;margin:8px auto;">
    <div style="color: #ffffff; font-weight: bold; border-bottom: 1px solid #2d2b2b; padding-bottom: 5px;">
        Collection Progress
    </div>

    <div>
        Cards Owned: <span id="cards-owned-count" style="color: #67c1f5; font-weight: bold;">0</span> / <span id="total-cards-count">0</span>
    </div>
    
    <div>
        Badges (Ready / Max): <span id="craftable-badges-count-ready" style="color: #a3cf06; font-weight: bold;">0</span> / <span id="potential-badges-count" style="color: #ebebeb;">0</span>
    </div>

    <div>
        Craftable Badges: <span id="craftable-badges-count" style="color: #a3cf06; font-weight: bold;">0</span>
    </div>
    
    <div>
        Extra Badges: <span id="extra-badges-count" style="color: #ebebeb; font-weight: bold;">0</span>
    </div>

    <div id="trade-limit-status" style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #2d2b2b;">
        Trade Status: <span id="trade-status-message">Checking...</span>
    </div>
</div>`;

            if (referenceElement) {
                referenceElement.insertAdjacentHTML('beforebegin', htmlPanel);
                this.updatePanel(this.calculateBadgeGameInformation());
            }
        }

        updatePanel(data) {
            const elements = {
                owned: document.getElementById('cards-owned-count'),
                total: document.getElementById('total-cards-count'),
                craftable: document.getElementById('craftable-badges-count'),
                extra: document.getElementById('extra-badges-count'),
                status: document.getElementById('trade-status-message'),
                ready: document.getElementById('craftable-badges-count-ready'),
                totalPotential: document.getElementById('potential-badges-count')
            };

            if (elements.owned) elements.owned.textContent = data.ownedCards;
            if (elements.total) elements.total.textContent = data.totalCards;
            if (elements.craftable) elements.craftable.textContent = data.craftable;
            if (elements.extra) elements.extra.textContent = data.extra;
            if (elements.ready) elements.ready.textContent = data.ready;
            if (elements.totalPotential) elements.totalPotential.textContent = data.totalPotential;

            if (elements.status) {
                elements.status.textContent = data.status.message;
                elements.status.style.color = data.status.color || '#afafaf';
            }
        }

        calculateBadgeGameInformation() {
            let totalCardsCount = this.getTotalCardsCount();
            let cardsOwnedCount = this.countOwnedCards();
            let totalCraftableBadges = Math.floor(cardsOwnedCount / totalCardsCount);

            let craftableBadgesCount = this.calculateCraftableBadges();
            let extraBadgesCount = this.calculateExtraBadgesCount(totalCraftableBadges, craftableBadgesCount);
            let tradeStatus = this.calculateStatus(totalCraftableBadges);
            let ready = this.calculateMinimumCardQuantity();

            return {
                totalCards: totalCardsCount,
                ownedCards: cardsOwnedCount,
                craftable: craftableBadgesCount,
                extra: extraBadgesCount,
                totalPotential: totalCraftableBadges,
                ready: ready,
                status: tradeStatus,
            };
        }

        getTotalCardsCount() {
            return document.querySelectorAll(".badge_card_set_card").length;
        }

        countOwnedCards() {
            const qtyElements = document.querySelectorAll(".badge_card_set_text_qty");
            return Array.from(qtyElements).reduce((sum, el) => {
                const match = el.innerText.match(/\d+/);
                return sum + (match ? parseInt(match[0], 10) : 0);
            }, 0);
        }

        extractCurrentBadgeLevel() {
            const element = document.querySelector('.badge_info_description div:nth-child(2)');

            if (!element) {
                return 0;
            }

            const text = element.innerText;

            const match = text.match(/Level\s+(\d+),/);

            if (match) {
                return parseInt(match[1], 10);
            }

            return 0;
        }

        calculateCraftableBadges(totalCraftableBadges) {
            let maxCraftableBadges = 5 - this.extractCurrentBadgeLevel();

            if (maxCraftableBadges === 0) {
                return 0;
            }

            if (maxCraftableBadges >= totalCraftableBadges) {
                return totalCraftableBadges;
            } else {
                return maxCraftableBadges;
            }
        }

        calculateStatus(totalCraftableBadges) {
            let minimumCardQuantity = this.calculateMinimumCardQuantity();
            let totalCardQuantity = this.countOwnedCards();

            if (totalCardQuantity === 0) {
                return {
                    message: "No cards available",
                    color: "#666666"
                };
            }

            if (minimumCardQuantity < totalCraftableBadges) {
                return {
                    message: "Trades available",
                    color: "#a3cf06"
                };
            }

            return {
                message: "Trades complete",
                color: "#67c1f5"
            };
        }

        calculateMinimumCardQuantity() {
            const qtyElements = document.querySelectorAll(".badge_card_set_text_qty");
            const totalCardsCount = this.getTotalCardsCount();

            if (qtyElements.length !== totalCardsCount) {
                return 0;
            }

            const quantities = Array.from(qtyElements).map(el => {
                const match = el.innerText.match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            });

            if (quantities.length === 0) return 0;

            return Math.min(...quantities);
        }

        calculateExtraBadgesCount(totalCraftableBadges, craftableBadgesCount) {
            let extraBadgesCount = totalCraftableBadges - craftableBadgesCount;
            if (extraBadgesCount < 0) {
                return 0;
            }
            return extraBadgesCount;
        }
    }

    class BoosterPackFrequencyAnalyser extends Renderable {
        constructor() {
            super(/https:\/\/steamcommunity\.com\/id\/(.*)\/inventoryhistory/g);
        }

        render() {
            let referenceNode = document.querySelector("#BG_bottom #mainContents #inventory_history_table");

            const containerNode = this.templateContainerNode();

            containerNode.innerHTML = '<div style="display: flex; justify-content: center; flex-direction: column;">' +
                '<div id="analysis-result"></div>' +
                '<div style="display: flex;justify-content: space-evenly;">' +
                '<a id="load-more-and-re-calculate" class="btn_darkblue_white_innerfade btn_medium new_trade_offer_btn" href="javascript:void(0)"><span>Load more and Recalculate</span></a>' +
                '<a id="show-booster-packs" class="btn_darkblue_white_innerfade btn_medium new_trade_offer_btn" href="javascript:void(0)"><span>Show Only Booster packs</span></a>' +
                '</div>' +
                '</div>';
            referenceNode.parentNode.insertBefore(containerNode, referenceNode);

            document.querySelector("#show-booster-packs").addEventListener('click', () => this.hideNonBoosterPackEntrance());
            document.querySelector("#load-more-and-re-calculate").addEventListener('click', () => this.loadMoreHistoryAndReCalculate());
            document.querySelector("#analysis-result").innerHTML = this.renderBoosterStats(this.extractBooterPackInformation());
        }

        async loadMoreHistoryAndReCalculate() {
            if (typeof InventoryHistory_LoadMore === "function") {
                InventoryHistory_LoadMore();
            } else if (typeof unsafeWindow !== "undefined" && typeof unsafeWindow.InventoryHistory_LoadMore === "function") {
                unsafeWindow.InventoryHistory_LoadMore();
            }

            await this.waitForNewHistoryRows();
            const analysisResult = document.querySelector("#analysis-result");
            if (analysisResult) {
                analysisResult.innerHTML = this.renderBoosterStats(this.extractBooterPackInformation());
            }
        }

        waitForNewHistoryRows(timeout = 3000) {
            return new Promise((resolve) => {
                const table = document.querySelector("#inventory_history_table");
                if (!table) {
                    setTimeout(resolve, timeout);
                    return;
                }

                let timer;
                const observer = new MutationObserver(() => {
                    clearTimeout(timer);
                    observer.disconnect();
                    resolve();
                });

                observer.observe(table, { childList: true, subtree: true });

                timer = setTimeout(() => {
                    observer.disconnect();
                    resolve();
                }, timeout);
            });
        }

        hideNonBoosterPackEntrance() {
            const rows = document.querySelectorAll('.tradehistoryrow');

            rows.forEach(row => {
                const description = row.querySelector('.tradehistory_event_description');

                if (description && description.textContent.includes('Earned a booster pack')) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        renderBoosterStats(packs) {
            if (!packs || packs.length === 0) return '<div>No hay booster packs registrados.</div>';

            packs.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

            const totalPacks = packs.length;

            const gamesSet = new Set(packs.map(p => p.gameName));
            const totalGames = gamesSet.size;

            const intervals = [];
            for (let i = 1; i < packs.length; i++) {
                const diffMs = new Date(packs[i].fullDate) - new Date(packs[i - 1].fullDate);
                intervals.push(diffMs / (1000 * 60 * 60 * 24));
            }
            const avgInterval = intervals.length > 0 ? (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(2) : 'N/A';

            const lastPack = packs[packs.length - 1];
            const lastDateStr = new Date(lastPack.fullDate).toLocaleString();

            const nextPackDate = intervals.length > 0 ? new Date(new Date(lastPack.fullDate).getTime() + intervals.reduce((a, b) => a + b, 0) / intervals.length * 24 * 60 * 60 * 1000) : null;
            const nextPackStr = nextPackDate ? nextPackDate.toLocaleString() : 'N/A';

            let html = `
    <div style="background-color: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 10px; color: #fff; font-family: sans-serif;text-align: center;">
      <h3 style="margin-top:0;">Booster Pack Statistics</h3>
      <p><strong>Total packs:</strong> ${totalPacks}</p>
      <p><strong>Distinct games with packs:</strong> ${totalGames} (${[...gamesSet].join(', ')})</p>
      <p><strong>Average days between packs:</strong> ${avgInterval}</p>
      <p><strong>Last pack received:</strong> ${lastDateStr} (${lastPack.gameName})</p>
      <p><strong>Next estimated pack:</strong> ${nextPackStr}</p>
  `;

            html += '</div>';

            return html;
        }

        extractBooterPackInformation() {
            const boosterPacks = [];

            document.querySelectorAll('.tradehistoryrow').forEach(row => {
                const description = row.querySelector('.tradehistory_event_description');

                if (description && description.textContent.includes('Earned a booster pack')) {
                    const dateNode = row.querySelector('.tradehistory_date');
                    const dateText = dateNode ? dateNode.childNodes[0].textContent.trim() : '';
                    const timeNode = row.querySelector('.tradehistory_timestamp');
                    const timeText = timeNode ? timeNode.textContent.trim() : '';

                    const [day, monthStr, year] = dateText.replace(',', '').split(' ');
                    const months = {
                        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
                    };
                    const month = months[monthStr];

                    let [time, ampm] = [timeText.slice(0, -2), timeText.slice(-2).toLowerCase()];
                    let [hours, minutes] = time.split(':').map(Number);
                    if (ampm === 'pm' && hours < 12) hours += 12;
                    if (ampm === 'am' && hours === 12) hours = 0;

                    const fullDate = new Date(year, month, Number(day), hours, minutes);

                    const itemNameNode = row.querySelector('.history_item_name');
                    let gameName = itemNameNode ? itemNameNode.textContent.trim() : '';
                    gameName = gameName.replace(/\s*Booster Pack$/i, '').trim();

                    boosterPacks.push({
                        gameName,
                        dateText,
                        timeText,
                        fullDate
                    });
                }
            });

            return boosterPacks;
        }

        templateContainerNode() {
            const containerNode = document.createElement('div');
            containerNode.style.cssText = `
          position: relative;
          background-color: rgba(0, 0, 0, 0.3);
          padding-left: 0;
          padding-top: 0px;
          padding-bottom: 7px;
          min-height: 36px;
          margin-bottom: 2px;
        `;
            return containerNode;
        }
    }

    class GameCardLinks extends Renderable {
        constructor() {
            super(/https:\/\/steamcommunity\.com\/id\/(.*)\/gamecards\//g);
        }

        render() {
            let container = document.querySelector(".profile_small_header_text");
            container.innerHTML += this.template();
        }

        template() {
            let appId = document.location.pathname.match(/\/id\/(.*)\/gamecards\/(\d+)/)[2];

            return '<div class="apphub_OtherSiteInfo" style="float: right;margin-left: 5px;"><a class="btnv6_blue_hoverfade btn_medium" href="https://www.steamcardexchange.net/index.php?inventorygame-appid-' + appId + '"\n' +
                '           target="_blank">\n' +
                '            <span>Steam Card Exchange</span>\n' +
                '        </a></div>';
        }
    }

    class TradeOffersHelper extends Renderable {
        constructor() {
            super(/https:\/\/steamcommunity\.com\/id\/(.*)\/tradeoffers/g);
        }

        render() {
            let tradeItems = document.querySelectorAll(".trade_item");

            for (let index = 0; index < tradeItems.length && index < 30; index++) {
                let tradeItem = tradeItems[index];

                let itemInfo = tradeItem.getAttribute("data-economy-item").match(/classinfo\/(\d*)\/(\d*)/);

                fetch(
                    "https://steamcommunity.com/economy/itemclasshover/[APP]/[CLASS]/0?content_only=1&l=english"
                        .replace("[APP]", itemInfo[1])
                        .replace("[CLASS]", itemInfo[2])
                ).then(function (response) {
                    return response.text();
                }).then((text) => {
                    tradeItem.innerHTML = this.template(text.match(/app_(\d*)/)[1]) + tradeItem.innerHTML;
                    tradeItem.style.height = "95px";
                }).catch(function (err) {
                    console.warn('Something went wrong.', err);
                });
            }
        }

        template(appid) {
            return "<div style='text-align:center;'>" +
                "<a target='_blank' href='https://www.steamcardexchange.net/index.php?inventorygame-appid-" + appid + "'>" +
                "<img style='width: 16px;' src='https://www.steamcardexchange.net/favicon-16x16.png' />" +
                "</a>" +
                "<a target='_blank' href='https://steamcommunity.com/my/gamecards/" + appid + "'>" +
                "<img style='width: 16px;' src='https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxH5rd9eDAjcFyv45SRYAFMIcKL_PArgVSL403ulRUWEndVKv6gpycAAojcwZW4uKnfQYxh6qfI24W7Y7hzIPTz_TwZb-Ix24HuZYl0--ZoMLlhlOh3Pqokg/16fx16fdpx2x' />" +
                "</a>" +
                "</div>";
        }
    }

    class MassiveActivator extends Renderable {
        constructor() {
            super(/https:\/\/store.steampowered\.com\/account\/registerkey(\?.*)*/g);
            this.keyList = [];
            this.gamesActived = [];
        }

        render() {
            this.fillRequiredFields();

            let referenceBlock = document.querySelector("#purchase_confirm_ssa").previousElementSibling;
            let contentDiv = document.createElement("div");
            contentDiv.id = "massiveActivatorContainer";
            contentDiv.setAttribute("style", "display: flex;align-items: flex-end;");
            contentDiv.innerHTML = '<div style="width: 452px;"><br><label for="textarea-keys">Product Codes (separated by comma)</label><textarea id="textarea-keys"></textarea><br \></div><div class="button_row"><a id="activatingButton" class="btnv6_blue_hoverfade btn_medium" href="#" ><span>Continue</span></a></div>';
            referenceBlock.append(contentDiv);

            let activatingButton = document.querySelector("#activatingButton");
            activatingButton.onclick = () => this.startActivating();

            this.fillKeysField();
        }

        async startActivating() {
            let textarea = document.querySelector("#textarea-keys");
            let keys = textarea ? textarea.value : "";

            if (!keys.trim()) {
                this.showAlert("There are no keys to activate.");
                return;
            }

            this.keyList = keys.split(",").map(key => key.trim()).filter(key => key.length > 0);

            if (this.keyList.length === 0) {
                this.showAlert("There are no keys to activate.");
                return;
            }

            const container = document.querySelector("#massiveActivatorContainer");
            if (container) {
                container.style.opacity = "0.2";
            }

            for (const key of this.keyList) {
                await this.activateKey(key);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            if (container) {
                container.style.opacity = "1";
            }

            if (this.gamesActived.length > 0) {
                this.showAlert("The activation process has finished.\n\nThe following games have been activated:\n" + this.gamesActived.join("\n"));
                this.gamesActived = [];
            } else {
                this.showAlert("No key has been activated successfully");
            }
        }

        async activateKey(key) {
            const productKeyInput = document.querySelector("#product_key");
            const acceptSsa = document.querySelector("#accept_ssa");

            if (acceptSsa) {
                acceptSsa.checked = true;
            }
            if (productKeyInput) {
                productKeyInput.value = key;
            }

            if (typeof RegisterProductKey === "function") {
                RegisterProductKey();
            } else if (typeof unsafeWindow !== "undefined" && typeof unsafeWindow.RegisterProductKey === "function") {
                unsafeWindow.RegisterProductKey();
            }

            await this.waitForActivationResult();
        }

        waitForActivationResult(timeout = 5000) {
            return new Promise((resolve) => {
                let resolved = false;

                const finish = () => {
                    if (resolved) return;
                    resolved = true;
                    if (observer) observer.disconnect();
                    clearTimeout(timer);

                    const responseContainer = document.querySelector("div.registerkey_lineitem");
                    if (responseContainer) {
                        const gameName = responseContainer.innerHTML.trim();
                        if (gameName && this.gamesActived.indexOf(gameName) === -1) {
                            this.gamesActived.push(gameName);
                        }
                    }
                    resolve();
                };

                const observer = new MutationObserver(() => {
                    const lineItem = document.querySelector("div.registerkey_lineitem");
                    const errorDisplay = document.querySelector("#error_display, #registerkey_error");
                    const isErrorVisible = errorDisplay && (errorDisplay.style.display !== "none" && errorDisplay.textContent.trim().length > 0);

                    if (lineItem || isErrorVisible) {
                        finish();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true
                });

                const timer = setTimeout(finish, timeout);
            });
        }

        fillRequiredFields() {
            const acceptSsa = document.querySelector("#accept_ssa");
            if (acceptSsa) {
                acceptSsa.checked = true;
            }

            const observer = new MutationObserver(() => {
                const checkbox = document.querySelector("#accept_ssa");
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        fillKeysField() {
            let urlSearchParams = new URLSearchParams(window.location.search);

            if (urlSearchParams.has("key")) {
                document.querySelector("#textarea-keys").innerText = urlSearchParams.get("key");
            }
        }
    }

    class WalletBalanceChart extends Renderable {
        constructor() {
            super(/https:\/\/store\.steampowered\.com\/account\/history\//g);

            this.labels = [];
            this.delta = [];
            this.wallet = [];
        }

        render() {
            let contentDiv = document.createElement("div");
            contentDiv.setAttribute("style", "height: 500px;width: 500px;margin: 0 auto;");
            contentDiv.innerHTML = '<canvas id="myChart" width="400" height="400"></canvas>';
            document.querySelector(".page_header_ctn").appendChild(contentDiv);

            this.initializeChart();
        }

        collectData() {
            let rows = document.querySelectorAll(".wallet_history_table tbody tr:not(#more_history)");

            let labels = [];
            let delta = [];
            let wallet = [];

            let index = -1;
            let lastDate = "";

            rows.forEach((row) => {

                let currentDate = row.querySelector(".wht_date").innerText.replace(/\d+\s/i, "");

                if (row.querySelector(".wht_wallet_change") === null || row.querySelector(".wht_wallet_balance") === null) {
                    return;
                }

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
        }

        initializeChart() {
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
        }
    }

    class BoosterPackPricesExtractor extends Renderable {
        constructor() {
            super(/https:\/\/steamcommunity\.com\/(\/)?tradingcards\/boostercreator(\/)?/g);
        }

        render() {
            let container = document.querySelector(".goostatus_right");
            let paragraph = document.createElement('p');
            paragraph.innerHTML = '<a id="extractButton" href="javascript:void()">Extract the games\' list with the price in gems to the clipboard.</a>';
            container.appendChild(paragraph);
            document.querySelector('#extractButton').onclick = () => this.extract();
        }

        extract() {
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
        }
    }

    class RedeemButton extends Renderable {
        constructor() {
            super(/.*/g);
        }

        render() {
            switch (window.location.pathname) {
                case "/chat/":
                    this.renderButtonInChatPage();
                    break;
                default:
                    this.renderButtonStandardPage();
            }
        }

        renderButtonStandardPage() {
            let pivotElement = document.querySelector(".supernav_container a.username");

            if (null == pivotElement) {
                return;
            }

            let redeemLink = this.getRedeemBaseButton();
            redeemLink.className = "menuitem";
            redeemLink.href = "https://store.steampowered.com/account/registerkey?key=";
            pivotElement.parentNode.insertBefore(redeemLink, pivotElement.nextSibling);
        }

        renderButtonInChatPage() {
            let pivotElement = document.querySelector('a[href="https://help.steampowered.com/"]');

            if (pivotElement) {
                this.insertChatButton(pivotElement);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                let element = document.querySelector('a[href="https://help.steampowered.com/"]');
                if (element) {
                    obs.disconnect();
                    this.insertChatButton(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        insertChatButton(pivotElement) {
            let redeemLink = this.getRedeemBaseButton();
            redeemLink.className = pivotElement.className;
            pivotElement.parentNode.insertBefore(redeemLink, pivotElement);
        }

        getRedeemBaseButton() {
            let redeemLink = document.createElement("a");
            redeemLink.href = "https://store.steampowered.com/account/registerkey?key=";
            redeemLink.innerText = "redeem";
            redeemLink.target = "_blank";
            return redeemLink;
        }
    }

    try {
        let steamEnhanced = new SteamEnhanced();
        steamEnhanced.render();
    } catch (exception) {
        console.error('[Steam Enhanced]', exception);
    }
})();