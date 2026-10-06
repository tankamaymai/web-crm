import Image from "next/image";

/**
 * Fleet CRM のロゴ。
 * 濃い背景（サイドバー）では紺色の部分が沈むので、白い角丸の土台に載せる。
 */
export default function BrandLogo({
  size,
  onDark = false,
}: {
  size: number;
  onDark?: boolean;
}) {
  const image = (
    <Image
      src="/logo.png"
      alt="Fleet CRM"
      width={onDark ? Math.round(size * 0.82) : size}
      height={onDark ? Math.round(size * 0.82) : size}
      priority
    />
  );
  if (!onDark) return image;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-white"
      style={{ width: size, height: size }}
    >
      {image}
    </span>
  );
}
