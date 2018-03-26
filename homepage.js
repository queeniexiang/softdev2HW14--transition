const chart_1962 = d3.select(".chart_1962");
//console.log(chart_1962);
const chart_2023 = d3.select(".chart_2023");
//console.log(chart_2023);

const data_1962 = [1, 100, 9];
const data_2023 = [1000, 3, 17];

//Grabs data from the csv file and puts it into the 1962 or 2023 data array
//1962 is index 0
//2023 is index length-1 
const grabData = function() {

};

const plot1962Data = function() {
    const bar = chart_1962.selectAll("div");
    const barUpdate = bar.data(data_1962);
    const barEnter = barUpdate.enter().append("div");
    barEnter.text(d => d);
};


const plot2023Data = function() {
    const bar = chart_2023.selectAll("div");
    const barUpdate = bar.data(data_2023);
    const barEnter = barUpdate.enter().append("div");
    barEnter.text(d => d);
};

plot1962Data();
plot2023Data();

    
    



