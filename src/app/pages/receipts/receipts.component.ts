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

  /** Which row action is in flight, as "verb:id", so only that icon spins. */
  readonly pending = signal<string | null>(null);
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
    this.pending.set('pdf:' + receipt.id);
    try {
      await this.api.downloadReceiptPdf(receipt);
    } catch (e) {
      this.say(errorText(e, 'Could not download that PDF.'), true);
    } finally {
      this.pending.set(null);
    }
  }

  async resend(receipt: Receipt): Promise<void> {
    this.pending.set('resend:' + receipt.id);
    try {
      await this.api.resendReceipt(receipt.id);
      this.say(`${receipt.receiptNo} queued for ${receipt.tenantName}.`);
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  async remove(receipt: Receipt): Promise<void> {
    // Ask before showing any spinner — a cancelled confirm should leave the
    // button exactly as it was.
    if (!confirm(
      `Delete ${receipt.receiptNo}? The money comes out of your totals, and the number `
      + `is not reused — the same as a paper book skipping a cancelled page.`
    )) {
      return;
    }

    this.pending.set('delete:' + receipt.id);
    try {
      await this.api.deleteReceipt(receipt.id);
      this.say(`${receipt.receiptNo} deleted.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  exportCsv(): void {
    const rows = this.receipts();
    if (rows.length === 0) {
      return;
    }

    downloadCsv(
      csvName('Receipts', this.month()),
      ['Receipt no', 'Tenant', 'Flat', 'Room', 'Month', 'From', 'To',
       'Rent', 'Deposit', 'Agreement charge', 'Total',
       'Mode', 'Transaction ID', 'Paid on', 'Notes'],
      rows.map((r) => [
        r.receiptNo, r.tenantName, r.flatNo, r.roomName ?? '', r.month,
        r.fromDate, r.toDate,
        // rent falls back to the total on receipts raised before the split
        r.rentAmount ?? r.amount, r.depositAmount ?? '', r.agreementCharge ?? '',
        r.amount, r.paymentMode,
        r.transactionId ?? '', r.paidOn, r.notes ?? ''
      ])
    );
  }

  private say(text: string, bad = false): void {
    this.toast.set({ text, bad });
    setTimeout(() => this.toast.set(null), 5000);
  }
}
