import { Flame, PlayCircle, RotateCcw, Siren } from "lucide-react";
import { LeftDashboardPanels, RightDashboardPanels } from "../components/SidePanels";
import { useTwinStore } from "../store/useTwinStore";
import { SceneCanvas } from "../three/SceneCanvas";

export default function Dashboard() {
  const startFire = useTwinStore((state) => state.startFire);
  const stopFire = useTwinStore((state) => state.stopFire);
  const setDemoMode = useTwinStore((state) => state.setDemoMode);
  const fire = useTwinStore((state) => state.fire);

  return (
    <div className="dashboard-layout">
      <LeftDashboardPanels />
      <section className="center-stage">
        <div className="stage-actions">
          <button onClick={() => void setDemoMode("normal")}>
            <PlayCircle size={16} />
            正常运行
          </button>
          <button onClick={() => void setDemoMode("abnormal")}>
            <Siren size={16} />
            设备异常
          </button>
          <button className="danger-action" onClick={() => void startFire()}>
            <Flame size={16} />
            模拟火灾
          </button>
          {fire.status === "active" ? (
            <button onClick={() => void stopFire()}>
              <RotateCcw size={16} />
              结束演示
            </button>
          ) : null}
        </div>
        <SceneCanvas />
      </section>
      <RightDashboardPanels />
    </div>
  );
}
