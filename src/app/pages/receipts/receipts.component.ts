import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { csvName, downloadCsv } from '../../core/csv';
import { errorText } from '../../core/error-text';
import { IconComponent } from '../../shared/icon.component';
import { isHallRoom, Receipt } from '../../core/models';

@Component({
  selector: 'th-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './receipts.component.html',
  styleUrl: './receipts.component.scss'
})
export class ReceiptsComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly receipts = signal<Receipt[]>([]);
  readonly loading = signal(true);
  readonly month = signal(new Date().toISOString().slice(0, 7));
  readonly toast = signal<{ text: string; bad?: boolean } | null>(null);

  readonly total = computed(() =>
    this.receipts().reduce((sum, r) => sum + Number(r.amount), 0)
  );

  /** Hall rows are tinted violet here too, so the colour means one thing. */
  readonly isHall = isHallRoom;

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.receipts.set(await this.api.receipts(this.month()));
    } catch (e) {
      this.say(errorText(e, 'Could not load receipts.'), true);
    } finally {
      this.loading.set(false);
    }
  }

  async download(receipt: Receipt): Promise<void> {
    try {
      await this.api.downloadReceiptPdf(receipt);
    } catch (e) {
      this.say(errorText(e, 'Could not download that PDF.'), true);
    }
  }

  async resend(receipt: Receipt): Promise<void> {
    try {
      await this.api.resendReceipt(receipt.id);
      this.say(`${receipt.receiptNo} queued for ${receipt.tenantName}.`);
    } catch (e) {
      this.say(errorText(e), true);
    }
  }

  async remove(receipt: Receipt): Promise<void> {
    if (!confirm(
      `Delete ${receipt.receiptNo}? The money comes out of your totals, and the number `
      + `is not reused — the same as a paper book skipping a cancelled page.`
    )) {
      return;
    }
    try {
      await this.api.deleteReceipt(receipt.id);
      this.say(`${receipt.receiptNo} deleted.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    }
  }

  exportCsv(): void {
    const rows = this.receipts();
    if (rows.length === 0) {
      return;
    }

    downloadCsv(
      csvName('Receipts', this.month()),
      ['Receipt no', 'Tenant', 'Flat', 'Room', 'From', 'To',
       'Amount', 'Mode', 'Transaction ID', 'Paid on'],
      rows.map((r) => [
        r.receiptNo, r.tenantName, r.flatNo, r.roomName ?? '',
        r.fromDate, r.toDate, r.amount, r.paymentMode,
        r.transactionId ?? '', r.paidOn
      ])
    );
  }

  private say(text: string, bad = false): void {
    this.toast.set({ text, bad });
    setTimeout(() => this.toast.set(null), 5000);
  }
}
