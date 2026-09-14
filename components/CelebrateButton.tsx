"use client";

/**
 * 押した瞬間に紙吹雪を飛ばす送信ボタン。
 * 「入金済みにする」のようなお祝いしたいアクションの <form> 内で使う。
 */
const COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#e34948", "#e87ba4", "#4a3aa7"];

function fireConfetti(originX: number, originY: number) {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const particles = Array.from({ length: 120 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
    };
  });

  const start = performance.now();
  const DURATION = 1800;

  function frame(now: number) {
    const elapsed = now - start;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (elapsed > DURATION) {
      canvas.remove();
      return;
    }
    const fade = 1 - elapsed / DURATION;
    for (const p of particles) {
      p.vy += 0.25; // 重力
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export default function CelebrateButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }}
    >
      {children}
    </button>
  );
}
