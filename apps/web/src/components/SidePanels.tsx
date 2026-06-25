import { AlertTriangle, Building2, Droplets, Gauge, RadioTower, Users, Zap } from "lucide-react";
import { useTwinStore } from "../store/useTwinStore";
import { HudPanel, MetricCard } from "./HudPanel";
import { RingGauge, TrendChart } from "./Charts";
import { LogStream } from "./LogStream";
import { AdvicePanel } from "./AdvicePanel";

export function LeftDashboardPanels() {
  const stats = useTwinStore((state) => state.stats);
  const trends = useTwinStore((state) => state.trends);
  const sensors = useTwinStore((state) => state.sensors);

  return (
    <div className="panel-stack panel-stack--left">
      <HudPanel title="通行信息" subtitle="实时人流与建筑内人数">
        <div className="metric-grid">
          <MetricCard label="通行人次" value={stats.visitorCount.toLocaleString()} tone="cyan" />
          <MetricCard label="通行车次" value={stats.trafficTrips.toLocaleString()} tone="green" />
          <MetricCard label="建筑内人数" value={stats.peopleInside.toLocaleString()} tone="amber" />
          <MetricCard label="实时告警" value={stats.alarms} tone={stats.alarms > 3 ? "red" : "cyan"} />
        </div>
        <TrendChart data={trends} />
      </HudPanel>

      <HudPanel title="安防告警" subtitle="设备响应与异常趋势">
        <div className="alert-strip">
          <AlertTriangle size={18} />
          <span>总告警数</span>
          <strong>{stats.alarms}</strong>
        </div>
        <TrendChart data={trends} mode="fire" />
      </HudPanel>

      <HudPanel title="后台数据流摘要" subtitle={`${sensors.length} 个点位在线推送`}>
        <LogStream compact />
      </HudPanel>
    </div>
  );
}

export function RightDashboardPanels() {
  const stats = useTwinStore((state) => state.stats);
  const trends = useTwinStore((state) => state.trends);
  const fire = useTwinStore((state) => state.fire);

  return (
    <div className="panel-stack panel-stack--right">
      <HudPanel title="建筑设备" subtitle="设备总数与完好率">
        <div className="device-summary">
          <div>
            <Building2 size={22} />
            <span>设备总数</span>
            <strong>{stats.deviceTotal.toLocaleString()}</strong>
          </div>
          <RingGauge value={Math.max(0, Math.round(stats.intactRate))} title="完好率" />
        </div>
      </HudPanel>

      <HudPanel title="能耗监测" subtitle="用水 / 用电 / 当前功率">
        <div className="metric-row">
          <MetricCard label="总能耗" value={Math.round(stats.energyTotal).toLocaleString()} unit="kWh" tone="amber" />
          <MetricCard label="用水" value={stats.waterTotal} unit="m3" tone="cyan" />
          <MetricCard label="用电" value={stats.powerTotal} unit="kWh" tone="green" />
        </div>
        <TrendChart data={trends} mode="energy" />
      </HudPanel>

      <HudPanel title="环境信息" subtitle="PM2.5、温湿度与火灾风险">
        <div className="environment-list">
          <p>
            <Gauge size={16} />
            PM2.5 <strong>{stats.pm25}</strong> ug/m3
          </p>
          <p>
            <Droplets size={16} />
            温湿度 <strong>{stats.temperature} degC / {stats.humidity}%</strong>
          </p>
          <p>
            <Zap size={16} />
            火灾风险 <strong className={fire.status === "active" ? "text-danger" : ""}>{stats.fireRiskIndex}%</strong>
          </p>
          <p>
            <RadioTower size={16} />
            设备响应 <strong>{stats.deviceResponseRate}%</strong>
          </p>
        </div>
        <AdvicePanel />
      </HudPanel>
    </div>
  );
}
