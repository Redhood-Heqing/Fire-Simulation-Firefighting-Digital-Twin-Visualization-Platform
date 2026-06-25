import { Activity, Plus } from "lucide-react";
import { SensorPropertyPanel } from "../components/EditorPanels";
import { HudPanel } from "../components/HudPanel";
import { useTwinStore } from "../store/useTwinStore";
import { SceneCanvas } from "../three/SceneCanvas";
import type { SensorType } from "../types";

const sensorTypeOptions: SensorType[] = ["temperature", "humidity", "smoke", "energy", "door", "camera", "waterPressure", "alarm", "aiRisk"];

export default function Sensors() {
  const sensors = useTwinStore((state) => state.sensors);
  const selectSensor = useTwinStore((state) => state.selectSensor);
  const selectedSensorId = useTwinStore((state) => state.selectedSensorId);
  const setSensorPlacementType = useTwinStore((state) => state.setSensorPlacementType);

  return (
    <div className="workspace-layout sensors-page">
      <section className="workspace-main">
        <div className="stage-actions">
          {sensorTypeOptions.slice(0, 5).map((type) => (
            <button key={type} onClick={() => setSensorPlacementType(type)}>
              <Plus size={16} />
              新增 {type}
            </button>
          ))}
        </div>
        <SceneCanvas editor />
      </section>
      <aside className="workspace-side">
        <HudPanel title="传感器管理" subtitle={`${sensors.length} 个模拟与自定义点位`}>
          <div className="sensor-table">
            {sensors.map((sensor) => (
              <button key={sensor.id} className={selectedSensorId === sensor.id ? "is-active" : ""} onClick={() => selectSensor(sensor.id)}>
                <span className={`status-dot status-dot--${sensor.status}`} />
                <div>
                  <strong>{sensor.name}</strong>
                  <small>
                    {sensor.areaName} / {sensor.value}
                    {sensor.unit}
                  </small>
                </div>
                <Activity size={14} />
              </button>
            ))}
          </div>
        </HudPanel>
        <SensorPropertyPanel />
      </aside>
    </div>
  );
}
