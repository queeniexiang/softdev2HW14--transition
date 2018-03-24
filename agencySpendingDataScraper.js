/**
 * Copy this into the console of http://federal-budget.insidegov.com/ and run.
 * It'll scrape and download all the agency spending data,
 * but it'll probably get stopped because
 * the website severely restricts (sometimes < 1 request/min) repeated requests from the same IP address.
 */
(function scrapeAgencySpendingData() {
    
    Function.prototype.applyReturning = function() {
        return (arg) => {
            this(arg);
            return arg;
        };
    };
    
    const newElement = document.createElement.bind(document);
    
    const parseCost = function(cost) {
        const [value, multiplier, unit] = cost.split(" ");
        if (value[0] !== "$" || unit !== "USD") {
            if (1 == 1) {
                throw new Error("non USD cost: " + cost);
            }
            return NaN;
        }
        return parseFloat(value.slice(1)) * ({
            trillion: 1e12,
            billion: 1e9,
            million: 1e6,
            thousand: 1e3,
        })[multiplier];
    };
    
    const iFrameLoad = function(sourceCode) {
        return !sourceCode ? null : new Promise(resolve => {
            const iframe = newElement("iframe");
            iframe.srcdoc = sourceCode;
            iframe.onerror = console.log;
            iframe.onload = () => resolve(iframe);
            div.appendChild(iframe);
            // console.log(iframe);
        });
    };
    
    const agencySpendingTableParser = {
        
        usingIFrame(html) {
            return Promise.resolve(html)
                .then(iFrameLoad)
                .then(iframe => [iframe/*.remove()*/, iframe][1])
                .then(iframe => iframe.contentDocument)
                .then(doc => {
                    console.log(doc);
                    let heading = doc.querySelectorAll("h3")
                        .find(h3 => h3.innerText === "By Agency");
                    if (!heading) {
                        return;
                    }
                    return heading.nextSibling.children[1];
                });
        },
        
        parsingManually(html) {
            return Promise.resolve(html)
                .then(html => {
                    if (window.debug) {
                        console.log(html);
                    }
                    const preStartsWith = "By Agency</h3>";
                    const preStart = html.indexOf(preStartsWith);
                    if (preStart === -1) {
                        return;
                    }
                    // return "fail fast";
                    const startsWith = "<noscript>";
                    const endsWith = "</noscript";
                    const start = html.indexOf(startsWith, preStart + preStartsWith.length) + startsWith.length;
                    const end = html.indexOf(endsWith, start);
                    // console.log(preStart, start, end);
                    return html.slice(start, end);
                })
                .then(console.log.applyReturning())
                .then(iFrameLoad)
                .then(iframe => !iframe ? null : iframe.contentDocument.body.firstChild);
        },
        
    };
    
    const sleep = function(nextInterval, numIntervals) {
        if (numIntervals === 0) {
            return Promise.resolve();
        }
        const interval = nextInterval();
        console.log(interval);
        return new Promise(resolve => timeoutIDs.push(setTimeout(resolve, interval)))
            .then(() => sleep(nextInterval, numIntervals - 1));
    };
    
    window.interval = window.interval || 1000 * 60;
    window.timeoutIDs = window.timeoutIDs || [];
    timeoutIDs.clear = function() {
        timeoutIDs.forEach(clearTimeout);
    };
    const div = document.body.appendChild(newElement("div"));
    const firstYearIndex = 1;
    const lastYearIndex = 124;
    Promise.all(new Array(lastYearIndex - firstYearIndex + 1)
        .fill(null)
        .map((e, i) => i)
        .map(i => sleep(() => interval, i + 1)
            .then(() => lastYearIndex - i)
            .then(yearIndex => "l/" + yearIndex)
            .then(url => window.location.href + url)
            .then(console.log.applyReturning())
            .then(fetch)
            .then(response => response.text())
            .then(agencySpendingTableParser.parsingManually)
            .then(table => {
                if (!table) {
                    return null;
                }
                console.log(table);
                const [[_, ...names], [year, ...costs]] = new Array(...table.children)
                    .map(e => e.firstChild)
                    .map(e => e.children)
                    .map(children => new Array(...children))
                    .map(children => children.map(e => e.innerText));
                return {
                    year: year,
                    agencies: costs.map(parseCost).map((cost, i) => ({
                        name: names[i],
                        cost: cost,
                    })),
                };
            })
            .then(console.log.applyReturning())
        ))
        .then(yearData => yearData.filter(data => !!data))
        .then(JSON.stringify)
        .then(json => `
                window.data = window.data || {};
                data.agencySpending = data.agencySpending || [];
                data.agencySpending.push(...$);
                       `.replace("$", json))
        .then(js => {
            const download = newElement("a");
            download.download = "data.agencySpending.js";
            download.href = "data:text/plain;charset=utf-8," + encodeURIComponent(js);
            download.style.display = "none";
            div.appendChild(download);
            download.click();
            download.remove();
        });
    
})();