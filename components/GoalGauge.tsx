import { formatYen } from "@/lib/dates";
import Link from "next/link";

/**
 * 月次売上目標の達成ゲージ。
 * achieved = 今月の売上（発行ベース・税込）
 * potential = 進行中・未請求案件の税込見込み額（「あとこれだけ請求すれば」の部分）
 */
export default function GoalGauge({
  goal,
  achieved,
  potential,
  monthLabel,
}: {
  goal: number;
  achieved: number;
  potential: number;
  monthLabel: string;
}) {
  if (goal <= 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-white/60 p-5 text-sm text-gray-500">
        <Link href="/settings" className="text-sky-600 hover:underline">
          設定
        </Link>
        で月次売上目標を入力すると、ここに達成ゲージが表示されます。
      </div>
    );
  }

  const percent = Math.round((achieved / goal) * 100);
  const achievedRatio = Math.min(achieved / goal, 1);
  const potentialRatio = Math.min((achieved + potential) / goal, 1) - achievedRatio;
  const remaining = goal - achieved;
  const reached = remaining <= 0;
  const reachableWithPotential = achieved + potential >= goal;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-bold">
          {monthLabel}の目標
          <span className="ml-2 text-sm font-normal text-gray-400 tabular-nums">
            {formatYen(goal)}
          </span>
        </h2>
        <p
          className={`text-2xl font-bold tabular-nums ${
            reached ? "text-emerald-600" : "text-slate-800"
          }`}
        >
          {percent}
          <span className="text-base font-medium">%</span>
          {reached && <span className="ml-1.5 text-xl">🎉</span>}
        </p>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-gray-100">
        <div className="flex h-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
            style={{ width: `${achievedRatio * 100}%` }}
          />
          {potentialRatio > 0 && (
            <div
              className="h-full bg-emerald-200"
              style={{ width: `${potentialRatio * 100}%` }}
            />
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p className="text-gray-600">
          実績{" "}
          <strong className="tabular-nums text-slate-800">
            {formatYen(achieved)}
          </strong>
          {reached ? (
            <span className="ml-2 font-medium text-emerald-600">
              目標達成！お疲れさまです
            </span>
          ) : (
            <span className="ml-2 text-gray-500">
              あと <strong className="tabular-nums">{formatYen(remaining)}</strong>
            </span>
          )}
        </p>
        {!reached && potential > 0 && (
          <p className="text-xs text-gray-400">
            進行中（未請求）を全部請求すれば {formatYen(achieved + potential)}
            {reachableWithPotential && (
              <span className="ml-1 font-medium text-emerald-600">
                → 目標に届きます 💪
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
