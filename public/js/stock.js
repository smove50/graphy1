
//stock.js is used to call multiple functions within index.handlebars

//Animations on scroll init:
AOS.init();


//Function to grab user input for their search term and GET the API search to create stock chart with either
// their ticker value or their search term name (stock name). 

var chartTitle = '';
//Variables created to store array data for our chart. MUST BE GLOBAL FOR CLICK FUNCTION
var x = [];
var rowsArr = [];
var dateReadable = [];
var dateArr = [];
var openArr = [];
var closeArr = [];

//variables to save Pins
var currentUser;
var currentStock;
var pinInput;

function getStockTicker(searchTerm) {

    x = [];
    rowsArr = [];
    dateReadable = [];
    dateArr = [];
    openArr = [];
    closeArr = [];
    //AJAX Call to search with the Name** term. 
    $.ajax({
        url: "api/search/" + searchTerm,
        type: "GET"
    })
        .then((result) => {
            //If result true, and the search term is found in the API by name..
            if (result[0]) {
                //stockName stores the search_term from our result passed as a parameter.
                var stockName = result[0].search_term;
                //symbol stores the symbol from our result passed as a parameter.
                var symbol = result[0].symbol;

                //Pass the symbol into getStockChart as the ticker is required for our API query

                chartTitle = stockName;
                currentStock = symbol;

                getStockChart(symbol);
                // & pass stockName into getHeadlines -> nytCode.js -> to grab and search articles with that keyword.
                getHeadlines(stockName);
            }
            //Else call the other AJAX call to check by ticker name instead.
            else {
                $.ajax({
                    url: "/api/tickers/" + searchTerm,
                    type: "GET"
                }).then((result) => {
                    //IF true, and the ticker has been found from the search term, continue to call the functions to create 
                    // both the chart and articles.
                    if (result[0]) {
                        var stockName = result[0].search_term;
                        var symbol = result[0].symbol;

                        chartTitle = stockName;
                        currentStock = symbol;

                        getStockChart(symbol);
                        getHeadlines(stockName);
                    }
                    //ELSE if we get to this point and the search term is invalid by company name and ticker, let the customer know
                    // they need to try again. We've checked both ticker and company name in the seeds.sql.
                    else {
                        $('#myModal2').modal('toggle');
                    }
                })
            }
        })
        //Error catch
        .catch((error) => {
            console.log(error);
        });
}

//Function called within getStockTicker and pulls either the company name or ticker as a parameter. 
function getStockChart(symbol) {
    //This ajax call GET's the api's data for that stock using their query. 
    // Alphavantage documentation. 
    $.ajax({
        url: "/api/time-series-daily/q/" + symbol,
        method: "GET"
    })
        .then((result) => {
            //Pass the result into our makeGraph function (our ticker name).
            makeGraph(result);
        })
        //Error check 
        .catch((error) => {
            console.log(error);
        });
}
//Function called passing our result from getStockChart
function makeGraph(result) {

    $("#chart-div").empty();
    //Stock object
    var values = result["Time Series (Daily)"];
    //Clearing the current div in order to populate the new. 

    //For loop in order to keep our search results limited to the past 30 days worth of data.
    for (var i = 0; i < 30; i++) {
        //moment.js formatting for our dates/times
        var day = moment().subtract(i, "days").format("YYYY-MM-DD");
        dateReadable.unshift(day);

        //fillout undefined values by searching for the formatted day variable above within our values array.
        if (values[day] === undefined) {
            dateArr.unshift(moment().subtract(i, "days").toDate());
            openArr.unshift(parseFloat(x["1. open"]));
            closeArr.unshift(parseFloat(x["4. close"]));
        } else {
            dateArr.unshift(moment().subtract(i, "days").toDate());
            openArr.unshift(parseFloat(x["1. open"]));
            closeArr.unshift(parseFloat(x["4. close"]));
            x = values[day];
        }
        //populate array to be added to graph
        rowsArr.unshift([dateArr[0], openArr[0], closeArr[0]])
    }
    //googles chart load function to create our line graph with their packages.
    google.charts.load('current', { packages: ['corechart', 'line'] });
    google.charts.setOnLoadCallback(drawBasic);

    //Function called from setOnloadCallback..
    function drawBasic() {
        //data is creating a new table and adding columns and rows. 
        var data = new google.visualization.DataTable();
        data.addColumn('date', 'X');
        data.addColumn('number', 'Open');
        data.addColumn('number', 'Close');
        data.addRows(rowsArr);

        //Options for display on our chart. 
        var options = {
            hAxis: {
                title: 'Time'
            },
            vAxis: {
                title: 'Popularity'
            }
        };
        //Chart new LineChart and placing it in the #chart_div 
        var chart = new google.visualization.LineChart(document.getElementById('chart-div'));
        //draw creates the chart from our new chart object and passes our data, options defined above. 
        chart.draw(data, options);
        google.visualization.events.addListener(chart, 'select', selectHandler);
        $("#chart-title").text(chartTitle);
        $("#chart-title").css("padding-bottom", "5px");

        function selectHandler(){
            $.ajax({
                url: "/getUser",
                type: "GET"
            }).then((user) => {
                if(user === null){
                    $("#graph-modal").fadeIn("show");
                } else {
                    var selection = chart.getSelection();
                    $("#graph-modal").fadeIn("show");
                    console.log(user.email+ " selected " + JSON.stringify(selection));
                    $("#graph-modal-text").text("You will make a pin at: " + dateReadable[selection[0]["row"]]+ " (format: YYYY-MM-DD)");
                    $("#graph-modal-date").attr("value", dateReadable[selection[0]["row"]]);
                    console.log(currentStock);
                    $("#graph-modal-symbol").attr("value", currentStock);
                }
            });
        
        }
    }
}


//on click event
$("#run-search").on("click", function (event) {
    event.preventDefault();

    //Search term stored in var querySearch
    var querySearch = $("#search-term").val().toLowerCase();
    //If the variable has a value in the input field then ..
    if (querySearch) {
        //This is our initial build function to kick everything off. Passing through our search term from the user.
        getStockTicker(querySearch);
        //Emptying the article section in the event this isn't the first search.
        $("#article-section").empty();
        //Setting the value to "" so the input field is empty.
        $("#search-term").val("");
        //Placeholder created to store the previous request. - Fancy ;) 
        $("#search-term").attr("placeholder", querySearch);
    }
    else {
        //If the user does not put any values in the search field please try again. 
        $('#myModal').modal('toggle');
    }

});
//Clears the input field when clicked. 
$("#search-term").on("click", function () {
    $("#search-term").attr("placeholder", "");
});

$("#close-modal").on("click", function(e) {
    e.preventDefault();

    $("#graph-modal").fadeOut();
})

$("#submit-modal").on("click", (e) => {
    e.preventDefault();
    var modalVals = {
        symbol: $("#graph-modal-symbol").val(),
        date: $("#graph-modal-date").val(),
        text: $("#graph-modal-text").val()
    }

    $.ajax({
        url: "/api/pin",
        type: "POST",
        data: modalVals
    }).then((result) => {
        // console.log(result);
    }).catch( (err) => {
        throw err;
    })
})