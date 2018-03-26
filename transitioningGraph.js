Object.getting = function(property) {
    return o => o[property];
};

Object.deleting = function(property) {
    return o => {
        delete o[property];
        return o;
    };
};

Object.fieldsMapping = function(mapper) {
    return o => {
        for (const field in o) {
            if (o.hasOwnProperty(field)) {
                o[field] = mapper(o[field]);
            }
        }
        return o;
    };
};

Object.fieldsMappingExcluding = function(mapper, ...excludedFields) {
    const excludedFieldsSet = new Set(excludedFields);
    const exclude = excludedFieldsSet.has.bind(excludedFieldsSet);
    return o => {
        for (const field in o) {
            if (o.hasOwnProperty(field) && !exclude(field)) {
                o[field] = mapper(o[field]);
            }
        }
        return o;
    };
};

Object.fieldMapping = function(field, mapper) {
    return o => {
        o[field] = mapper(o[field]);
        return o;
    };
};

Function.compose = function(...funcs) {
    const numFuncs = funcs.length;
    if (numFuncs === 0) {
        return () => undefined;
    }
    if (numFuncs === 1) {
        return funcs[0];
    }
    return function(...args) {
        let result = funcs[0](...args);
        for (let i = 1; i < numFuncs; i++) {
            result = funcs[i](result);
        }
        return result;
    };
};

Function.prototype.then = function(nextFunc) {
    return (...args) => nextFunc(this(...args));
};

Function.prototype.applyReturning = function() {
    return (arg) => {
        this(arg);
        return arg;
    };
};

Array.prototype.remove = function(value) {
    const i = this.indexOf(value);
    if (i >= 0) {
        this.splice(i, 1);
    }
};

Number.isNumber = function(n) {
    return !Number.isNaN(Number(n));
};

Number.toPixels = function(n) {
    return n + "px";
};

Node.prototype.appendBefore = function(node) {
    this.parentNode.insertBefore(node, this);
};

Node.prototype.appendAfter = function(node) {
    this.nextSibling.appendBefore(node);
};

const Class = Object.freeze({
    
    new(constructor, freeze = true) {
        const klass = {
            new: constructor
        };
        if (freeze) {
            Object.freeze(klass);
        }
        return klass;
    },
    
});

const Singleton = Class.new((constructor, ...args) => Object.freeze(constructor(...args)));

const Range = Object.freeze({
    
    new(from, to) {
        if (!to) {
            to = from;
            from = 0;
        }
        
        return {
            
            map(func) {
                const a = new Array(to - from);
                for (let i = from; i < to; i++) {
                    a[i - from] = func(i);
                }
                return a;
            },
            
            forEach(func) {
                for (let i = from; i < to; i++) {
                    func(i);
                }
            },
            
            toArray() {
                return [from, to];
            },
            
        };
        
    },
    
    ofDomain(domain) {
        return this.new(Math.min(...domain), Math.max(...domain));
    },
    
});

const CSSSelector = Class.new((function() {
    
    if (!document.styleSheets || !document.head) {
        throw new Error("CSSSelectors cannot be added dynamically");
    }
    
    const adaptCssRulesToRules = function(styleSheet) {
        styleSheet.rules = styleSheet.cssRules;
        styleSheet.addRule = function(selector, style) {
            styleSheet.insertRule(selector + "{" + style + "}", styleSheet.rules.length);
        };
    };
    
    const getStyleSheet = function() {
        document.head.appendChild(document.createElement("style"));
        const styleSheets = document.styleSheets;
        const styleSheet = styleSheets[styleSheets.length - 1];
        const mediaType = typeof styleSheet.media;
        if (mediaType === "object") {
            adaptCssRulesToRules(styleSheet);
        }
        return styleSheet;
    };
    
    const styleSheet = getStyleSheet();
    const rules = styleSheet.rules;
    
    return function(selector) {
        
        const selectorLowerCase = selector.toLowerCase();
        
        const addSelector = function(style) {
            for (const rule of rules) {
                if (rule.selectorText && selectorLowerCase === rule.selectorText.toLowerCase()) {
                    rule.style.cssText += style;
                    return;
                }
            }
            styleSheet.addRule(selector, style);
        };
        
        const lines = [];
        
        return Object.freeze({
            
            style(line) {
                lines.push(line);
                return this;
            },
            
            styles(styleObj) {
                for (const field in styleObj) {
                    if (styleObj.hasOwnProperty(field) && styleObj[field]) {
                        lines.push(field.replace("_", "-") + ": " + styleObj[field]);
                    }
                }
                return this;
            },
            
            create() {
                const style = lines.join(";");
                addSelector(style);
            },
            
        });
        
    };
    
})());

