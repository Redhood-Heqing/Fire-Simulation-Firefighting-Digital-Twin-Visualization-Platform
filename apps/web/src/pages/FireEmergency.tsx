import { Fan, Flame, LocateFixed, RotateCcw, Route } from "lucide-react";
import { AdvicePanel } from "../components/AdvicePanel";
import { HudPanel, MetricCard } from "../components/HudPanel";
import { LogStream } from "../components/LogStream";
import { useTwinStore } from "../store/useTwinStore";
import { SceneCanvas } from "../three/SceneCanvas";

export default function FireEmergency() {
  const fire = useTwinStore((state) => state.fire);
  const affectedZones = useTwinStore((state) => state.affectedZones);
  const routes = useTwinStore((state) => state.routes);
  const startFire = useTwinStore((state) => state.startFire);
  const stopFire = useTwinStore((state) => state.stopFire);
  const setExhaust = useTwinStore((state) => state.setExhaust);
  const setViewMode = useTwinStore((state) => state.setViewMode);

  return (
    <div className="workspace-layout fire-page">
      <section className="workspace-main">
        <div className="stage-actions">
          <button className="danger-action" onClick={() => void startFire()}>
            <Flame size={16} />
            模拟火灾
          </button>
          <button onClick={() => setViewMode("fire")}>
            <LocateFixed size={16} />
            点位触发
          </button>
          <button onClick={() => void setExhaust(true)}>
            <Fan size={16} />
            开启排烟系统
          </button>
          <button onClick={() => void setExhaust(false)}>
            <Fan size={16} />
            关闭排烟系统
          </button>
          <button onClick={() => void stopFire()}>
            <RotateCcw size={16} />
            结束演示
          </button>
        </div>
        <SceneCanvas editor />
      </section>
      <aside className="workspace-side">
        <HudPanel title="火灾事件状态" subtitle={fire.status === "active" ? fire.id : "未触发"}>
          <div className="metric-grid">
            <MetricCard label="状态" value={fire.status} tone={fire.status === "active" ? "red" : "green"} />
            <MetricCard label="风险等级" value={fire.riskLevel} tone={fire.status === "active" ? "red" : "cyan"} />
            <MetricCard label="推演秒数" value={fire.spreadStep} unit="s" tone="amber" />
            <MetricCard label="影响人数" value={affectedZones.estimatedAffectedPeople} tone="violet" />
          </div>
          <div className="zone-list">
            <strong>受影响楼层</strong>
            <p>{affectedZones.affectedFloors.length ? affectedZones.affectedFloors.map((floor) => `${floor}F`).join(" / ") : "暂无"}</p>
            <strong>高危区域</strong>
            <p>{affectedZones.dangerZones.slice(0, 5).join("、") || "暂无"}</p>
          </div>
        </HudPanel>

        <HudPanel title="逃生路线" subtitle="Dijkstra 成本规划，危险区域禁止通行">
          <div className="route-list">
            {routes.map((route) => (
              <div key={route.id} className={`route-card route-card--${route.type}`}>
                <div>
                  <Route size={16} />
                  <strong>{route.name}</strong>
                  <span>安全分 {route.safetyScore}</span>
                </div>
                <p>{route.labels.join(" -> ")}</p>
                <small>
                  距离 {route.distance}m / 预计 {route.estimatedTime}s
                </small>
              </div>
            ))}
          </div>
        </HudPanel>
        <AdvicePanel />
        <HudPanel title="应急后台流" dense>
          <LogStream compact />
        </HudPanel>
      </aside>
    </div>
  );
}
