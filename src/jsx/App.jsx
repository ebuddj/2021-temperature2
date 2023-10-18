import React, {
  useState, useEffect, useCallback, useRef
} from 'react';

// https://d3js.org/
import * as d3 from 'd3';

// https://vis4.net/chromajs/
import chroma from 'chroma-js';
import '../styles/styles.less';
// Use chroma to make the color scale.
// https://gka.github.io/chroma.js/
const scaleMax = 1;
const scaleMin = -1;
const f = chroma.scale('RdYlBu').domain([scaleMax, 0, scaleMin]);
const f_text = chroma.scale(['red', 'rgba(0, 0, 0, 0.3)', 'blue']).padding(-1).domain([scaleMax, 0, scaleMin]);
const margin = {
  top: 40, right: 40, bottom: 40, left: 40
};
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.top - margin.bottom;

const x = d3.scaleBand()
  .range([0, width]);
const y = d3.scaleLinear()
  .range([0, height]);

let chart_elements;
let yAxis;
let xAxis;

const getHashValue = (key) => {
  const matches = window.location.hash.match(new RegExp(`${key}=([^&]*)`));
  return matches ? matches[1] : null;
};

const hemisphere = getHashValue('hemisphere') ? getHashValue('hemisphere').replace('%20', ' ') : 'World';
const month = getHashValue('month') ? getHashValue('month') : 'Year';

const hemispheres = {
  World: 0,
  'Northern hemisphere': 1,
  'Southern hemisphere': 2
};
const months = {
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
  April: 'Apr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
  Year: 'J-D'
};

let start_year = 1880;
let end_year = 2021;

function App() {
  const interval = useRef(null);
  const [currentTemp, setCurrentTemp] = useState(false);
  const [curYear, setCurYear] = useState(start_year);
  const [data, setData] = useState(null);

  const updateData = useCallback(() => { // https://www.d3-graph-gallery.com/graph/barplot_button_data_hard.html
    const bar_data = data.slice(0, curYear - start_year + 1);
    x.domain(bar_data.map((el, i) => i));
    xAxis.call(d3.axisBottom(x));

    y.domain([Math.max(0.15, d3.max(bar_data, d => d)), Math.min(-0.3, d3.min(bar_data, d => d))]);
    yAxis.call(d3.axisLeft(y)
      .ticks(0.5)
      .tickFormat(i => `${i}°C`)
      .tickSizeInner(-width)
      .tickSizeOuter(0));

    const bars = chart_elements.selectAll('.bar')
      .data(bar_data);

    bars.exit().remove();

    bars.enter().append('rect')
      .attr('class', 'bar')
      .attr('fill', d => f(d))
      .attr('height', 0)
      .attr('width', 0)
      .attr('x', 0)
      .attr('y', y(0))
      .merge(bars)
      .attr('width', x.bandwidth())
      .attr('height', d => Math.abs(y(d) - y(0)))
      .attr('y', d => ((d > 0) ? y(Math.max(0, d)) : y(Math.max(0, d)) + 1))
      .attr('x', (d, i) => x(i));
  }, [curYear, data]);

  const startInterval = useCallback(() => {
    interval.current = setInterval(() => {
      setCurYear(currentState => {
        setCurrentTemp(data[currentState - start_year]);
        const newState = currentState + 1;
        if (newState >= end_year) {
          clearInterval(interval.current);
        }
        return newState;
      });
    }, 50);

    // Clearing the interval
    return () => {
      interval.current = null;
      clearInterval(interval.current);
    };
  }, [data]);

  const getData = useCallback(() => {
    Promise.all([
      d3.text(`${(window.location.href.includes('localhost:80')) ? './' : 'https://ebuddj.github.io/2021-temperature2/'}data/GLB.Ts+dSST.csv`),
      d3.text(`${(window.location.href.includes('localhost:80')) ? './' : 'https://ebuddj.github.io/2021-temperature2/'}data/NH.Ts+dSST.csv`),
      d3.text(`${(window.location.href.includes('localhost:80')) ? './' : 'https://ebuddj.github.io/2021-temperature2/'}data/SH.Ts+dSST.csv`)
    ]).then((files) => {
      files = files.map(file => d3.csvParse(file.split('\n').slice(1).join('\n')));

      setData(files[hemispheres[hemisphere]].map((file, i) => {
        if (i === 0 && file[months[month]] === '***') {
          start_year = 1881;
        } else if (i === (files[hemispheres[hemisphere]].length - 1) && file[months[month]] === '***') {
          end_year = 2020;
        }
        return +file[months[month]];
      }));
    }).catch((err) => {
      console.log(err);
    });
  }, []);

  useEffect(() => {
    if (interval.current === null && (data !== null)) {
      startInterval();
    }
  }, [data, startInterval]);

  useEffect(() => {
    if (data !== null) {
      updateData();
    }
  }, [data, curYear, updateData]);

  useEffect(() => {
    const svg = d3.select('.chart_container')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    yAxis = svg.append('g')
      .attr('class', 'yaxis')
      .attr('transform', `translate(${margin.left - 1}, ${margin.top})`);
    xAxis = svg.append('g')
      .attr('class', 'xaxis')
      .attr('transform', `translate(${margin.left},${height - 50})`);
    chart_elements = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    getData();
  }, [getData]);

  return (
    <div className="app">
      <div className="title_container">
        <h3>
          Temperature anomalies
          {(month !== 'Year') ? `in ${month}` : ''}
        </h3>
        <h3>
          {start_year}
          –
          {end_year}
        </h3>
      </div>
      <div className="chart_container" />
      <div className="info_container">
        <div className="hemispehere">{hemisphere}</div>
        <div className="year_container">{curYear}</div>
        <div className="temp_container" style={{ color: f_text(currentTemp) }}>
          {((currentTemp > 0) ? '+' : '') + currentTemp}
          °C
        </div>
        <div className="meta_container">
          <div>
            Data:
            {' '}
            <a href="https://data.giss.nasa.gov/gistemp/">NASA</a>
          </div>
          <div>
            Author:
            {' '}
            <a href="https://twitter.com/teelmo">Teemo Tebest</a>
            , EBU
          </div>
          <div>Reference period: 1951–1980</div>
        </div>
      </div>
    </div>
  );
}
export default App;
