import { TAX_MODES, TAX_MODE_LABELS } from "@/lib/invoice";

/** 消費税の計算方法セレクト（通常 / インボイス未登録の経過措置調整） */
export default function TaxModeSelect({
  defaultValue,
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <>
      <select
        name="taxMode"
        defaultValue={defaultValue ?? "STANDARD"}
        className={
          className ?? "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        }
      >
        {TAX_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {TAX_MODE_LABELS[mode]}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-gray-400">
        インボイス未登録の場合、相手先は消費税の一部しか控除できません（〜2026/9:
        80%、〜2029/9: 50%）。調整モードでは控除できない分を値引きします。割合は発行日から自動判定されます。
      </span>
    </>
  );
}
