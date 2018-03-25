var chart_1962 = d3.select(".chart_1962");
//console.log(chart_1962);
var chart_2023 = d3.select(".chart_2023");
//console.log(chart_2023);

var data_1962 = [1, 100, 9];
var data_2023 = [1000, 3, 17];

//Grabs data from the csv file and puts it into the 1962 or 2023 data array
//1962 is index 0
//2023 is index length-1 
var grabData = function() {
}

var plot1962Data = function() {
    var bar = chart_1962.selectAll("div");
    var barUpdate = bar.data(data_1962);
    var barEnter = barUpdate.enter().append("div");
    barEnter.text(function(d) { return d; });
}


var plot2023Data = function() {
    var bar = chart_2023.selectAll("div");
    var barUpdate = bar.data(data_2023);
    var barEnter = barUpdate.enter().append("div");
    barEnter.text(function(d) { return d; });
}

plot1962Data();
plot2023Data();

    
    



