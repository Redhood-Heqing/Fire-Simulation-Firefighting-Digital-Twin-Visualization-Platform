import { Database, Server, Wifi } from "lucide-react";
import { TrendChart } from "../components/Charts";
import { HudPanel, MetricCard } from "../components/HudPanel";
import { LogStream } from "../components/LogStream";
import { useTwinStore } from "../store/useTwinStore";

export default function DataFlow() {
  const stats = useTwinStore((state) => state.stats);
  const sensors = useTwinStore((state) => state.sensors);
  const trends = useTwinStore((state) => state.trends);
  const connected = useTwinStore((state) => state.connected);

  return (
    <div className="dataflow-layout">
      <HudPanel title="后台服务状态" subtitle="REST API + WebSocket 数据流">
        <div className="metric-row">
          <MetricCard label="WebSocket" value={connected ? "在线" : "离线"} tone={connected ? "green" : "red"} />
          <MetricCard label="推送点位" value={sensors.length} tone="cyan" />
          <MetricCard label="告警事件" value={stats.alarms} tone={stats.alarms > 4 ? "red" : "amber"} />
        </div>
        <div className="service-flow">
          <span>
            <Wifi size={18} /> 设备感知端
          </span>
          <i />
          <span>
            <Server size={18} /> 平台服务端
          </span>
          <i />
          <span>
            <Database size={18} /> Web 可视化端
          </span>
        </div>
        <TrendChart data={trends} mode="energy" />
      </HudPanel>
      <HudPanel title="后台数据流" subtitle="支持自动滚动、暂停、清空、导出 JSON 和等级过滤">
        <LogStream />
      </HudPanel>
    </div>
  );
}
