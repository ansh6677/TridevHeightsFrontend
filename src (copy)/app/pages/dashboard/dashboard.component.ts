import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorText } from '../../core/error-text';
import { DashboardSummary, MonthPoint } from '../../core/models';

interface Bar {
  point: MonthPoint;
  inHeight: number;
  outHeight: number;
}

/** Movement against last month, already judged good or bad. */
export interface Trend {
  pct: number;
  up: boolean;
  good: boolean;
}

@Component({
  selector: 'th-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly api = inject(ApiService);

  readonly data = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly span = signal(6);

  /**
   * Bars are scaled against the single largest value across both series, so
   * income and spend stay visually comparable. Scaling each series to its own
   * max would make a small expense month look as tall as a big rent month.
   */
  readonly bars = computed<Bar[]>(() => {
    const months = this.data()?.months ?? [];
    const peak = Math.max(
      1,
      ...months.map((m) => Math.max(Number(m.collected), Number(m.expense)))
    );
    return months.map((point) => ({
      point,
      inHeight: (Number(point.collected) / peak) * 100,
      outHeight: (Number(point.expense) / peak) * 100
    }));
  });

  /** Totals for the two list cards, shown as a strip above the rows. */
  readonly pendingTotal = computed(() =>
    (this.data()?.pendingTenants ?? []).reduce((sum, t) => sum + Number(t.monthlyRent), 0)
  );

  readonly recentExpenseTotal = computed(() =>
    (this.data()?.recentExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)
  );

  readonly biggestExpense = computed(() => {
    const list = this.data()?.recentExpenses ?? [];
    return list.length
      ? [...list].sort((a, b) => Number(b.amount) - Number(a.amount))[0]
      : null;
  });

  /**
   * This month against the one before it. A figure on its own says nothing
   * about whether the month is going well — the direction is the useful part.
   */
  private readonly lastTwo = computed(() => {
    const months = this.data()?.months ?? [];
    return months.length >= 2
      ? { now: months[months.length - 1], before: months[months.length - 2] }
      : null;
  });

  readonly collectedTrend = computed(() => {
    const p = this.lastTwo();
    return p ? trend(Number(p.now.collected), Number(p.before.collected), true) : null;
  });

  readonly expenseTrend = computed(() => {
    const p = this.lastTwo();
    return p ? trend(Number(p.now.expense), Number(p.before.expense), false) : null;
  });

  readonly netTrend = computed(() => {
    const p = this.lastTwo();
    return p ? trend(Number(p.now.net), Number(p.before.net), true) : null;
  });

  /** The bar the pointer is on, read out above the chart. */
  readonly hovered = signal<MonthPoint | null>(null);

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await this.api.dashboard(this.span()));
    } catch (e) {
      this.error.set(errorText(e, 'Could not load the dashboard.'));
    } finally {
      this.loading.set(false);
    }
  }

  setSpan(months: number): void {
    this.span.set(months);
    this.load();
  }

  /** Share of this month's spend, used for the recent-expense bars. */
  sharePercent(amount: number): number {
    const list = this.data()?.recentExpenses ?? [];
    const peak = Math.max(1, ...list.map((e) => Number(e.amount)));
    return Math.round((Number(amount) / peak) * 100);
  }

  /** How much of the month's rent this one tenant is holding up. */
  pendingShare(amount: number): number {
    const list = this.data()?.pendingTenants ?? [];
    const peak = Math.max(1, ...list.map((t) => Number(t.monthlyRent)));
    return Math.round((Number(amount) / peak) * 100);
  }

  /** Up to two letters for the little avatar beside a name. */
  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }
}

/**
 * Percentage movement, plus whether that movement is a good thing. Rising
 * collection is good; rising expenses is not, which is what `higherIsBetter`
 * settles. Coming off zero has no percentage, so it is left out.
 */
function trend(now: number, before: number, higherIsBetter: boolean): Trend | null {
  if (before <= 0 || now === before) {
    return null;
  }
  const up = now > before;
  return {
    pct: Math.round((Math.abs(now - before) / before) * 100),
    up,
    good: up === higherIsBetter
  };
}
