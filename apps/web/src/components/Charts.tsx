import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import type { TrendPoint } from "../types";

const axisStyle = {
  axisLine: { lineStyle: { color: "rgba(118, 211, 255, 0.35)" } },
  axisTick: { show: false },
  axisLabel: { color: "rgba(219, 244, 255, 0.68)", fontSize: 10 },
  splitLine: { lineStyle: { color: "rgba(118, 211, 255, 0.1)" } }
};

export function TrendChart({ data, mode = "security" }: { data: TrendPoint[]; mode?: "security" | "energy" | "fire" }) {
  const option: EChartsOption = {
    animationDuration: 500,
    grid: { top: 20, right: 10, bottom: 24, left: 30 },
    tooltip: { trigger: "axis", backgroundColor: "rgba(7, 20, 35, 0.92)", borderColor: "#2dd4bf", textStyle: { color: "#e6fbff" } },
    xAxis: { type: "category", data: data.map((item) => item.time), ...axisStyle },
    yAxis: { type: "value", ...axisStyle },
    series:
      mode === "energy"
        ? [
            {
              name: "能耗",
              type: "bar",
              data: data.map((item) => item.energy),
              itemStyle: { color: "#fbbf24" },
              barWidth: 8
            },
            {
              name: "湿度",
              type: "line",
              smooth: true,
              data: data.map((item) => item.humidity),
              lineStyle: { color: "#2dd4bf", width: 2 },
              symbol: "none"
            }
          ]
        : [
            {
              name: mode === "fire" ? "风险指数" : "通行趋势",
              type: "line",
              smooth: true,
              data: data.map((item) => (mode === "fire" ? item.risk : item.temperature)),
              lineStyle: { color: mode === "fire" ? "#fb7185" : "#38bdf8", width: 2 },
              areaStyle: { color: mode === "fire" ? "rgba(248, 113, 113, 0.18)" : "rgba(56, 189, 248, 0.18)" },
              symbol: "circle",
              symbolSize: 3
            },
            {
              name: "烟雾",
              type: "line",
              smooth: true,
              data: data.map((item) => item.smoke),
              lineStyle: { color: "#94a3b8", width: 1.5, type: "dashed" },
              symbol: "none"
            }
          ]
  };

  return <ReactECharts option={option} style={{ height: 154, width: "100%" }} notMerge lazyUpdate />;
}

export function RingGauge({ value, title }: { value: number; title: string }) {
  const option: EChartsOption = {
    series: [
      {
        type: "gauge",
        startAngle: 90,
        endAngle: -270,
        radius: "88%",
        pointer: { show: false },
        progress: { show: true, overlap: false, roundCap: true, clip: false, itemStyle: { color: "#38bdf8" } },
        axisLine: { lineStyle: { width: 12, color: [[1, "rgba(148, 163, 184, 0.16)"]] } },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value, name: title }],
        title: { color: "#dff8ff", fontSize: 12, offsetCenter: [0, "36%"] },
        detail: { valueAnimation: true, color: "#ffffff", fontSize: 22, offsetCenter: [0, "0%"], formatter: "{value}%" }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 150, width: "100%" }} notMerge lazyUpdate />;
}
