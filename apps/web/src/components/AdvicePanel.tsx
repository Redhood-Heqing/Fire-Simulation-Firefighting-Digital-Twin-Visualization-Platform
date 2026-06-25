import { BrainCircuit, ShieldAlert } from "lucide-react";
import { useTwinStore } from "../store/useTwinStore";

export function AdvicePanel() {
  const advice = useTwinStore((state) => state.advice);
  const fire = useTwinStore((state) => state.fire);

  return (
    <div className={`advice-card advice-card--${advice.level}`}>
      <div className="advice-card__title">
        {fire.status === "active" ? <ShieldAlert size={18} /> : <BrainCircuit size={18} />}
        <strong>{advice.title}</strong>
        <span>{advice.level}</span>
      </div>
      <p>{advice.content}</p>
      <small>本系统为演示型辅助决策系统，不能替代正式消防报警系统和专业消防指挥。</small>
    </div>
  );
}
