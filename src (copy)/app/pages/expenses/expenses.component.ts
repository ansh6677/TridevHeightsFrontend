import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { errorText } from '../../core/error-text';
import { Expense } from '../../core/models';

@Component({
  selector: 'th-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly month = signal(new Date().toISOString().slice(0, 7));
  readonly toast = signal<{ text: string; bad?: boolean } | null>(null);
  readonly formError = signal<string | null>(null);

  form = blank();

  readonly total = computed(() =>
    this.expenses().reduce((sum, e) => sum + Number(e.amount), 0)
  );

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.expenses.set(await this.api.expenses(this.month()));
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

    this.formError.set(null);
    this.busy.set(true);
    try {
      await this.api.addExpense({
        amount: Number(this.form.amount),
        remark: this.form.remark.trim(),
        expenseDate: this.form.expenseDate
      });
      this.say('Expense added.');

      // Logging for another month should show that month, not an empty list.
      const spentMonth = this.form.expenseDate.slice(0, 7);
      if (spentMonth !== this.month()) {
        this.month.set(spentMonth);
      }
      this.form = blank();
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
    try {
      await this.api.deleteExpense(expense.id);
      this.say('Expense deleted.');
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    }
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
    expenseDate: new Date().toISOString().slice(0, 10)
  };
}
