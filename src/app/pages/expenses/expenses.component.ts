import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { csvName, downloadCsv } from '../../core/csv';
import { errorText } from '../../core/error-text';
import { IconComponent } from '../../shared/icon.component';
import { EXPENSE_PAYERS, Expense } from '../../core/models';

@Component({
  selector: 'th-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly payers = EXPENSE_PAYERS;
  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(true);

  /** Which row action is in flight, so only that icon spins. */
  readonly pending = signal<string | null>(null);
  readonly busy = signal(false);
  readonly month = signal(new Date().toISOString().slice(0, 7));
  readonly payerFilter = signal('');
  readonly toast = signal<{ text: string; bad?: boolean } | null>(null);
  readonly formError = signal<string | null>(null);

  form = blank();

  readonly total = computed(() =>
    this.expenses().reduce((sum, e) => sum + Number(e.amount), 0)
  );

  /** Totals per person for whatever is currently on screen. */
  readonly byPayer = computed(() => {
    const rows = this.expenses();
    return this.payers
      .map((name) => ({
        name,
        amount: rows
          .filter((e) => e.paidBy === name)
          .reduce((sum, e) => sum + Number(e.amount), 0)
      }))
      .filter((row) => row.amount > 0);
  });

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.expenses.set(await this.api.expenses(this.month(), this.payerFilter()));
    } catch (e) {
      this.say(errorText(e, 'Could not load expenses.'), true);
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    if (!this.form.amount || Number(this.form.amount) <= 0) {
      this.formError.set('Enter an amount greater than zero.');
      return;
    }
    if (!this.form.remark.trim()) {
      this.formError.set('Add a remark so you remember what this was.');
      return;
    }
    if (!this.form.paidBy) {
      this.formError.set('Pick whose name this expense goes under.');
      return;
    }

    this.formError.set(null);
    this.busy.set(true);
    try {
      await this.api.addExpense({
        amount: Number(this.form.amount),
        remark: this.form.remark.trim(),
        paidBy: this.form.paidBy,
        expenseDate: this.form.expenseDate
      });
      this.say(`Rs. ${Number(this.form.amount).toLocaleString('en-IN')} added under ${this.form.paidBy}.`);

      // Logging for another month should show that month, not an empty list.
      const spentMonth = this.form.expenseDate.slice(0, 7);
      if (spentMonth !== this.month()) {
        this.month.set(spentMonth);
      }
      // Keep the name selected — the next entry is usually the same person.
      const lastPayer = this.form.paidBy;
      this.form = blank();
      this.form.paidBy = lastPayer;

      await this.load();
    } catch (e) {
      this.formError.set(errorText(e, 'Could not add that expense.'));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(expense: Expense): Promise<void> {
    if (!confirm(`Delete "${expense.remark}"?`)) {
      return;
    }

    this.pending.set('delete:' + expense.id);
    try {
      await this.api.deleteExpense(expense.id);
      this.say('Expense deleted.');
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  /** Exports exactly what the filters are showing, not the whole collection. */
  exportCsv(): void {
    const rows = this.expenses();
    if (rows.length === 0) {
      return;
    }

    downloadCsv(
      csvName('Expenses', [this.month() || 'all-months', this.payerFilter()].filter(Boolean).join('_')),
      ['Date', 'Month', 'Remark', 'Paid by', 'Amount'],
      rows.map((e) => [e.expenseDate, e.month, e.remark, e.paidBy, e.amount])
    );
  }

  clearFilters(): void {
    this.payerFilter.set('');
    this.load();
  }

  private say(text: string, bad = false): void {
    this.toast.set({ text, bad });
    setTimeout(() => this.toast.set(null), 5000);
  }
}

function blank() {
  return {
    amount: null as number | null,
    remark: '',
    paidBy: '' as string,
    expenseDate: new Date().toISOString().slice(0, 10)
  };
}
