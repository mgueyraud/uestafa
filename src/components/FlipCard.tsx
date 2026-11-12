import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useStrings } from "../i18n";

export type FlipMotion = {
  /**
   * Degrees the card turns under a finger before it is let go: a lean, not a
   * free spin. The turn itself only happens on release.
   */
  lean: number;
  /** A swipe this long (px) or this fast (px/ms) turns the card over. */
  swipe: number;
  flick: number;
  /** The spring that carries the turn, or settles the card back. */
  stiffness: number;
  damping: number;
  mass: number;
};

/**
 * One card with two sides, for screens too narrow for both. A sideways swipe
 * turns it over; under the finger it only leans, then either completes the
 * turn or settles back. Up and down still scroll the page.
 */
export default function FlipCard({
  width,
  height,
  perspective,
  motion: m,
  front,
  back,
}: {
  width: number;
  height: number;
  perspective: number;
  motion: FlipMotion;
  front: ReactNode;
  back: ReactNode;
}) {
  const t = useStrings();
  // Degrees about the vertical axis. It only ever rests on a multiple of 180,
  // and keeps counting up or down so the card turns the way it was swiped.
  const angle = useMotionValue(0);
  const rest = useRef(0);
  const [showsBack, setShowsBack] = useState(false);
  const backAngle = useTransform(angle, (a) => a + 180);
  const facing = (a: number) => Math.cos((a * Math.PI) / 180) >= 0;
  // The side facing away is hidden outright, so it can't be seen through,
  // tapped or tabbed to.
  const frontVisibility = useTransform(angle, (a) =>
    facing(a) ? "visible" : "hidden",
  );
  const backVisibility = useTransform(angle, (a) =>
    facing(a) ? "hidden" : "visible",
  );

  const settle = (velocity = 0) => {
    setShowsBack(Math.abs(rest.current / 180) % 2 === 1);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      angle.set(rest.current);
      return;
    }
    animate(angle, rest.current, {
      type: "spring",
      stiffness: m.stiffness,
      damping: m.damping,
      mass: m.mass,
      velocity,
    });
  };
  const turn = (direction: 1 | -1, velocity = 0) => {
    rest.current += direction * 180;
    settle(velocity);
  };

  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    at: number;
    active: boolean;
  } | null>(null);
  // A swipe that ends on the card must not also open its link.
  const swiped = useRef(false);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swiped.current = false;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      at: e.timeStamp,
      active: false,
    };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.active) {
      // Sideways, and clearly so: otherwise it is a tap or a scroll.
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - d.y)) return;
      d.active = true;
      swiped.current = true;
      angle.stop();
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // Eases off the further the finger goes, and never passes the lean.
    angle.set(rest.current + m.lean * Math.tanh(dx / 150));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    const speed = dx / Math.max(e.timeStamp - d.at, 1);
    const far = Math.abs(dx) > m.swipe || Math.abs(speed) > m.flick;
    if (e.type === "pointerup" && far) turn(dx > 0 ? 1 : -1, speed * 300);
    else settle();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        // Grabbable with a mouse too; the link under it keeps its click.
        className="relative cursor-grab touch-pan-y select-none active:cursor-grabbing [&_a]:cursor-grab active:[&_a]:cursor-grabbing"
        style={{ width, height, perspective }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        // Otherwise a mouse drag picks the link up instead of turning the card.
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (!swiped.current) return;
          swiped.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ rotateY: angle, visibility: frontVisibility }}
        >
          {front}
        </motion.div>
        <motion.div
          className="absolute inset-0"
          style={{ rotateY: backAngle, visibility: backVisibility }}
        >
          {back}
        </motion.div>
      </div>
      {/* The same turn for anyone not swiping: keyboard, switch, screen reader. */}
      <button
        type="button"
        onClick={() => turn(showsBack ? 1 : -1)}
        className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[11px] text-[#8a8a8a] outline-2 outline-transparent transition-[color,scale] duration-150 ease-out hover:text-[#f2f2f2] focus-visible:outline-[#3b82f6] active:scale-[0.97]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M2 6.5h10.5m0 0L9.75 3.75M12.5 6.5 9.75 9.25M14 10.5H3.5m0 0 2.75-2.75M3.5 10.5l2.75 2.75"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {showsBack ? t.showFront : t.showBack}
      </button>
    </div>
  );
}
