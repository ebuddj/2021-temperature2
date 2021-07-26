import React, {Component} from 'react';
import style from './../styles/styles.less';

// https://d3js.org/
import * as d3 from 'd3';

// https://vis4.net/chromajs/
import chroma from 'chroma-js';
// Use chroma to make the color scale.
// https://gka.github.io/chroma.js/
const scaleMax = 1,
      scaleMin = -1,
      f = chroma.scale('RdYlBu').domain([scaleMax, 0, scaleMin]),
      f_text = chroma.scale(['red', 'rgba(0, 0, 0, 0.3)', 'blue']).padding(-1).domain([scaleMax, 0, scaleMin]);
const margin = {top: 40, right: 40, bottom: 40, left: 40},
      width = window.innerWidth - margin.left - margin.right,
      height = window.innerHeight - margin.top - margin.bottom;

const x = d3.scaleBand()
  .range([0, width]);
const y = d3.scaleLinear()
  .range([0, height]);

let interval,
    chart_elements,
    yAxis,
    xAxis;

let start_year = 1880;

const getHashValue = (key) => {
  let matches = window.location.hash.match(new RegExp(key+'=([^&]*)'));
  return matches ? matches[1] : null;
}

const hemisphere = getHashValue('hemisphere') ? getHashValue('hemisphere').replace('%20', ' ') : 'World';
const month = getHashValue('month') ? getHashValue('month') : 'Year';

const hemispheres = {
  'World':0,
  'Northern hemisphere':1,
  'Southern hemisphere':2
};
const months = {
  'January':'Jan',
  'February':'Feb',
  'March':'Mar',
  'April':'Apr',
  'May':'May',
  'June':'Jun',
  'July':'Jul',
  'August':'Aug',
  'September':'Sep',
  'October':'Oct',
  'November':'Nov',
  'December':'Dec',
  'Year':'J-D'
};

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      current_temp:0
    };
  }
  componentDidMount() {
    const svg = d3.select('.' + style.chart_container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    yAxis = svg.append('g')
      .attr('class', style.yaxis)
      .attr('transform', 'translate(' + (margin.left - 1) + ', ' + margin.top + ')');
    xAxis = svg.append('g')
      .attr('class', style.xaxis)
      .attr('transform', 'translate(' + margin.left + ',' + (height - 50) + ')');
    chart_elements = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    this.getData();
  }
  componentDidUpdate(prevProps, prevState, snapshot) {

  }
  componentWillUnMount() {
    clearInterval(interval);
  }
  getData() {
    Promise.all([
      d3.text('./data/GLB.Ts+dSST.csv'),
      d3.text('./data/NH.Ts+dSST.csv'),
      d3.text('./data/SH.Ts+dSST.csv')
    ]).then((files) => {
      files = files.map(file => d3.csvParse(file.split('\n').slice(1).join('\n')));
      let start_year = 1880;
      let end_year = 2021;
      this.data = files[hemispheres[hemisphere]].map((file, i) => {
        if (i === 0 && file[months[month]] === '***') {
          file[month] === '***';
          start_year = 1881;
        }
        else if (i === (files[hemispheres[hemisphere]].length - 1) && file[months[month]] === '***') {
          end_year = 2020;
        }
        return +file[months[month]]
      });
      this.setState((state, props) => ({
        end_year:end_year,
        start_year:start_year,
        year:start_year
      }), () => this.setInterval());
    }).catch((err) => {
    });
  }
  setInterval() {
    interval = setInterval(() => {
      if (this.state.year >= this.state.end_year) {
        this.setState((state, props) => ({
          current_temp:this.data[this.state.year - start_year]
        }))
        clearInterval(interval);
      }
      else {
        this.setState((state, props) => ({
          current_temp:this.data[this.state.year - start_year],
          year:state.year + 1
        }), () => this.updateData());
      }
    }, 50);
  }
  updateData() { // https://www.d3-graph-gallery.com/graph/barplot_button_data_hard.html
    let data = this.data.slice(0, this.state.year - start_year + 1);
    x.domain(data.map((data, i) => i));
    xAxis.call(d3.axisBottom(x));

    y.domain([Math.max(0.15, d3.max(data, d => d)), Math.min(-0.3, d3.min(data, d => d))]);
    yAxis.call(d3.axisLeft(y)
      .ticks(0.5)
      .tickFormat(i => {
        return i + '°C'
      })
      .tickSizeInner(-width)
      .tickSizeOuter(0));
      
      
    let bars = chart_elements.selectAll('.bar')
      .data(data);

    bars.exit().remove()

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
      .attr('y', d => {
        return y(Math.max(0, d))
      })
      .attr('x', (d, i) => x(i));
  }
  // shouldComponentUpdate(nextProps, nextState) {}
  // static getDerivedStateFromProps(props, state) {}
  // getSnapshotBeforeUpdate(prevProps, prevState) {}
  // static getDerivedStateFromError(error) {}
  // componentDidCatch() {}
  render() {
    return (
      <div className={style.app}>
        <div className={style.title_container}>
          <h3>Temperature anomalies {(month !== 'Year') ? 'in ' + month : ''}</h3>
          <h3>{this.state.start_year}–{this.state.end_year}</h3>
        </div>
        <div className={style.chart_container}></div>
        <div className={style.info_container}>
          <div className={style.hemispehere}>{hemisphere}</div>
          <div className={style.year_container}>{this.state.year}</div>
          <div className={style.temp_container} style={{color: f_text(this.state.current_temp)}}>{((this.state.current_temp > 0) ? '+': '') + this.state.current_temp}°C</div>
          <div className={style.meta_container}>
            <div>Data: <a href="https://data.giss.nasa.gov/gistemp/">NASA</a></div>
            <div>Author: <a href="https://twitter.com/teelmo">Teemo Tebest</a>, EBU</div>
            <div>Reference period: 1951–1980</div>
          </div>
        </div>
      </div>
    );
  }
}
export default App;