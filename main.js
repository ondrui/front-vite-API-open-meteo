/* eslint-disable no-console */
/* eslint-disable camelcase */
import './style.css';

import Highcharts from 'highcharts';
import Exporting from 'highcharts/modules/exporting';
import Accessibility from 'highcharts/modules/accessibility';
import SeriesLabel from 'highcharts/modules/series-label';
import HighCL from 'highcharts/themes/high-contrast-light';
import moment from 'moment';
import * as mTZ from 'moment-timezone';

window.moment = moment;
mTZ();

Exporting(Highcharts);
Accessibility(Highcharts);
SeriesLabel(Highcharts);
HighCL(Highcharts);

const oneModelForm = document.getElementById('oneModel');
const allModelsForm = document.getElementById('allModels');

// Generate the chart
const loadData = async (data, form) => {
  const url =
    form === 'one'
      ? 'http://localhost:3002/forecast_time'
      : 'http://localhost:3002/models';

  try {
    // const res = await fetch("http://localhost:3002/models");
    const res = await fetch(url, {
      method: 'POST',
      body: data,
    });
    const datasets = await res.json();
    // formatting data from server;
    const callback = (acc, { model, request_time, temp, forecast_time }) => {
      if (!acc[model]) acc[model] = {};
      if (!acc[model][request_time]) acc[model][request_time] = [];
      acc[model][request_time].push([Date.parse(forecast_time), temp]);
      return acc;
    };
    // { ...acc, [firstLetter]: [...(acc[firstLetter] || []), cur] };

    const resObj = datasets.reduce(callback, {});
    //  flattening object
    const getValues = (object, parentKeys = []) =>
      Object.assign(
        {},
        ...Object.entries(object).map(([k, v]) =>
          v && typeof v === 'object' && v !== null && !Array.isArray(v)
            ? getValues(v, [...parentKeys, k])
            : { [[...parentKeys, k].join('.')]: v },
        ),
      );
    /**
     * Remove milliseconds and the suffix Z from datetime string ('.000Z').
     * @param {string} str Date Time String. In format 'YYYY-MM-DDTHH:mm:ss.sssZ'
     * @param {number} num default value -5.
     * @returns
     */
    const removeMsZ = (str, num = -5) => str.slice(0, num);
    // datasets for charts
    const finished = Object.entries(getValues(resObj)).map(([key, value]) => ({
      data: value,
      name: removeMsZ(key),
    }));

    const formattingPlotLinesText = () => {
      const options = {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      };
      return new Date().toLocaleString('ru', options);
    };

    Highcharts.setOptions({
      lang: {
        shortMonths: [
          'янв.',
          'февр.',
          'мар.',
          'апр.',
          'мая',
          'июня',
          'июля',
          'авг.',
          'сент.',
          'окт.',
          'нояб.',
          'дек.',
        ],
      },
    });

    Highcharts.chart('container', {
      time: {
        timezone: 'UTC',
      },
      chart: {
        type: 'spline',
      },
      title: {
        text: 'Графики температуры по различным моделям',
      },
      legend: {
        labelFormat: '<span style="color:{color}">{name}</span>',
      },
      tooltip: {
        shared: true,
        formatter() {
          const date = new Date(this.x);
          const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            timeZone: 'UTC',
          };
          const arrMod = this.points
            .sort(
              (a, b) =>
                new Date(b.series.name.slice(4)) -
                new Date(a.series.name.slice(4)),
            )
            .map(
              (point) =>
                `<span style="color:${point.series.color}; font-size: 15px">\u25CF </span>${point.series.name} температура 2м: <b>${point.y} °C</b><br/>`,
            );
          const arr = [`${date.toLocaleString('ru', options)}<br/>`, ...arrMod];
          return arr.join('');
        },
        crosshairs: true,
      },
      xAxis: {
        type: 'datetime',
        plotLines: [
          {
            color: 'red', // Color value
            dashStyle: 'ShortDot', // Style of the plot line. Default to solid
            value: new Date().getTime(), // Value of where the line will appear
            width: 2, // Width of the line
            label: {
              text: formattingPlotLinesText(), // Content of the label.
              rotation: 0,
            },
          },
        ],
      },
      yAxis: {
        title: {
          text: 'Температура, °C',
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
    // eslint-disable-next-line no-console
    console.log(`Error!${error}`);
  }
};

oneModelForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(oneModelForm);
  console.log(...formData);
  loadData(formData, 'one');
});

allModelsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(allModelsForm);
  console.log(...formData);
  loadData(formData, 'all');
});

// Создаем селект для выбора часа прогноза.
const TOTAL_HOURS = 24;
const hours = new Array(TOTAL_HOURS)
  .fill(0)
  .map((_, i) => `${i > 9 ? i : `0${i}`}:00:00`);

const timeSel = document.getElementById('time-request');
hours.forEach((v) => {
  const opt = document.createElement('option');
  opt.value = v;
  [opt.innerHTML] = v.split(':');
  timeSel.appendChild(opt);
});
