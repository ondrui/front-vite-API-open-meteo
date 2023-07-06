import "./style.css";

import Highcharts from "highcharts";
import Exporting from "highcharts/modules/exporting";
import Accessibility from "highcharts/modules/accessibility";
import SeriesLabel from "highcharts/modules/series-label";
import HighCL from "highcharts/themes/high-contrast-light";
import moment from "moment";
import * as mTZ from "moment-timezone";

window.moment = moment;
mTZ();

Exporting(Highcharts);
Accessibility(Highcharts);
SeriesLabel(Highcharts);
HighCL(Highcharts);

const form = document.getElementById("myForm");
const dataForm = document.forms.myForm.elements;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectValue = dataForm.model.value;
  let formData = new FormData(form);
  loadData(formData);
});

// Generate the chart
const loadData = async (data) => {
  const strModels = "http://localhost:3002/models";
  const strForecastTime = "http://localhost:3002/forecast_time";
  try {
    // const res = await fetch("http://localhost:3002/models");
    const res = await fetch(strModels, {
      method: "POST",
      body: data,
    });
    const datasets = await res.json();

    const callback = (acc, { model, request_time, temp, forecast_time }) => {
      if (!acc[model]) acc[model] = {};
      if (!acc[model][request_time]) acc[model][request_time] = [];
      acc[model][request_time].push([Date.parse(forecast_time), temp]);
      return acc;
    };
    // { ...acc, [firstLetter]: [...(acc[firstLetter] || []), cur] };

    const resObj = datasets.reduce(callback, {});

    const getValues = (object, parentKeys = []) => {
      return Object.assign(
        {},
        ...Object.entries(object).map(([k, v]) =>
          v && typeof v === "object" && v !== null && !Array.isArray(v)
            ? getValues(v, [...parentKeys, k])
            : { [[...parentKeys, k].join(".")]: v }
        )
      );
    };

    const finished = Object.entries(getValues(resObj)).map(([key, value]) => {
      return { data: value, name: key.slice(0, -5) };
    });

    const options = {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    };

    Highcharts.setOptions({
      lang: {
        shortMonths: [
          "янв.",
          "февр.",
          "мар.",
          "апр.",
          "мая",
          "июня",
          "июля",
          "авг.",
          "сент.",
          "окт.",
          "нояб.",
          "дек.",
        ],
      },
    });

    Highcharts.chart("container", {
      time: {
        timezone: "UTC",
      },
      chart: {
        type: "spline",
      },
      title: {
        text: "Графики температуры по различным моделям",
      },
      legend: {
        labelFormat: `<span style="color:{color}">{name}</span>`,
      },
      tooltip: {
        shared: true,
        formatter: function () {
          let date = new Date(this.x);
          let formatter = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            timeZone: "UTC",
          };
          const arrMod = this.points
            .sort(function (a, b) {
              // Turn your strings into dates, and then subtract them
              // to get a value that is either negative, positive, or zero.
              return (
                new Date(b.series.name.slice(4)) -
                new Date(a.series.name.slice(4))
              );
            })
            .map(
              (point) =>
                `<span style="color:${point.series.color}; font-size: 15px">\u25CF </span>${point.series.name} температура 2м: <b>${point.y} °C</b><br/>`
            );
          const arr = [
            `${date.toLocaleString("ru", formatter)}<br/>`,
            ...arrMod,
          ];
          return arr.join("");
        },
        crosshairs: true,
      },
      xAxis: {
        type: "datetime",
        plotLines: [
          {
            color: "red", // Color value
            dashStyle: "ShortDot", // Style of the plot line. Default to solid
            value: new Date().getTime(), // Value of where the line will appear
            width: 2, // Width of the line
            label: {
              text: new Date().toLocaleString("ru", options), // Content of the label.
              rotation: 0,
            },
          },
        ],
      },
      yAxis: {
        title: {
          text: "Температура, °C",
        },
      },
      plotOptions: {
        series: {
          marker: {
            enabled: false,
          },
          label: {
            enabled: false,
          },
        },
      },
      series: finished,
    });
  } catch (error) {
    console.log("Error!" + error);
  }
};

//Создаем селект для выбора часа прогноза.
const hours = new Array(24)
  .fill(0)
  .map((_, i) => `${i > 9 ? i : "0" + i}:00:00`);

const timeSel = document.getElementById("time-request");
hours.forEach((v) => {
  const opt = document.createElement("option");
  opt.value = v;
  opt.innerHTML = v.split(":")[0];
  timeSel.appendChild(opt);
});
