var data = [4, 8, 15, 16, 23, 42];


var 2016_chart = d3.select(".2016") 
var chart = d3.select(".chart");
var bar = chart.selectAll("div");
var barUpdate = bar.data(data);
var barEnter = barUpdate.enter().append("div");

barEnter.text(function(d) { return d; });

