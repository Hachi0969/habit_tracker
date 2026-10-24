import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export interface ChartPoint {
  date: string;
  /** Short x label, e.g. "Mon" or "12". */
  label: string;
  /** null = not logged; the chart shows a gap, never a fake zero. */
  value: number | null;
}

export interface MetricChartProps {
  title: string;
  subtitle: string;
  data: ChartPoint[];
  kind: "bar" | "line";
  /** CSS variable holding the metric's colour, e.g. "--sleep". */
  colorVar: string;
  yLabel: string;
  formatValue: (v: number) => string;
  yDomain?: [number | "auto", number | "auto"];
  yTicks?: number[];
  goal?: { value: number; label: string };
}

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

function ChartTooltip({
  active,
  payload,
  formatValue,
}: TooltipContentProps<number, string> & { formatValue: (v: number) => string }) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg">
      <p className="text-muted">{point.date}</p>
      <p className="font-semibold text-ink tabular-nums">
        {point.value === null ? "Not logged" : formatValue(point.value)}
      </p>
    </div>
  );
}

/**
 * One metric, one series, one y-axis. The title states the finding; the subtitle names the
 * unit. Colour only carries identity; all text stays in ink/muted tokens.
 */
export function MetricChart(props: MetricChartProps) {
  const { title, subtitle, data, kind, colorVar, yLabel, formatValue, yDomain, yTicks, goal } =
    props;
  const color = `var(${colorVar})`;
  const logged = data.filter((d) => d.value !== null).length;
  const dense = data.length > 10;

  const common = (
    <>
      <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
      <XAxis dataKey="label" {...axis} interval={dense ? "preserveStartEnd" : 0} minTickGap={8} />
      <YAxis
        {...axis}
        width={44}
        domain={yDomain ?? [0, "auto"]}
        ticks={yTicks}
        tickFormatter={(v: number) => formatValue(v)}
        label={{
          value: yLabel,
          angle: -90,
          position: "insideLeft",
          fill: "var(--muted)",
          fontSize: 11,
          dy: 30,
        }}
      />
      <Tooltip
        cursor={
          kind === "bar" ? { fill: "var(--surface-2)" } : { stroke: "var(--muted)", strokeWidth: 1 }
        }
        content={(p) => (
          <ChartTooltip {...(p as TooltipContentProps<number, string>)} formatValue={formatValue} />
        )}
      />
      {goal && (
        <ReferenceLine
          y={goal.value}
          stroke="var(--muted)"
          strokeDasharray="4 4"
          label={{
            value: goal.label,
            position: "insideTopRight",
            fill: "var(--muted)",
            fontSize: 11,
          }}
        />
      )}
    </>
  );

  return (
    <figure className="rounded-2xl border border-line bg-surface p-4">
      <figcaption className="mb-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </figcaption>
      {logged === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
          No entries in this period yet
        </div>
      ) : (
        <div className="h-44" role="img" aria-label={`${title}. ${logged} days logged.`}>
          <ResponsiveContainer width="100%" height="100%">
            {kind === "bar" ? (
              <BarChart
                data={data}
                margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                barCategoryGap={dense ? 2 : "25%"}
              >
                {common}
                <Bar
                  dataKey="value"
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                {common}
                <Line
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
