import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { csvName, downloadCsv } from '../../core/csv';
import { errorText } from '../../core/error-text';
import { IconComponent } from '../../shared/icon.component';
import { DashboardSummary, MonthPoint, PendingTenant } from '../../core/models';

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
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly api = inject(ApiService);

  readonly data = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly span = signal(6);

  /** Which month the figures are for. Empty string means the current one. */
  readonly month = signal(thisMonth());
  readonly isCurrent = computed(() => this.data()?.isCurrentMonth ?? true);

  // ---- Rent reminders ----
  readonly remindOpen = signal(false);
  readonly reminding = signal(false);
  readonly remindError = signal<string | null>(null);
  readonly remindDone = signal<string | null>(null);
  /** Empty means everyone who still owes. */
  readonly remindOnly = signal<PendingTenant | null>(null);
  remindNote = '';

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
      this.data.set(await this.api.dashboard(this.span(), this.month()));
    } catch (e) {
      this.error.set(errorText(e, 'Could not load the dashboard.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** The month-by-month table, exactly as shown for the chosen span. */
  exportMonthsCsv(): void {
    const d = this.data();
    if (!d || d.months.length === 0) {
      return;
    }

    const rows = d.months.map((m) => [m.label, m.month, m.collected, m.expense, m.net]);
    rows.push([
      'TOTAL',
      `${d.months.length} months`,
      d.months.reduce((n, m) => n + Number(m.collected), 0),
      d.months.reduce((n, m) => n + Number(m.expense), 0),
      d.months.reduce((n, m) => n + Number(m.net), 0)
    ]);

    downloadCsv(
      csvName('Monthly', `last-${this.span()}-months`),
      ['Month', 'Key', 'Collected', 'Expenses', 'Net'],
      rows
    );
  }

  /** Who still owes for the current month. */
  exportPendingCsv(): void {
    const d = this.data();
    if (!d || d.pendingTenants.length === 0) {
      return;
    }

    downloadCsv(
      csvName('Pending', d.month),
      ['Name', 'Flat', 'Room', 'Phone', 'Rent due'],
      d.pendingTenants.map((t) => [t.name, t.flatNo, t.roomName, t.phone, t.monthlyRent])
    );
  }

  monthTotal(key: 'collected' | 'expense' | 'net'): number {
    return (this.data()?.months ?? []).reduce((n, m) => n + Number(m[key]), 0);
  }

  openRemindAll(): void {
    this.remindOnly.set(null);
    this.openRemind();
  }

  openRemindOne(tenant: PendingTenant): void {
    this.remindOnly.set(tenant);
    this.openRemind();
  }

  private openRemind(): void {
    this.remindNote = '';
    this.remindError.set(null);
    this.remindDone.set(null);
    this.remindOpen.set(true);
  }

  closeRemind(): void {
    this.remindOpen.set(false);
  }

  async sendReminders(): Promise<void> {
    const d = this.data();
    if (!d) {
      return;
    }

    this.reminding.set(true);
    this.remindError.set(null);
    try {
      const only = this.remindOnly();
      const result = await this.api.sendReminders(
        d.month,
        only ? [only.id] : undefined,
        this.remindNote.trim() || undefined
      );

      const parts: string[] = [];
      if (result.sent > 0) {
        parts.push(`Reminder sent to ${result.sentTo.join(', ')}.`);
      }
      for (const s of result.skipped) {
        parts.push(`${s.name} skipped — ${s.reason}.`);
      }
      this.remindDone.set(parts.join(' ') || 'Nobody needed reminding.');

      // Refresh so the "reminded" stamps appear straight away.
      await this.load();
    } catch (e) {
      this.remindError.set(errorText(e, 'Could not send the reminders.'));
    } finally {
      this.reminding.set(false);
    }
  }

  /** "2 hours ago" reads better than a timestamp on a list you scan. */
  remindedAgo(iso?: string): string | null {
    if (!iso) {
      return null;
    }
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) {
      return 'just now';
    }
    if (mins < 60) {
      return `${mins}m ago`;
    }
    const hours = Math.round(mins / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    return `${Math.round(hours / 24)}d ago`;
  }

  setSpan(months: number): void {
    this.span.set(months);
    this.load();
  }

  /**
   * "this month" while you are on it, the month's name once you look back.
   * Leaving the labels fixed was the thing that made the old dashboard read
   * as though it were always showing today.
   */
  readonly periodLabel = computed(() =>
    this.isCurrent() ? 'this month' : (this.data()?.monthLabel ?? 'this month')
  );

  setMonth(month: string): void {
    // The picker can be cleared, which should mean "back to now".
    this.month.set(month || thisMonth());
    this.load();
  }

  jumpToThisMonth(): void {
    this.month.set(thisMonth());
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

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
