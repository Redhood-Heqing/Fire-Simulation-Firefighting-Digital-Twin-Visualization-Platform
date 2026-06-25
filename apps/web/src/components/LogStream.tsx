import { Download, Pause, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTwinStore } from "../store/useTwinStore";
import type { LogLevel } from "../types";

const filters: Array<{ label: string; value: LogLevel | "all" }> = [
  { label: "全部", value: "all" },
  { label: "正常", value: "normal" },
  { label: "告警", value: "warning" },
  { label: "火灾", value: "fire" }
];

export function LogStream({ compact = false }: { compact?: boolean }) {
  const logs = useTwinStore((state) => state.logs);
  const clearLogs = useTwinStore((state) => state.clearLogs);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState(logs);

  const visibleLogs = useMemo(() => {
    const source = paused ? frozen : logs;
    return filter === "all" ? source : source.filter((log) => log.level === filter);
  }, [filter, frozen, logs, paused]);

  function togglePaused() {
    if (!paused) setFrozen(logs);
    setPaused((value) => !value);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(visibleLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fire-twin-logs-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={compact ? "log-stream log-stream--compact" : "log-stream"}>
      <div className="log-stream__toolbar">
        <div className="segmented">
          {filters.map((item) => (
            <button key={item.value} className={filter === item.value ? "is-active" : ""} onClick={() => setFilter(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="icon-actions">
          <button aria-label={paused ? "继续滚动" : "暂停滚动"} title={paused ? "继续滚动" : "暂停滚动"} onClick={togglePaused}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button aria-label="导出 JSON" title="导出 JSON" onClick={exportJson}>
            <Download size={16} />
          </button>
          <button aria-label="清空日志" title="清空日志" onClick={() => void clearLogs()}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="log-stream__list">
        {visibleLogs.map((log) => (
          <div key={log.id} className={`log-line log-line--${log.level}`}>
            <span>[{log.time}]</span>
            <p>{log.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
