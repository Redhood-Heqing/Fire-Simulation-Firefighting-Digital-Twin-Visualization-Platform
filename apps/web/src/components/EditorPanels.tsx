import { RotateCcw, Save, Trash2 } from "lucide-react";
import { useTwinStore } from "../store/useTwinStore";
import type { BuildingObject, SensorData, SensorType } from "../types";
import { HudPanel } from "./HudPanel";

const buildingTypes: BuildingObject["type"][] = ["library", "annex", "road", "water", "green", "floor", "room", "stair", "exit", "plaza", "corridor", "equipment"];
const sensorTypes: SensorType[] = ["temperature", "humidity", "smoke", "energy", "door", "camera", "waterPressure", "alarm", "aiRisk"];

function NumberInput({ label, value, onChange, step = 0.1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={Number(value.toFixed(2))} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectInput<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (value: T) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BuildingPropertyPanel() {
  const selectedBuildingId = useTwinStore((state) => state.selectedBuildingId);
  const building = useTwinStore((state) => state.buildings.find((item) => item.id === selectedBuildingId));
  const patchBuildingLocal = useTwinStore((state) => state.patchBuildingLocal);
  const saveBuilding = useTwinStore((state) => state.saveBuilding);
  const resetBuilding = useTwinStore((state) => state.resetBuilding);
  const floors = useTwinStore((state) => state.floors);
  const setFloorVisible = useTwinStore((state) => state.setFloorVisible);
  const setViewMode = useTwinStore((state) => state.setViewMode);
  const setShowSensors = useTwinStore((state) => state.setShowSensors);
  const setTransparentMode = useTwinStore((state) => state.setTransparentMode);
  const showSensors = useTwinStore((state) => state.showSensors);
  const transparentMode = useTwinStore((state) => state.transparentMode);
  const sceneViewMode = useTwinStore((state) => state.sceneViewMode);

  return (
    <HudPanel title="模型构件编辑" subtitle="支持选中、拖动、缩放、拉伸和属性保存" className="editor-panel">
      <div className="toolbar-grid">
        {(["overview", "walk", "section", "fire"] as const).map((mode) => (
          <button key={mode} className={sceneViewMode === mode ? "is-active" : ""} onClick={() => setViewMode(mode)}>
            {mode === "overview" ? "俯视" : mode === "walk" ? "漫游" : mode === "section" ? "剖切" : "消防"}
          </button>
        ))}
      </div>
      <div className="toggle-row">
        <label>
          <input type="checkbox" checked={showSensors} onChange={(event) => setShowSensors(event.target.checked)} />
          显示传感器
        </label>
        <label>
          <input type="checkbox" checked={transparentMode} onChange={(event) => setTransparentMode(event.target.checked)} />
          透明模式
        </label>
      </div>
      <div className="floor-strip">
        {floors.map((floor) => (
          <button key={floor.id} className={floor.visible ? "is-active" : ""} onClick={() => void setFloorVisible(floor.id, !floor.visible)}>
            {floor.name}
          </button>
        ))}
      </div>

      {!building ? <p className="empty-note">在三维场景中点击一个建筑构件开始编辑。</p> : null}
      {building ? (
        <div className="form-grid">
          <TextInput label="名称" value={building.name} onChange={(value) => patchBuildingLocal(building.id, { name: value })} />
          <SelectInput label="类型" value={building.type} options={buildingTypes} onChange={(value) => patchBuildingLocal(building.id, { type: value })} />
          <NumberInput label="位置 X" value={building.position.x} onChange={(value) => patchBuildingLocal(building.id, { position: { ...building.position, x: value } })} />
          <NumberInput label="位置 Y" value={building.position.y} onChange={(value) => patchBuildingLocal(building.id, { position: { ...building.position, y: value } })} />
          <NumberInput label="位置 Z" value={building.position.z} onChange={(value) => patchBuildingLocal(building.id, { position: { ...building.position, z: value } })} />
          <NumberInput label="旋转 Y" value={building.rotation.y} onChange={(value) => patchBuildingLocal(building.id, { rotation: { ...building.rotation, y: value } })} />
          <NumberInput label="缩放 X" value={building.scale.x} onChange={(value) => patchBuildingLocal(building.id, { scale: { ...building.scale, x: value } })} />
          <NumberInput label="拉伸高度" value={building.scale.y} onChange={(value) => patchBuildingLocal(building.id, { scale: { ...building.scale, y: value } })} />
          <NumberInput label="缩放 Z" value={building.scale.z} onChange={(value) => patchBuildingLocal(building.id, { scale: { ...building.scale, z: value } })} />
          <NumberInput label="楼层数" value={building.floors ?? 1} step={1} onChange={(value) => patchBuildingLocal(building.id, { floors: value })} />
          <label className="field">
            <span>颜色</span>
            <input type="color" value={building.color ?? "#7dd3fc"} onChange={(event) => patchBuildingLocal(building.id, { color: event.target.value })} />
          </label>
          <NumberInput label="透明度" value={building.opacity ?? 0.8} step={0.05} onChange={(value) => patchBuildingLocal(building.id, { opacity: Math.max(0.1, Math.min(1, value)) })} />
          <button className="primary-action" onClick={() => void saveBuilding(building.id)}>
            <Save size={16} />
            保存构件
          </button>
          <button className="restore-action" onClick={() => void resetBuilding(building.id)} title="恢复该构件的初始位置、旋转、缩放、颜色和属性">
            <RotateCcw size={16} />
            恢复初始值
          </button>
        </div>
      ) : null}
    </HudPanel>
  );
}

export function SensorPropertyPanel() {
  const selectedSensorId = useTwinStore((state) => state.selectedSensorId);
  const sensor = useTwinStore((state) => state.sensors.find((item) => item.id === selectedSensorId));
  const patchSensorLocal = useTwinStore((state) => state.patchSensorLocal);
  const saveSensor = useTwinStore((state) => state.saveSensor);
  const deleteSelectedSensor = useTwinStore((state) => state.deleteSelectedSensor);
  const setSensorPlacementType = useTwinStore((state) => state.setSensorPlacementType);
  const sensorPlacementType = useTwinStore((state) => state.sensorPlacementType);

  return (
    <HudPanel title="传感器点位编辑" subtitle="新增、拖动、删除和查看实时数据" className="editor-panel">
      <div className="sensor-type-grid">
        {sensorTypes.map((type) => (
          <button key={type} className={sensorPlacementType === type ? "is-active" : ""} onClick={() => setSensorPlacementType(sensorPlacementType === type ? undefined : type)}>
            {type}
          </button>
        ))}
      </div>
      <p className="empty-note">{sensorPlacementType ? "在三维场景地面点击即可放置新点位。" : "选择一种传感器类型，或点击现有点位进行编辑。"}</p>

      {sensor ? (
        <div className="form-grid">
          <TextInput label="名称" value={sensor.name} onChange={(value) => patchSensorLocal(sensor.id, { name: value })} />
          <SelectInput label="类型" value={sensor.type} options={sensorTypes} onChange={(value) => patchSensorLocal(sensor.id, { type: value })} />
          <NumberInput label="楼层" value={sensor.floor} step={1} onChange={(value) => patchSensorLocal(sensor.id, { floor: value })} />
          <TextInput label="所属区域" value={sensor.areaName} onChange={(value) => patchSensorLocal(sensor.id, { areaName: value })} />
          <NumberInput label="采样频率" value={sensor.samplingRate} step={1} onChange={(value) => patchSensorLocal(sensor.id, { samplingRate: value })} />
          <NumberInput label="位置 X" value={sensor.position.x} onChange={(value) => patchSensorLocal(sensor.id, { position: { ...sensor.position, x: value } })} />
          <NumberInput label="位置 Y" value={sensor.position.y} onChange={(value) => patchSensorLocal(sensor.id, { position: { ...sensor.position, y: value } })} />
          <NumberInput label="位置 Z" value={sensor.position.z} onChange={(value) => patchSensorLocal(sensor.id, { position: { ...sensor.position, z: value } })} />
          <div className={`sensor-live sensor-live--${sensor.status}`}>
            <span>实时数据</span>
            <strong>
              {sensor.value}
              {sensor.unit}
            </strong>
            <em>{sensor.status}</em>
          </div>
          <button className="primary-action" onClick={() => void saveSensor(sensor.id)}>
            <Save size={16} />
            保存点位
          </button>
          <button className="danger-action" onClick={() => void deleteSelectedSensor()}>
            <Trash2 size={16} />
            删除点位
          </button>
        </div>
      ) : null}
    </HudPanel>
  );
}
