import { FileBox, FolderOpen, Settings2 } from "lucide-react";
import { HudPanel } from "../components/HudPanel";
import { useTwinStore } from "../store/useTwinStore";

export default function SettingsPage() {
  const sensors = useTwinStore((state) => state.sensors);
  const buildings = useTwinStore((state) => state.buildings);

  return (
    <div className="settings-layout">
      <HudPanel title="系统设置" subtitle="本地演示型数字孪生平台">
        <div className="settings-grid">
          <div className="settings-card">
            <Settings2 size={24} />
            <strong>运行配置</strong>
            <p>前端 Vite 默认端口 5173，后端 Express/WebSocket 默认端口 3001。</p>
          </div>
          <div className="settings-card">
            <FolderOpen size={24} />
            <strong>Revit 模型导入</strong>
            <p>将 Revit 导出的 GLB 放入 apps/web/public/models/library_complex.glb，系统会自动加载。</p>
          </div>
          <div className="settings-card">
            <FileBox size={24} />
            <strong>DWG 资料</strong>
            <p>D:\档案馆\办公塔楼施工图_t8.dwg 可作为后续 CAD/Revit 转模参考；当前电脑未发现可用 AutoCAD 主程序。</p>
          </div>
        </div>
      </HudPanel>
      <HudPanel title="当前数据资产" subtitle="模型、点位与演示状态">
        <div className="metric-row">
          <div className="asset-pill">模型构件 {buildings.length}</div>
          <div className="asset-pill">传感器点位 {sensors.length}</div>
          <div className="asset-pill">支持 GLB 导入</div>
          <div className="asset-pill">支持火灾推演</div>
        </div>
      </HudPanel>
    </div>
  );
}
