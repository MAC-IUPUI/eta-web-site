import * as Chart from "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.5.0/Chart.min.js";
import * as url from "UrlUtils.js";

$(document).ready(function () {
    updateForecasts();
    updateStats();
    setupTimers();
});

const dailyForecastData: {[key: string]: any} = {
    labels: ["S", "M", "T", "W", "Th", "F", "Sa"],
    datasets: [
        {
            backgroundColor: "#A5D6A7",
            data: []
        }
    ]
};

const hourlyForecastData: {[key: string]: any} = {
    labels: [],
    datasets: [
        {
            tension: 0,
            borderColor: "#ffcc80",
            pointBorderColor: "rgba(0,0,0,0)",
            backgroundColor: "rgba(0,0,0,0)",
            data: []
        }
    ]
};

const dailyCtx = $("#dailyChart");
const hourlyCtx = $("#hourlyChart");

const dailyForecastChart = new Chart(dailyCtx, {
    type: "bar",
    data: dailyForecastData,
    options: <any>{
        responsive: true,
        maintainAspectRatio: true,
        showScale: false,
        legend: {
            display: false
        },
        scales: {
            xAxes: [{
                categoryPercentage: .65,
                gridLines: {
                    display: false
                },
                ticks: {
                    fontSize: 16,
                    fontColor: "#333"
                }
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true
                },
                display: false
            }]
        },
        tooltips: {
            enabled: false
        }
    }
});

const hourlyForecastChart = new Chart(hourlyCtx, {
    type: "line",
    data: hourlyForecastData,
    options: <any>{
        responsive: true,
        maintainAspectRatio: true,
        showScale: false,
        legend: {
            display: false
        },
        scales: {
            xAxes: [{
                categoryPercentage: .65,
                ticks: {
                    fontSize: 16,
                    fontColor: "#333"
                }
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true
                },
                display: false
            }]
        },
        tooltips: {
            enabled: false
        }
    }
});

let hours = 1;
const intervalID = window.setInterval(function () {
    hours++;
}, 3600000);

function toShortHourString(hour: number): string {
    let isAM = true;
    if (hour > 11) {
        hour = hour === 12 ? 12 : hour - 12;
        isAM = false;
    }
    return hour.toString() + (isAM ? "a" : "p");
}

function numberWithCommas(number: number): string {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateForecasts(): void {
    $.post("/api/compass/ticker/getForecasts", {
        "centerId": url.getParameterByName("centerId")
    }, (forecasts: { daily: {[key: number]: number}; hourly: {[key: number]: number} }) => {
        const dailyKeys = Object.keys(forecasts.daily).map(k => Number(k)).sort();
        const hourlyKeys = Object.keys(forecasts.hourly).map(k => Number(k)).sort();
        if (dailyKeys.length > 0) {
            dailyForecastData.datasets[0].data = dailyKeys.map(k => forecasts.daily[k]);
            dailyForecastChart.update();
            updateDayHighlight();
        }
        if (hourlyKeys.length > 0) {
            hourlyForecastData.datasets[0].data = hourlyKeys.map(k => forecasts.hourly[k]);
            hourlyForecastData.labels = hourlyKeys.map(k => toShortHourString(k));
            const maxValue = Math.max.apply(Math, hourlyForecastData.datasets[0].data);
            (<any>hourlyForecastChart).options.scales.yAxes[0].ticks.max = Math.ceil(maxValue + maxValue * .1);
            hourlyForecastChart.update();
            updateHourHighlight();
        }
    }, "json");
}

function updateStats() {
    const center = url.getParameterByName("centerId");
    $.post("/api/compass/ticker/getStatistics", {
        "centerId": center
    }, function(data) {
        for (const i in data) {
            $(".odometer[data-type='" + i + "']").html(numberWithCommas(data[i]));
        }
    }, "json");
}

function updateDayHighlight() {
    highlightDay(new Date().getDay());
}

function updateHourHighlight() {
    highlightHour(toShortHourString(new Date().getHours()));
}

function setupTimers() {
    const forecastInterval = 5 * 60 * 1000; // five minutes
    setInterval(updateForecasts, forecastInterval);
    setInterval(updateStats, 15 * 1000); // update numbers every 15 seconds
}

function highlightHour(hour: string): void {
    const pointColors = [];
    const pointRadii = [];
    const targetIndex = hourlyForecastChart.data.labels.indexOf(hour);
    for (let i = 0; i < hourlyForecastChart.data.labels.length; i++) {
        if (i === targetIndex) {
            pointColors.push("#FF9800");
            pointRadii.push(6);
        }
        else {
            pointColors.push("#FFE0B2");
            pointRadii.push(3);
        }
    }
    hourlyForecastChart.data.datasets[0].pointBackgroundColor = pointColors;
    hourlyForecastChart.data.datasets[0].pointRadius = pointRadii;
    hourlyForecastChart.update();
}

function highlightDay(targetIndex: number): void {
    const barColors = [];
    for (let i = 0; i < 7; i++) {
        if (i === targetIndex) {
            barColors.push("#4CAF50");
        }
        else {
            barColors.push("#A5D6A7");
        }
    }
    dailyForecastChart.data.datasets[0].backgroundColor = barColors;
    dailyForecastChart.update();
}
