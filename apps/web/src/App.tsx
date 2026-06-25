import { useEffect } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import {
  Activity,
  BellRing,
  Blocks,
  Building2,
  Database,
  Flame,
  Home,
  MessageSquare,
  RadioTower,
  Settings,
  ShieldCheck,
  Users,
  Zap
} from "lucide-react";
import { useTwinStore } from "./store/useTwinStore";
import Dashboard from "./pages/Dashboard";
import ModelEditor from "./pages/ModelEditor";
import Sensors from "./pages/Sensors";
import DataFlow from "./pages/DataFlow";
import FireEmergency from "./pages/FireEmergency";
import SettingsPage from "./pages/Settings";

const topNav = [
  { to: "/dashboard", label: "综合态势", icon: Activity },
  { to: "/dashboard?security", label: "智慧安防", icon: ShieldCheck },
  { to: "/sensors", label: "智慧物联", icon: RadioTower },
  { to: "/dashboard?access", label: "智慧通行", icon: Users },
  { to: "/dashboard?logistics", label: "智慧后勤", icon: Blocks },
  { to: "/dashboard?energy", label: "能源管理", icon: Zap },
  { to: "/model-editor", label: "楼宇自控", icon: Building2 },
  { to: "/fire-emergency", label: "火灾应急", icon: Flame }
];

const bottomNav = [
  { to: "/dashboard", label: "HOME", icon: Home },
  { to: "/sensors", label: "设备集成", icon: RadioTower },
  { to: "/dashboard?users", label: "用户集成", icon: Users },
  { to: "/model-editor", label: "空间管理", icon: Building2 },
  { to: "/data-flow", label: "消息集成", icon: MessageSquare },
  { to: "/data-flow", label: "数据集成", icon: Database },
  { to: "/fire-emergency", label: "应急推演", icon: Flame },
  { to: "/model-editor", label: "模型编辑", icon: Settings }
];

function Shell() {
  const connected = useTwinStore((state) => state.connected);
  const stats = useTwinStore((state) => state.stats);
  const fire = useTwinStore((state) => state.fire);
  const loadSnapshot = useTwinStore((state) => state.loadSnapshot);
  const connectRealtime = useTwinStore((state) => state.connectRealtime);

  useEffect(() => {
    void loadSnapshot();
    const disconnect = connectRealtime();
    return disconnect;
  }, [connectRealtime, loadSnapshot]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__edge" />
        <nav className="topbar__nav" aria-label="顶部模块导航">
          {topNav.map((item) => (
            <NavLink key={item.label} to={item.to} className="topbar__item">
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="topbar__title">
          <span>火灾模拟与消防数字孪生可视化平台</span>
          <small>Fire Simulation & Firefighting Digital Twin Visualization Platform</small>
        </div>
        <div className="topbar__status">
          <span className={connected ? "status-dot is-online" : "status-dot"} />
          <span>{connected ? "实时连接" : "离线"}</span>
          <span>{stats.temperature || 31} degC</span>
          <span>{stats.humidity || 67}%</span>
          <span>{new Date().toLocaleTimeString("zh-CN", { hour12: false })}</span>
        </div>
      </header>

      <main className={fire.status === "active" ? "main-stage is-fire" : "main-stage"}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/model-editor" element={<ModelEditor />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/data-flow" element={<DataFlow />} />
          <Route path="/fire-emergency" element={<FireEmergency />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <nav className="bottom-dock" aria-label="底部功能入口">
        {bottomNav.map((item) => (
          <NavLink key={`${item.label}-${item.to}`} to={item.to} className="dock-button">
            <item.icon size={22} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return <Shell />;
}
