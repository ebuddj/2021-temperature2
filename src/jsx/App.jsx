import React, {
  useState, useEffect, useCallback, useRef, useMemo
} from 'react';
import '../styles/styles.less';

// https://www.npmjs.com/package/react-is-visible
import 'intersection-observer';
import { useIsVisible } from 'react-is-visible';

// https://d3js.org/
import * as d3 from 'd3';

// https://vis4.net/chromajs/
import chroma from 'chroma-js';
// Use chroma to make the color scale.
// https://gka.github.io/chroma.js/

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
  const scaleMax = 1;
  const scaleMin = -1;
  const f = chroma.scale('RdYlBu').domain([scaleMax, 0, scaleMin]);
  const f_text = chroma.scale(['red', 'rgba(0, 0, 0, 0.3)', 'blue']).padding(-1).domain([scaleMax, 0, scaleMin]);
  const margin = useMemo(() => ({
    top: 40, right: 0, bottom: 40, left: 40
  }), []);

  const chart_elements = useRef(null);
  const yAxis = useRef(null);
  const xAxis = useRef(null);
  const appRef = useRef(null);
  const chartRef = useRef(null);
  const interval = useRef(null);
  const svg = useRef(null);
  const x = useRef(null);
  const y = useRef(null);
  const width = useRef(null);
  const height = useRef(null);
  const isVisible = useIsVisible(chartRef, { once: true });

  const [currentTemp, setCurrentTemp] = useState(0);
  const [curYear, setCurYear] = useState(start_year);
  const [data, setData] = useState(null);

  const updateData = useCallback(() => { // https://www.d3-graph-gallery.com/graph/barplot_button_data_hard.html
    const bar_data = data.slice(0, curYear - start_year + 1);
    x.current = d3.scaleBand()
      .range([0, width.current]);
    y.current = d3.scaleLinear()
      .range([0, height.current]);

    x.current.domain(bar_data.map((el, i) => i));
    xAxis.current.call(d3.axisBottom(x.current));

    y.current.domain([Math.max(0.15, d3.max(bar_data, d => d)), Math.min(-0.3, d3.min(bar_data, d => d))]);
    yAxis.current.call(d3.axisLeft(y.current)
      .ticks(0.5)
      .tickFormat(i => `${i}°C`)
      .tickSizeInner(-width.current)
      .tickSizeOuter(0));

    const bars = chart_elements.current.selectAll('.bar')
      .data(bar_data);

    bars.exit().remove();

    bars.enter().append('rect')
      .attr('class', 'bar')
      .attr('fill', d => f(d))
      .attr('height', 0)
      .attr('width', 0)
      .attr('x', 0)
      .attr('y', y.current(0))
      .merge(bars)
      .attr('width', x.current.bandwidth())
      .attr('height', d => Math.abs(y.current(d) - y.current(0)))
      .attr('y', d => ((d > 0) ? y.current(Math.max(0, d)) : y.current(Math.max(0, d)) + 1))
      .attr('x', (d, i) => x.current(i));
  }, [curYear, data, f]);

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
      d3.text(`${(window.location.href.includes('localhost:80')) ? './' : 'https://ebuddj.github.io/2021-temperature2/'}assets/data/GLB.Ts+dSST.csv`),
      d3.text(`${(window.location.href.includes('localhost:80')) ? './' : 'https://ebuddj.github.io/2021-temperature2/'}assets/data/NH.Ts+dSST.csv`),
      d3.text(`${(window.location.href.includes('localhost:80')) ? './' : 'https://ebuddj.github.io/2021-temperature2/'}assets/data/SH.Ts+dSST.csv`)
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
    if (isVisible === true) {
      width.current = chartRef.current.offsetWidth - margin.left - margin.right;
      height.current = chartRef.current.offsetHeight - margin.top - margin.bottom;
      svg.current = d3.select(chartRef.current)
        .append('svg')
        .attr('width', width.current + margin.left + margin.right)
        .attr('height', height.current + margin.top + margin.bottom);
      yAxis.current = svg.current.append('g')
        .attr('class', 'yaxis')
        .attr('transform', `translate(${margin.left - 1}, ${margin.top})`);
      xAxis.current = svg.current.append('g')
        .attr('class', 'xaxis')
        .attr('transform', `translate(${margin.left},${height.current - 50})`);
      chart_elements.current = svg.current.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      getData();
    }
  }, [getData, margin, isVisible]);

  return (
    <div className="app" ref={appRef}>
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
      <div className="chart_container" ref={chartRef} />
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
          <div>Reference period: 1951–1980</div>
        </div>
      </div>
    </div>
  );
}
export default App;
