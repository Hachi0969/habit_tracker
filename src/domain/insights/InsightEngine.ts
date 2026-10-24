import type { Insight, InsightContext, InsightRule } from "./Insight.ts";
import { defaultRules } from "./rules.ts";

/** BR6: insights describe patterns, never causes. */
export const CAUSAL_WORDING = /\b(because|causes?|caused|causing|leads? to|due to)\b/i;

/** Insights based on fewer days than this get a "small sample" caveat. */
export const SMALL_SAMPLE_DAYS = 14;

/**
 * Runs every rule and collects the insights.
 * Open/Closed: add a new insight by writing a new InsightRule; this class does not change.
 */
export class InsightEngine {
  private readonly rules: readonly InsightRule[];

  constructor(rules: readonly InsightRule[] = defaultRules()) {
    this.rules = rules;
  }

  run(context: InsightContext): Insight[] {
    const insights: Insight[] = [];
    for (const rule of this.rules) {
      const insight = rule.evaluate(context);
      if (!insight) continue;
      // Guard BR6 even if a future rule forgets it.
      if (CAUSAL_WORDING.test(insight.text) || insight.sampleSize <= 0) continue;
      insights.push(withSampleCaveat(insight));
    }
    return insights;
  }
}

function withSampleCaveat(insight: Insight): Insight {
  if (insight.caveat || insight.sampleSize >= SMALL_SAMPLE_DAYS) return insight;
  return { ...insight, caveat: `Based on only ${insight.sampleSize} days, so treat it as a hint.` };
}
