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

// Generate the chart
const loadData = async () => {
  const modelsName = [
    "hmn",
    "best_match",
    "icon_global",
    "gfs_global",
    "ecmwf_ifs04",
  ];
  try {
    const res = await fetch("http://localhost:3002/api");
    const datasets = await res.json();
    // const arrData = modelsName.map((elem) => {
    //   const arr = datasets.data
    //     .filter((f) => f.model === elem)
    //     .map(({ runtime, temp }) => [Date.parse(runtime), temp]);
    //   return { data: arr, name: elem };
    // });

    const callback = (acc, { model, request_time, temp, runtime }) => {
      if (!acc[model]) acc[model] = {};
      if (!acc[model][request_time]) acc[model][request_time] = [];
      acc[model][request_time].push([Date.parse(runtime), temp]);
      return acc;
    };
    // { ...acc, [firstLetter]: [...(acc[firstLetter] || []), cur] };

    const resObj = datasets.data.reduce(callback, {});

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
      return { data: value, name: key };
    });

    const options = {
      dateStyle: "medium",
      timeStyle: "short",
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
        timezone: "Europe/Moscow",
      },
      chart: {
        type: "spline",
      },
      title: {
        text: "Графики температуры по различным моделям",
      },
      tooltip: {
        split: true,
        crosshairs: true,
        xDateFormat: "%d-%b-%Y, %H:%M",
        pointFormat:
          '<span style="color:{series.color}; font-size: 15px">\u25CF </span>{series.name} температура 2м: <b>{point.y}</b><br/>',
        valueSuffix: "°C",
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
        },
      },
      series: finished,
    });
  } catch (error) {
    console.log("Error! Could not reach the server. " + error);
  }
};

loadData();
