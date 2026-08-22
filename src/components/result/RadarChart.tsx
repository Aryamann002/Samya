import { AXES, AXIS_LABELS, type Axis } from "@/lib/types";

/**
 * A six-axis radar, hand-drawn in SVG.
 *
 * No chart library. Recharts and friends cost roughly 90 KB gzipped to draw a
 * hexagon, and none of them let us control the accessible markup as tightly as
 * this needs.
 *
 * The picture is not the data. The figure carries a short description of the
 * shape, and the values themselves are published underneath as readable text
 * for everybody — sighted or not — rather than buried in a hidden duplicate.
 */

const SIZE_X = 320;
const SIZE_Y = 300;
const CX = 160;
const CY = 150;
const RADIUS = 100;
const LABEL_RADIUS = 122;
const RINGS = 5;

/** Short labels keep the hexagon readable; full names sit in the list below. */
const SHORT_LABELS: Readonly<Record<Axis, string>> = {
  sleep: "Sleep",
  studyHabits: "Study",
  academicLoad: "Load",
  stressMood: "Mood",
  socialSupport: "Support",
  lifestyle: "Lifestyle",
};

function pointAt(index: number, radius: number) {
  const angle = (index * (360 / AXES.length) - 90) * (Math.PI / 180);
  return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
}

function polygonPoints(radii: readonly number[]) {
  return radii
    .map((radius, index) => {
      const { x, y } = pointAt(index, radius);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function anchorFor(index: number): "start" | "middle" | "end" {
  const { x } = pointAt(index, LABEL_RADIUS);
  if (Math.abs(x - CX) < 1) return "middle";
  return x > CX ? "start" : "end";
}

export function RadarChart({ axes }: { axes: Readonly<Record<Axis, number>> }) {
  const values = AXES.map((axis) => axes[axis]);
  const dataRadii = values.map((value) => (value / 100) * RADIUS);

  const highest = AXES.reduce((best, axis) => (axes[axis] > axes[best] ? axis : best), AXES[0]);
  const lowest = AXES.reduce((worst, axis) => (axes[axis] < axes[worst] ? axis : worst), AXES[0]);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${SIZE_X} ${SIZE_Y}`}
        role="img"
        aria-labelledby="radar-title radar-desc"
        className="mx-auto block w-full max-w-sm"
      >
        <title id="radar-title">Your six areas, drawn as a radar chart</title>
        <desc id="radar-desc">
          {`A larger shape means a healthier reading. Your highest area is ${AXIS_LABELS[highest]} at ${axes[highest]} out of 100 and your lowest is ${AXIS_LABELS[lowest]} at ${axes[lowest]} out of 100. Every value is listed as text below the chart.`}
        </desc>

        {/* Rings */}
        {Array.from({ length: RINGS }, (_, ring) => (
          <polygon
            key={ring}
            points={polygonPoints(AXES.map(() => (RADIUS * (ring + 1)) / RINGS))}
            fill="none"
            stroke="var(--samya-outline-faint)"
            strokeWidth={1}
          />
        ))}

        {/* Spokes */}
        {AXES.map((axis, index) => {
          const { x, y } = pointAt(index, RADIUS);
          return (
            <line
              key={axis}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="var(--samya-outline-faint)"
              strokeWidth={1}
            />
          );
        })}

        {/* The reading itself */}
        <polygon
          points={polygonPoints(dataRadii)}
          fill="var(--samya-primary)"
          fillOpacity={0.2}
          stroke="var(--samya-primary)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {dataRadii.map((radius, index) => {
          const { x, y } = pointAt(index, radius);
          return (
            <circle key={AXES[index]} cx={x} cy={y} r={3.5} fill="var(--samya-primary)" />
          );
        })}

        {/* Axis labels */}
        {AXES.map((axis, index) => {
          const { x, y } = pointAt(index, LABEL_RADIUS);
          return (
            <text
              key={axis}
              x={x}
              y={y}
              textAnchor={anchorFor(index)}
              dominantBaseline="middle"
              fontSize={13}
              fill="var(--samya-on-surface-muted)"
            >
              {SHORT_LABELS[axis]}
            </text>
          );
        })}
      </svg>

      <figcaption className="mt-4">
        <h3 className="sr-only-text">Your six areas as numbers</h3>
        <dl className="divide-y divide-outline-faint border-y border-outline-faint">
          {AXES.map((axis) => (
            <div key={axis} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-ink">{AXIS_LABELS[axis]}</dt>
              <dd className="tabular-nums text-ink-muted">{axes[axis]} out of 100</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-ink-muted">
          Higher means healthier. These are your own answers scored against a published rubric, not
          a comparison with anybody else.
        </p>
      </figcaption>
    </figure>
  );
}
