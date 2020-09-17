import React, { Component } from 'react';
import { interpolateRgb, scaleLinear } from 'd3';
import { reduceConfig } from "@easyv/utils/lib/common/reduce-config";
import { spring, tween, parallel } from 'popmotion';
export default class CircularRasterProportionBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data
    };
  }

  componentWillReceiveProps(nextProps) {
    const curData = this.props.data;
    const nextData = nextProps.data;
    const nextConfig = reduceConfig(nextProps.configuration);
    const motionConfig = nextConfig.chart.motionConfig;
    if (motionConfig.motionEnable) nextData.length && this.generateMotion({
      curData,
      nextData,
      motionConfig
    }); else this.setState({
      data: nextData
    });
  }
  /**
   * @description 对比先后组件数据生成动效
   * @param {*} config
   * @memberof Gridbar
   */
  generateMotion(config) {
    const {
      curData,
      nextData,
      motionConfig
    } = config;
    const {
      motionKey,
      motionType,
      stiffness,
      damping,
      mass,
      duration,
      simulative,
      startValue
    } = motionConfig;
    const animate = motionType == 2 ? spring : tween;
    const aniConfig = motionType == 2 ? {
      stiffness,
      damping,
      mass
    } : {
        duration
      }; // 将组件Array数据结构映射到生成的动画流

    const actions$ = nextData.map((o, i) => {
      let from;

      if (curData[i]) {
        if (curData[i][motionKey] === nextData[i][motionKey]) from = simulative ? startValue : curData[i][motionKey]; else from = curData[i][motionKey];
      } else from = 0;

      return animate({
        from,
        to: nextData[i][motionKey],
        ...aniConfig
      });
    }); // 合并动画流生成目标数据Array

    parallel(...actions$).start(data => {
      this.setState({
        data: data.map((v, i) => ({
          ...nextData[i],
          [motionKey]: v
        }))
      });
    });
  }

  render() {
    let config = reduceConfig(this.props.configuration),
      chart = config.chart,
      {
        dimension,
        component
      } = chart,
      {
        angleConfig,
        colorConfig,
        radiusConfig
      } = component.ringConfig,
      {
        offsetConfig,
        numberConfig,
        percentConfig
      } = component.textConfig;
    const data = this.state.data; // 自定义逻辑

    let styles = {
      position: 'absolute',
      top: dimension.chartPosition.top,
      left: dimension.chartPosition.left,
      width: dimension.chartDimension.width,
      height: dimension.chartDimension.height
    };

    const segmentalCount = angleConfig.segmentalCount,
      segmentalAngle = angleConfig.segmentalAngle,
      // 间隔每段段角度
      spacingAngle = (Math.abs(angleConfig.endPoint - angleConfig.startPoint) - angleConfig.segmentalCount * angleConfig.segmentalAngle) / (angleConfig.segmentalCount - 1);

    function cerateArc(cx, cy, radius, thickness, startAngle, offsetAngle) {
      let d = `M${cx + Math.cos(startAngle / 180 * Math.PI) * radius} ${cy - Math.sin(startAngle / 180 * Math.PI) * radius}`;
      d = d + ` A${radius} ${radius} 0 ${offsetAngle > 180 ? 1 : 0} 1 ${cx + Math.cos((startAngle - offsetAngle) / 180 * Math.PI) * radius} ${cy - Math.sin((startAngle - offsetAngle) / 180 * Math.PI) * radius}`;
      d = d + ` L${cx + Math.cos((startAngle - offsetAngle) / 180 * Math.PI) * (radius - thickness)} ${cy - Math.sin((startAngle - offsetAngle) / 180 * Math.PI) * (radius - thickness)}`;
      d = d + ` A${radius - thickness} ${radius - thickness} 0 ${offsetAngle > 180 ? 1 : 0} 0 ${cx + Math.cos(startAngle / 180 * Math.PI) * (radius - thickness)} ${cy - Math.sin(startAngle / 180 * Math.PI) * (radius - thickness)}`;
      d = d + 'Z';
      return d;
    }

    const colorInter = interpolateRgb(colorConfig.startColor, colorConfig.endColor);
    const colorScale = scaleLinear().domain([0, segmentalCount]).range([0, 1]);
    const valueCount = data && data[0] && data[0].value !== undefined ? Math.round(data[0].value * segmentalCount) : 0;
    let backgroundList = [];
    let list2 = [];

    if (data && data.length > 0) {
      let cx = dimension.chartDimension.width / 2,
        cy = dimension.chartDimension.height / 2,
        thickness = Math.abs(radiusConfig.radiusOut - radiusConfig.radiusIn);

      for (let i = 0; i < segmentalCount; i++) {
        const d = cerateArc(cx, cy, radiusConfig.radiusOut, thickness, angleConfig.startPoint - (segmentalAngle + spacingAngle) * i, segmentalAngle);
        backgroundList.push(<path key={i} d={d} stroke={'none'} fill={i >= valueCount ? colorConfig.baseColor : colorInter(colorScale(i + 1))} filter={i >= valueCount ? 'none' : `url(#${this.props.id}_backgroundShadow)`}></path>);
        list2.push(<path key={i} d={d} stroke={'none'} fill={i >= valueCount ? colorConfig.baseColor : colorInter(colorScale(i + 1))}></path>);
      }
    }

    return <div className="__easyv-component" style={{
      ...styles
    }} id={this.props.id}>
      <svg style={{
        width: '100%',
        height: '100%'
      }}>
        <defs>
          <filter id={`${this.props.id}_backgroundShadow`} x="-200%" y="-200%" width="500%" height="500%">
            <feOffset result="offOut" in="SourceGraphic" dx="0" dy="0"></feOffset>
            <feGaussianBlur result="blurOut" in="offOut" stdDeviation="4"></feGaussianBlur>
            <feGaussianBlur result="blurOut2" in="offOut" stdDeviation="4"></feGaussianBlur>
            <feBlend in2="blurOut2" in2="blurOut" mode="multiply"></feBlend>
          </filter>
        </defs>
        <g>
          {backgroundList}
        </g>
        <g>
          {list2}
        </g>
      </svg>
      {data && data.length > 0 && <div style={{
        position: 'absolute',
        top: dimension.chartDimension.height / 2 + offsetConfig.y,
        left: dimension.chartDimension.width / 2 + offsetConfig.x,
        color: '#fff',
        transform: 'translate(-50%, -50%)'
      }}>
        <span style={{
          ...numberConfig,
          textShadow: numberConfig.shadow ? `${numberConfig.shadowH}px ${numberConfig.shadowV}px ${numberConfig.shadowBlur}px ${numberConfig.shadowColor}` : 'none' // textShadow: '0px 0px 20px #FF0000'

        }}>{(data[0].value * 100).toFixed(numberConfig.decimalPoint)}</span><span style={{
          ...percentConfig,
          textShadow: percentConfig.shadow ? `${percentConfig.shadowH}px ${percentConfig.shadowV}px ${percentConfig.shadowBlur}px ${percentConfig.shadowColor}` : 'none' // textShadow: '0px 0px 20px #FF0000'

        }}>{data[0].suffix}</span>
      </div>}
    </div>;
  }
}