const FileFetcher = Singleton.new(() => {
    
    const isChrome = /Google Inc/.test(navigator.vendor);
    const allowsFileFetches = !window.location.href.startsWith("file://") || !isChrome;
    
    const loadScriptFetch = function(filename) {
        const varName = filename;
        const jsFilename = filename + ".js";
        const script = document.createElement("script");
        script.src = jsFilename;
        return new Promise((resolve, reject) => {
            script.onload = () => resolve(window[varName]);
            script.onerror = () => reject("Failed to load " + script.src);
            document.head.appendChild(script);
        });
    };
    
    const sameOriginFetch = function(filename) {
        return new Promise(resolve => {
            fetch(filename, {mode: "same-origin"})
                .catch(reason => {
                    console.log(reason);
                    return resolve(loadScriptFetch(filename, filename));
                })
                .then(response => response.text())
                .then(resolve);
        });
    };
    
    return {
        fetch(filename) {
            return (allowsFileFetches ? sameOriginFetch : loadScriptFetch)(filename).then(csv => csv.trim());
        },
    };
    
});

const Converter = Class.new((fieldConverters = {}, defaultConverter = Number, defaultValue = 0) => {
    return o => {
        for (const field in o) {
            if (o.hasOwnProperty(field)) {
                // convert using fieldConverters (default Number) and replace any NaNs with 0s
                o[field] = (fieldConverters[field] || defaultConverter)(o[field]) || defaultValue;
            }
        }
        return o;
    };
});

const Repeater = Class.new(() => {
    
    let _interval = () => 0;
    let _stopCondition = () => false;
    let _callback = () => undefined;
    let _initialDelay = true;
    
    return Object.freeze({
        
        interval(interval) {
            if (Number.isNumber(interval)) {
                const intervalValue = interval;
                interval = () => intervalValue;
            }
            // console.log(interval);
            _interval = i => interval(i) * 1000; // use seconds, not ms
            // console.log(_interval);
            return this;
        },
        
        until(stopCondition) {
            _stopCondition = stopCondition;
            return this;
        },
        
        numRepeats(numRepeats) {
            return this.until(i => i >= numRepeats);
        },
        
        noInitialDelay(yes = true) {
            _initialDelay = !yes;
            return this;
        },
        
        calling(callback) {
            _callback = callback;
            return this;
        },
        
        start() {
            const interval = _interval;
            const stopCondition = _stopCondition;
            const callback = _callback;
            const initialDelay = _initialDelay;
            
            const ids = [];
            
            const promise = new Promise(resolve => (function runOnce(i) {
                const currentInterval = interval(i);
                // console.log("currentInterval: " + currentInterval);
                const id = setTimeout(() => {
                    if (stopCondition(i, currentInterval)) {
                        resolve();
                        return;
                    }
                    callback(i, currentInterval);
                    runOnce(i + 1);
                }, !initialDelay && i === 0 ? 0 : currentInterval);
                ids.push(id);
            })(0));
            
            promise.cancel = () => ids.forEach(clearTimeout);
            
            return promise;
        },
        
    });
    
});

