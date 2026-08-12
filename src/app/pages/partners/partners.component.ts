import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { csvName, downloadCsv } from '../../core/csv';
import { errorText } from '../../core/error-text';
import { PartnerDashboard } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

/** One column of the month-by-month chart. */
type PartnerMonth = PartnerDashboard['months'][number];

@Component({
  selector: 'th-partners',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './partners.component.html',
  styleUrl: './partners.component.scss'
})
export class PartnersComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly data = signal<PartnerDashboard | null>(null);
  readonly loading = signal(true);
  readonly month = signal(new Date().toISOString().slice(0, 7));
  readonly span = signal(6);
  readonly toast = signal<{ text: string; bad?: boolean } | null>(null);

  /** The tallest month in the run, so the bars have something to scale against. */
  readonly peak = computed(() =>
    Math.max(1, ...(this.data()?.months ?? []).map((m) => Number(m.amount)))
  );

  /** The month the pointer or finger is on, read out above the chart. */
  readonly hovered = signal<PartnerMonth | null>(null);

  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.load();

    // Without this the timer from a dismissed screen still fires, and Angular
    // is asked to update a signal on a component that is no longer there.
    inject(DestroyRef).onDestroy(() => clearTimeout(this.toastTimer));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    // The months about to be replaced are the ones the readout is pointing at.
    this.hovered.set(null);
    try {
      this.data.set(await this.api.partnerExpenses(this.month(), this.span()));
    } catch (e) {
      this.say(errorText(e, 'Could not load partner spending.'), true);
    } finally {
      this.loading.set(false);
    }
  }

  setSpan(months: number): void {
    this.span.set(months);
    this.load();
  }

  setMonth(month: string): void {
    this.month.set(month || new Date().toISOString().slice(0, 7));
    this.load();
  }

  barHeight(amount: number): number {
    return Math.round((Number(amount) / this.peak()) * 100);
  }

  exportCsv(): void {
    const d = this.data();
    if (!d || d.entries.length === 0) {
      return;
    }

    const rows: unknown[][] = d.entries.map((e) => [
      e.expenseDate, e.month, e.paidBy, e.remark, e.amount
    ]);
    rows.push(['TOTAL', d.monthLabel, '', `${d.entries.length} entries`, d.spentThisMonth]);

    downloadCsv(
      csvName('Partner-expenses', d.month),
      ['Date', 'Month', 'Paid by', 'Remark', 'Amount'],
      rows
    );
  }

  private say(text: string, bad = false): void {
    // The previous timer is cleared first: two messages in a row used to
    // share the first one's countdown, so the second flashed and vanished.
    clearTimeout(this.toastTimer);
    this.toast.set({ text, bad });
    this.toastTimer = setTimeout(() => this.toast.set(null), 5000);
  }
}
