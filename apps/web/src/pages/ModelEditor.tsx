import { BuildingPropertyPanel, SensorPropertyPanel } from "../components/EditorPanels";
import { SceneCanvas } from "../three/SceneCanvas";

export default function ModelEditor() {
  return (
    <div className="workspace-layout">
      <section className="workspace-main">
        <SceneCanvas editor />
      </section>
      <aside className="workspace-side">
        <BuildingPropertyPanel />
        <SensorPropertyPanel />
      </aside>
    </div>
  );
}