const TransitioningGraph = Class.new((() => {
    
    const transposeCsv = function(csv) {
        const fromCsv = csv => csv.trim().split("\n").map(row => row.trim().split(","));
        const toCsv = table => table.map(row => row.join(",")).join("\n");
        const transpose = A => {
            const m = A.length;
            if (m === 0) {
                return A;
            }
            const n = A[0].length;
            const B = new Array(n).fill(null).map(() => new Array(m));
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    B[j][i] = A[i][j];
                }
            }
            return B;
        };
        return Function.compose(fromCsv, transpose, toCsv)(csv);
    };
    
    return function({
                        fileName = undefined,
                        csvFilePath = fileName + ".csv",
                        graphTitle = fileName,
                        converter = Converter.new(),
                        transpose = false,
                        transitionField = "Year",
                        interval = 5,
                        direction = "horizontal",
                        parentDiv = document.body,
                        dataSourceUrl = undefined,
                        dataPreProcessor = data => data,
                    } = {}) {
        
        const buildGraph = function(data) {
            
            if (!data.columns.includes(transitionField)) {
                throw new Error(`no "${transitionField}" field found in ${data.columns}`);
            }
            
            const barNames = data.columns;
            barNames.remove(transitionField);
            const numBars = barNames.length;
            const transitions = data.map(Object.getting(transitionField));
            data.forEach(Object.deleting(transitionField));
            const numTransitions = transitions.length;
            
            window.data = data;
            
            const div = d3.select(parentDiv).append("div");
            
            const titleElem = div.append("h2")
                .text(graphTitle)
                .styles({center: true});
            
            const animateButton = div.append("button")
                .text("Start");
            div.append("br");
            div.append("br");
            
            const transitioningFieldElem = div.append("div").classed("transitioning-field", true);
            
            const alignmentDirection = ({
                horizontal: "text-align",
                vertical: "vertical-align",
            })[direction];
            
            const alignment = ({
                horizontal: "right",
                vertical: "top",
            })[direction];
            
            const transitioningStyle = ({
                horizontal: "width",
                vertical: "height",
            })[direction];
            
            const barCssClassName = "bar-" + graphTitle.replace(/[^a-zA-Z]/g, "_");
            CSSSelector.new("." + barCssClassName)
                .styles({
                    font: "10px sans-serif",
                    background_color: "#80d4ff",
                    color: "white",
                    [alignmentDirection]: alignment,
                    margin: "1px",
                    padding: "3px",
                })
                .create();
            
            const createFieldsAndBars = function() {
                const table = div.append("table");
                const tableElem = table.node();
                tableElem.style.display = "none";
                const fields = [];
                const bars = [];
                for (let i = 0; i < numBars; i++) {
                    const row = table.append("tr");
                    fields.push(row.append("td").node());
                    bars.push(row.append("td").append("div").node());
                }
                table.append("br");
                return [tableElem, ...[fields, bars].map(d3.selectAll)];
            };
            
            const [table, fields, bars] = createFieldsAndBars();
            
            const animations = [];
            const animate = function() {
                table.style.display = "";
                const range = [0, window.innerWidth * 0.6]; // TODO
                const domain = Range.ofDomain([].concat(...data.map(Object.values)));
                const scale = d3.scaleLinear().range(range).domain(domain.toArray());
                
                fields.data(barNames).text(name => name);
                bars.classed(barCssClassName, true);
                
                const animation = Repeater.new()
                    .interval(interval)
                    .numRepeats(numTransitions)
                    .noInitialDelay()
                    .calling((i, interval) => {
                        transitioningFieldElem
                            .transition()
                            .duration(interval)
                            .text(transitionField + ": " + transitions[i]);
                        const currentData = Object.values(data[i]);
                        console.log(i, transitions[i], currentData, interval);
                        // const scale = d3.scaleLinear().range(range).domain(Range.ofDomain(currentData).toArray());
                        bars.data(currentData)
                            .text(d => d.toLocaleString());
                        bars.data(currentData)
                            .transition()
                            .duration(interval)
                            .style(transitioningStyle, scale.then(Number.toPixels));
                    })
                    .start()
                    // .then(() => bars.classed(barCssClassName, false))
                ;
                animations.push(animation);
                return animation;
            };
            animateButton.on("click", animate);
            
            const dataSourceElem = div.append("p")
                .html("Source: <a href=" + dataSourceUrl + ">" + dataSourceUrl + "</a>");
            
            return {
                animation: {
                    animate: animate,
                    button: animateButton,
                    cancel() {
                        animations.forEach(animation => animation.cancel());
                    },
                },
                titleElem: titleElem,
                sourceElem: dataSourceElem,
            };
            
        };
        
        return FileFetcher.fetch(csvFilePath)
            // .then(console.log.applyReturning())
            .then(csv => transpose ? transposeCsv(csv) : csv)
            // .then(console.log.applyReturning())
            .then(csv => d3.csvParse(csv, converter))
            // .then(console.log.applyReturning())
            .then(dataPreProcessor)
            .then(buildGraph)
            .then(console.log.applyReturning());
        
    };
})());

const graph = TransitioningGraph.new({
        fileName: "Federal Budget By Agency",
        transpose: true,
        converter: Converter.new({Year: s => s}),
        dataSourceUrl: "https://www.whitehouse.gov/wp-content/uploads/2018/02/hist04z1-fy2019.xlsx",
        interval: () => {
            let interval;
            const intervalInput = window.intervalInput; // $("#intervalInput")
            if (intervalInput && intervalInput.value) {
                interval = parseFloat(intervalInput.value);
            }
            return interval || 0.3;
        },
        dataPreProcessor(data) {
            const fields = ["(On-budget)", "(Off-budget)", "Total outlays"];
            const deleteFields = Function.compose(...fields.map(Object.deleting));
            const columns = data.columns;
            data = data
                .map(deleteFields)
                .map(Object.fieldsMappingExcluding(cost => cost * 1e6, "Year"))
            ;
            const fieldSet = new Set(fields);
            data.columns = columns.filter(column => !fieldSet.has(column));
            return data;
        },
    })
    .then(graph => {
        const div = d3.select(document.body).append("div");
        div.append("label")
            .text("Time Interval (sec): ");
        div.append("input")
            .attrs({
                id: "intervalInput",
                type: "number",
                step: 0.1,
                value: 0.3,
            });
        div.remove();
        graph.animation.button.node().appendBefore(div.node());
    });

// let graph, animation;
// graphPromise.then(g => graph = g);
// animation = graph.animation;
// animation.cancel();