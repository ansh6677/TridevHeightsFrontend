import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { csvName, downloadCsv } from '../../core/csv';
import { errorText } from '../../core/error-text';
import { lockScroll } from '../../core/scroll-lock';
import { IconComponent } from '../../shared/icon.component';
import {
  FlatCard, FlatGender, isHallRoom, Occupant, PAYMENT_MODES, Receipt, ROOM_SUGGESTIONS,
  RoomSpec, RoomView
} from '../../core/models';

type Sheet = 'flat' | 'tenant' | 'receipt' | 'profile' | 'vacate' | null;

/** A room plus the colour code it is drawn in. */
export interface RoomVM extends RoomView {
  isHall: boolean;
  /** `tone-hall`, or `tone-1` … `tone-4` cycling through the bedroom palette. */
  tone: string;
}

/** One band of rooms on a card: the hall, or the bedrooms. */
export interface RoomGroup {
  key: 'hall' | 'bedrooms';
  label: string;
  hint: string;
  rooms: RoomVM[];
  seats: number;
  filled: number;
  vacant: number;
}

/** A flat card with its hall beds kept apart from its bedroom beds. */
export interface FlatVM extends FlatCard {
  groups: RoomGroup[];
  hallVacant: number;
  bedroomVacant: number;
}

/**
 * The hall is the one people ask about first and usually the one with a bed
 * going spare, so it gets its own colour and its own band above the bedrooms.
 * Bedrooms cycle through four tones, so two rooms side by side never read as
 * one long list.
 */
const BED_TONES = ['tone-1', 'tone-2', 'tone-3', 'tone-4'];

@Component({
  selector: 'th-flats',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './flats.component.html',
  styleUrl: './flats.component.scss'
})
export class FlatsComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly modes = PAYMENT_MODES;
  readonly roomSuggestions = ROOM_SUGGESTIONS;

  readonly cards = signal<FlatCard[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);

  /**
   * Which single row action is in flight, as "verb:id".
   *
   * A shared busy flag would spin every icon on the card at once, so the
   * person cannot tell which of the three they actually pressed.
   */
  readonly pending = signal<string | null>(null);
  readonly query = signal('');
  readonly toast = signal<{ text: string; bad?: boolean } | null>(null);
  readonly sheet = signal<Sheet>(null);
  readonly sheetError = signal<string | null>(null);

  readonly activeFlat = signal<FlatCard | null>(null);
  readonly activeOccupant = signal<Occupant | null>(null);
  readonly editingFlat = signal(false);
  readonly editingTenant = signal(false);

  flatForm = blankFlat();
  vacateForm = blankVacate();
  tenantForm = blankTenant();
  receiptForm = blankReceipt();

  /**
   * Cards redrawn as view models: hall beds split off from bedroom beds, and
   * every room handed the colour it is rendered in.
   */
  readonly views = computed<FlatVM[]>(() =>
    this.cards().map((card) => {
      const halls: RoomVM[] = [];
      const bedrooms: RoomVM[] = [];

      for (const room of card.rooms) {
        if (isHallRoom(room.name)) {
          halls.push({ ...room, isHall: true, tone: 'tone-hall' });
        } else {
          bedrooms.push({
            ...room,
            isHall: false,
            tone: BED_TONES[bedrooms.length % BED_TONES.length]
          });
        }
      }

      const groups: RoomGroup[] = [];
      if (halls.length) {
        groups.push(group('hall', 'Hall · shared', 'Common room — beds are shared space', halls));
      }
      if (bedrooms.length) {
        groups.push(group('bedrooms', 'Bedrooms', 'Private rooms', bedrooms));
      }

      return {
        ...card,
        groups,
        hallVacant: halls.reduce((n, r) => n + r.vacant, 0),
        bedroomVacant: bedrooms.reduce((n, r) => n + r.vacant, 0)
      };
    })
  );

  readonly totals = computed(() => {
    const views = this.views();
    return {
      flats: views.length,
      seats: views.reduce((n, c) => n + c.totalSeats, 0),
      filled: views.reduce((n, c) => n + c.filledSeats, 0),
      vacant: views.reduce((n, c) => n + c.vacantSeats, 0),
      hallVacant: views.reduce((n, c) => n + c.hallVacant, 0),
      bedroomVacant: views.reduce((n, c) => n + c.bedroomVacant, 0),
      due: views.reduce((n, c) => n + Number(c.monthlyRentTotal), 0),
      collected: views.reduce((n, c) => n + Number(c.collectedThisMonth), 0),
      unpaid: views.reduce(
        (n, c) =>
          n + c.rooms.reduce((m, r) => m + r.occupants.filter((o) => !o.paidThisMonth).length, 0),
        0
      )
    };
  });

  constructor() {
    this.load();

    // A sheet on a phone covers the page. Hold the page still underneath it,
    // or a swipe in the form scrolls the flats behind and you come back to a
    // list that has moved.
    effect(() => lockScroll(this, this.sheet() !== null));
    inject(DestroyRef).onDestroy(() => lockScroll(this, false));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.cards.set(await this.api.flatCards(this.query()));
    } catch (e) {
      this.say(errorText(e, 'Could not load flats.'), true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Empty slots to render after the people already in a room. */
  vacantSlots(room: RoomView): number[] {
    return Array.from({ length: Math.max(0, room.vacant) }, (_, i) => i);
  }

  /**
   * One row per bed, not per tenant, so an empty bed is a line you can act on
   * rather than something you have to notice is missing.
   */
  exportBedsCsv(): void {
    const cards = this.cards();
    if (cards.length === 0) {
      return;
    }

    const rows: unknown[][] = [];
    for (const card of cards) {
      for (const room of card.rooms) {
        for (const o of room.occupants) {
          rows.push([
            card.flatNo, card.floor ?? '', card.gender ?? '', room.name, room.capacity,
            'Occupied', o.name, o.email, o.phone, o.monthlyRent,
            o.securityDeposit ?? '', o.agreementChargeDue ?? '', o.joinDate ?? '',
            o.onNotice ? 'Yes' : 'No', o.noticeEndsOn ?? '',
            o.paidThisMonth ? 'Yes' : 'No', o.receiptNoThisMonth ?? ''
          ]);
        }
        for (let i = 0; i < room.vacant; i++) {
          rows.push([
            card.flatNo, card.floor ?? '', card.gender ?? '', room.name, room.capacity,
            'Vacant', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
    }

    downloadCsv(
      csvName('Beds', new Date().toISOString().slice(0, 7)),
      ['Flat', 'Floor', 'For', 'Room', 'Room beds', 'Status', 'Tenant', 'Email',
       'Phone', 'Rent', 'Security deposit', 'Agreement charge', 'Date of shifting',
       'On notice', 'Notice ends', 'Receipt sent', 'Receipt no'],
      rows
    );
  }

  /** A shorter one: just how full each flat is. */
  exportVacancyCsv(): void {
    const cards = this.cards();
    if (cards.length === 0) {
      return;
    }

    const rows: unknown[][] = [];
    for (const card of cards) {
      for (const room of card.rooms) {
        rows.push([card.flatNo, card.gender ?? '', room.name,
                   room.capacity, room.filled, room.vacant]);
      }
      rows.push([card.flatNo, card.gender ?? '', 'ALL ROOMS',
                 card.totalSeats, card.filledSeats, card.vacantSeats]);
    }

    const t = this.totals();
    rows.push(['ALL FLATS', '', '', t.seats, t.filled, t.vacant]);

    downloadCsv(
      csvName('Vacancy', new Date().toISOString().slice(0, 10)),
      ['Flat', 'For', 'Room', 'Beds', 'Filled', 'Vacant'],
      rows
    );
  }

  fillPercent(card: FlatCard): number {
    return card.totalSeats === 0
      ? 0
      : Math.round((card.filledSeats / card.totalSeats) * 100);
  }

  // -------------------------------------------------------------
  //  Flat sheet
  // -------------------------------------------------------------
  openAddFlat(): void {
    this.editingFlat.set(false);
    this.activeFlat.set(null);
    this.flatForm = blankFlat();
    this.open('flat');
  }

  openEditFlat(card: FlatCard): void {
    this.editingFlat.set(true);
    this.activeFlat.set(card);
    this.flatForm = {
      flatNo: card.flatNo,
      floor: card.floor ?? '',
      notes: card.notes ?? '',
      gender: card.gender ?? null,
      rooms: card.rooms.map((r) => ({ name: r.name, capacity: r.capacity }))
    };
    this.open('flat');
  }

  addRoomRow(): void {
    this.flatForm.rooms = [...this.flatForm.rooms, { name: '', capacity: 2 }];
  }

  removeRoomRow(index: number): void {
    this.flatForm.rooms = this.flatForm.rooms.filter((_, i) => i !== index);
  }

  /** Live total while they type, so the seat count is never a surprise. */
  formSeats(): number {
    return this.flatForm.rooms.reduce((n, r) => n + (Number(r.capacity) || 0), 0);
  }

  async saveFlat(): Promise<void> {
    if (!this.flatForm.flatNo.trim()) {
      this.sheetError.set('Enter the flat number.');
      return;
    }
    const rooms = this.flatForm.rooms.filter((r) => r.name.trim());
    if (rooms.length === 0) {
      this.sheetError.set('Add at least one room, otherwise nobody can be placed here.');
      return;
    }
    if (rooms.some((r) => !r.capacity || Number(r.capacity) < 1)) {
      this.sheetError.set('Every room needs at least one bed.');
      return;
    }

    await this.run(async () => {
      const body = {
        flatNo: this.flatForm.flatNo.trim(),
        floor: this.flatForm.floor.trim() || undefined,
        notes: this.flatForm.notes.trim() || undefined,
        gender: this.flatForm.gender ?? undefined,
        rooms: rooms.map((r) => ({ name: r.name.trim(), capacity: Number(r.capacity) }))
      };
      const existing = this.activeFlat();
      if (this.editingFlat() && existing) {
        await this.api.updateFlat(existing.id, body);
        this.say(`Flat ${body.flatNo} updated.`);
      } else {
        const seats = body.rooms.reduce((n, r) => n + r.capacity, 0);
        await this.api.addFlat(body);
        this.say(`Flat ${body.flatNo} added with ${seats} beds. Now fill them.`);
      }
    });
  }

  async removeFlat(card: FlatCard): Promise<void> {
    if (!confirm(`Remove flat ${card.flatNo}?`)) {
      return;
    }
    try {
      await this.api.deleteFlat(card.id);
      this.say(`Flat ${card.flatNo} removed.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    }
  }

  // -------------------------------------------------------------
  //  Tenant sheet
  // -------------------------------------------------------------
  /** Opened from a vacant slot, so the room is already decided. */
  openAddTenant(card: FlatCard, roomName: string): void {
    this.editingTenant.set(false);
    this.activeFlat.set(card);
    this.activeOccupant.set(null);
    this.tenantForm = blankTenant();
    this.tenantForm.roomName = roomName;
    this.open('tenant');
  }

  openEditTenant(card: FlatCard, occupant: Occupant): void {
    this.editingTenant.set(true);
    this.activeFlat.set(card);
    this.activeOccupant.set(occupant);
    this.tenantForm = {
      roomName: occupant.roomName,
      name: occupant.name,
      email: occupant.email,
      phone: occupant.phone ?? '',
      monthlyRent: occupant.monthlyRent,
      securityDeposit: occupant.securityDeposit ?? null,
      agreementCharge: occupant.agreementCharge ?? null,
      joinDate: occupant.joinDate ?? new Date().toISOString().slice(0, 10),
      notes: '',
      // Editing never sends mail on its own — that is a separate button.
      sendWelcome: false
    };
    this.open('tenant');
  }

  async saveTenant(): Promise<void> {
    const f = this.tenantForm;
    if (!f.name.trim()) {
      this.sheetError.set('Enter the tenant name.');
      return;
    }
    if (!f.monthlyRent || Number(f.monthlyRent) <= 0) {
      this.sheetError.set('Enter a rent greater than zero.');
      return;
    }

    await this.run(async () => {
      const body = {
        flatId: this.activeFlat()!.id,
        roomName: f.roomName,
        name: f.name.trim(),
        email: f.email.trim() || undefined,
        sendWelcomeEmail: f.sendWelcome && !!f.email.trim(),
        phone: f.phone.trim() || undefined,
        monthlyRent: Number(f.monthlyRent),
        securityDeposit: f.securityDeposit === null ? undefined : Number(f.securityDeposit),
        agreementCharge: f.agreementCharge === null ? undefined : Number(f.agreementCharge),
        joinDate: f.joinDate,
        notes: f.notes.trim() || undefined
      };

      const occupant = this.activeOccupant();
      if (this.editingTenant() && occupant) {
        await this.api.updateTenant(occupant.id, body);
        this.say(`${body.name} updated.`);
      } else {
        await this.api.addTenant(body);
        this.say(
          body.sendWelcomeEmail
            ? `${body.name} moved into ${body.roomName}. Welcome email sent to ${body.email}.`
            : `${body.name} moved into ${body.roomName}. No email sent.`
        );
      }
    });
  }

  /**
   * Everything on file about one tenant, read only.
   *
   * Their receipts are fetched here rather than carried on the card, because
   * a flat with a dozen beds would otherwise drag every receipt ever raised
   * into the list request.
   */
  async openProfile(card: FlatCard, occupant: Occupant): Promise<void> {
    this.activeFlat.set(card);
    this.activeOccupant.set(occupant);
    this.profileReceipts.set([]);
    this.open('profile');

    this.profileLoading.set(true);
    try {
      this.profileReceipts.set(await this.api.receiptsFor(occupant.id));
    } catch (e) {
      this.say(errorText(e, 'Could not load their receipts.'), true);
    } finally {
      this.profileLoading.set(false);
    }
  }

  /** Days left on a running notice, negative once it has run out. */
  noticeDaysLeft(o: Occupant | null): number | null {
    if (!o?.noticeEndsOn) {
      return null;
    }
    const end = new Date(o.noticeEndsOn + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / 86400000);
  }

  async startNotice(occupant: Occupant): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    if (!confirm(
      `Put ${occupant.name} on notice from ${today}? Notice runs one calendar month. `
      + `Nothing else changes — they keep the bed and the rent stays due.`
    )) {
      return;
    }

    this.pending.set('notice:' + occupant.id);
    try {
      await this.api.startNotice(occupant.id, { noticeGivenOn: today });
      this.say(`${occupant.name} is on notice. The bed can be shown to someone else.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  async cancelNotice(occupant: Occupant): Promise<void> {
    if (!confirm(`Withdraw ${occupant.name}'s notice? They stay on as before.`)) {
      return;
    }

    this.pending.set('notice:' + occupant.id);
    try {
      await this.api.cancelNotice(occupant.id);
      this.say(`${occupant.name}'s notice withdrawn.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  // -------------------------------------------------------------
  //  Moving out
  // -------------------------------------------------------------
  openVacate(card: FlatCard, occupant: Occupant): void {
    this.activeFlat.set(card);
    this.activeOccupant.set(occupant);

    this.vacateForm = blankVacate();
    this.vacateForm.deposit = occupant.securityDeposit ?? 0;
    this.vacateForm.refund = occupant.securityDeposit ?? 0;
    this.vacateForm.sendEmail = this.hasEmail(occupant);
    this.open('vacate');
  }

  /** Holding money back reduces the refund, so the two always agree. */
  onDeductionsChanged(): void {
    const held = Number(this.vacateForm.deductions || 0);
    const deposit = Number(this.vacateForm.deposit || 0);
    this.vacateForm.refund = Math.max(0, deposit - held);
  }

  async confirmVacate(): Promise<void> {
    const f = this.vacateForm;
    const held = Number(f.deductions || 0);
    const refund = Number(f.refund || 0);

    if (refund + held > Number(f.deposit || 0)) {
      this.sheetError.set(
        'The refund and the deductions come to more than the deposit that was held.'
      );
      return;
    }
    if (held > 0 && !f.deductionNotes.trim()) {
      this.sheetError.set('Say what was deducted and why — it goes on the settlement note.');
      return;
    }

    const name = this.activeOccupant()!.name;
    await this.run(async () => {
      await this.api.settleAndVacate(this.activeOccupant()!.id, {
        exitDate: f.exitDate,
        refundAmount: refund,
        deductions: held || undefined,
        deductionNotes: f.deductionNotes.trim() || undefined,
        sendEmail: f.sendEmail
      });
      this.say(
        f.sendEmail
          ? `${name} moved out. Settlement note sent, Rs ${refund.toLocaleString('en-IN')} to refund.`
          : `${name} moved out. Rs ${refund.toLocaleString('en-IN')} to refund.`
      );
    });
  }

  /** Nudge one tenant straight from their bed slot. */
  async remind(occupant: Occupant): Promise<void> {
    const month = new Date().toISOString().slice(0, 7);
    this.pending.set('remind:' + occupant.id);
    try {
      const result = await this.api.sendReminders(month, [occupant.id]);
      if (result.sent > 0) {
        // Without the guard a tenant with no address gives "sent to X at ."
        this.say(
          this.hasEmail(occupant)
            ? `Reminder sent to ${occupant.name} at ${occupant.email}.`
            : `Reminder sent to ${occupant.name}.`
        );
      } else {
        const why = result.skipped[0]?.reason ?? 'nothing to remind about';
        this.say(`${occupant.name} was not reminded — ${why}.`, true);
      }
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  /** "2h ago" reads better than a timestamp on a card you scan. */
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

  hasPhone(o: Occupant | null): boolean {
    return !!o && !!o.phone && o.phone.trim().length > 0;
  }

  hasEmail(o: Occupant | null): boolean {
    return !!o && !!o.email && o.email.trim().length > 0;
  }

  /**
   * Sends the welcome mail on demand — for someone added without an address
   * who has since had one filled in.
   */
  async sendWelcome(occupant: Occupant): Promise<void> {
    this.pending.set('welcome:' + occupant.id);
    try {
      const res = await this.api.sendWelcomeEmail(occupant.id);
      this.say(res.message);
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  async vacate(occupant: Occupant): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    if (!confirm(
      `Vacate ${occupant.name}? Their record is removed and the bed frees up. `
      + `Receipts already raised for them stay on file.`
    )) {
      return;
    }
    this.pending.set('vacate:' + occupant.id);
    try {
      await this.api.vacateTenant(occupant.id, today);
      this.say(`${occupant.name} moved out. That bed is now vacant.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.pending.set(null);
    }
  }

  // -------------------------------------------------------------
  //  Receipt sheet
  // -------------------------------------------------------------
  openReceipt(card: FlatCard, occupant: Occupant): void {
    this.activeFlat.set(card);
    this.activeOccupant.set(occupant);
    this.receiptForm = blankReceipt();

    // Their own cycle, not the calendar month. Someone who joined on the 28th
    // is billed 28th to 27th, so defaulting to the 1st would bill them for
    // three days they were not there.
    if (occupant.periodFrom && occupant.periodTo) {
      this.receiptForm.fromDate = occupant.periodFrom;
      this.receiptForm.toDate = occupant.periodTo;
    }

    // Rent plus whatever fee has run up, so the figure needs no mental
    // arithmetic. It stays editable — waiving it is a decision, not a bug.
    this.receiptForm.amount = occupant.payableNow ?? occupant.monthlyRent;

    // Offered until they have actually been collected, then never again.
    // Ticked by default the first time, because that is almost always what
    // is happening — but it stays a decision rather than a surprise.
    this.receiptForm.includeExtras = !occupant.depositCollected;
    if (this.receiptForm.includeExtras) {
      this.receiptForm.deposit = occupant.securityDepositDue ?? null;
      this.receiptForm.agreement = occupant.agreementChargeDue ?? null;
    }

    this.open('receipt');
  }

  // -------------------------------------------------------------
  //  Tenant profile — read only
  // -------------------------------------------------------------
  readonly profileReceipts = signal<Receipt[]>([]);
  readonly profileLoading = signal(false);

  /** What the tenant has paid in total, across every receipt. */
  profilePaidTotal(): number {
    return this.profileReceipts().reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  async downloadFromProfile(receipt: Receipt): Promise<void> {
    this.pending.set('pdf:' + receipt.id);
    try {
      await this.api.downloadReceiptPdf(receipt);
    } catch (e) {
      this.say(errorText(e, 'Could not download that PDF.'), true);
    } finally {
      this.pending.set(null);
    }
  }

  /** Rent, deposit and agreement charge added up, for the form to show. */
  receiptTotal(): number {
    return Number(this.receiptForm.amount || 0) + Number(this.extrasTotal());
  }

  extrasTotal(): number {
    if (!this.receiptForm.includeExtras) {
      return 0;
    }
    return Number(this.receiptForm.deposit || 0) + Number(this.receiptForm.agreement || 0);
  }

  /** True when this receipt is collecting more than rent. */
  hasExtras(): boolean {
    return this.receiptForm.includeExtras && this.extrasTotal() > 0;
  }

  /** Ticking it back on refills from the tenant's own figures. */
  toggleExtras(on: boolean): void {
    this.receiptForm.includeExtras = on;
    const o = this.activeOccupant();
    if (on && o) {
      this.receiptForm.deposit = this.receiptForm.deposit ?? o.securityDepositDue ?? null;
      this.receiptForm.agreement = this.receiptForm.agreement ?? o.agreementChargeDue ?? null;
    }
  }

  /** The fee sitting inside the prefilled amount, if any. */
  lateFeeOn(o: Occupant | null): number {
    return o?.lateFee ?? 0;
  }

  /** Puts the amount back to rent alone, for when the fee is being waived. */
  waiveLateFee(): void {
    const o = this.activeOccupant();
    if (o) {
      this.receiptForm.amount = o.monthlyRent;
    }
  }

  async send(): Promise<void> {
    const f = this.receiptForm;
    if (!f.amount || Number(f.amount) <= 0) {
      this.sheetError.set('Enter an amount greater than zero.');
      return;
    }
    if (f.toDate < f.fromDate) {
      this.sheetError.set('The period end cannot fall before the start.');
      return;
    }

    await this.run(async () => {
      const saved = await this.api.sendReceipt({
        tenantId: this.activeOccupant()!.id,
        fromDate: f.fromDate,
        toDate: f.toDate,
        amount: Number(f.amount),
        depositAmount: f.includeExtras && f.deposit ? Number(f.deposit) : undefined,
        agreementCharge: f.includeExtras && f.agreement ? Number(f.agreement) : undefined,
        paymentMode: f.paymentMode,
        transactionId: f.transactionId.trim() || undefined,
        paidOn: f.paidOn,
        notes: f.notes.trim() || undefined,
        sendEmail: f.sendEmail && this.hasEmail(this.activeOccupant())
      });

      this.say(
        f.sendEmail && this.hasEmail(this.activeOccupant())
          ? `${saved.receiptNo} sent to ${this.activeOccupant()!.email}.`
          : `${saved.receiptNo} recorded. Download the PDF from the Receipts page.`
      );
    });
  }

  // -------------------------------------------------------------
  //  Plumbing
  // -------------------------------------------------------------
  private open(sheet: Sheet): void {
    this.sheetError.set(null);
    this.sheet.set(sheet);
  }

  close(): void {
    this.sheet.set(null);
    this.sheetError.set(null);
  }

  /** Shared save wrapper: close on success, keep the sheet open on failure. */
  private async run(action: () => Promise<void>): Promise<void> {
    this.sheetError.set(null);
    this.busy.set(true);
    try {
      await action();
      this.close();
      await this.load();
    } catch (e) {
      this.sheetError.set(errorText(e));
    } finally {
      this.busy.set(false);
    }
  }

  private say(text: string, bad = false): void {
    this.toast.set({ text, bad });
    setTimeout(() => this.toast.set(null), 5000);
  }
}

function group(
  key: RoomGroup['key'],
  label: string,
  hint: string,
  rooms: RoomVM[]
): RoomGroup {
  return {
    key,
    label,
    hint,
    rooms,
    seats: rooms.reduce((n, r) => n + r.capacity, 0),
    filled: rooms.reduce((n, r) => n + r.filled, 0),
    vacant: rooms.reduce((n, r) => n + r.vacant, 0)
  };
}

function blankFlat(): {
  flatNo: string; floor: string; notes: string;
  gender: FlatGender | null; rooms: RoomSpec[];
} {
  return {
    flatNo: '',
    floor: '',
    notes: '',
    gender: null,
    // A sensible starting shape — most flats here are a hall plus bedrooms.
    rooms: [
      { name: 'Hall', capacity: 2 },
      { name: 'Bedroom 1', capacity: 2 }
    ]
  };
}

function blankTenant() {
  return {
    roomName: '',
    name: '',
    email: '',
    phone: '',
    monthlyRent: null as number | null,
    securityDeposit: null as number | null,
    agreementCharge: null as number | null,
    joinDate: new Date().toISOString().slice(0, 10),
    notes: '',
    sendWelcome: true
  };
}

function blankReceipt() {
  const d = new Date();
  const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const last = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(
    lastDay.getDate()
  ).padStart(2, '0')}`;

  return {
    fromDate: first,
    toDate: last,
    amount: null as number | null,
    paymentMode: 'UPI' as string,
    transactionId: '',
    paidOn: new Date().toISOString().slice(0, 10),
    notes: '',
    sendEmail: true,
    includeExtras: false,
    deposit: null as number | null,
    agreement: null as number | null
  };
}

function blankVacate() {
  return {
    exitDate: new Date().toISOString().slice(0, 10),
    deposit: 0 as number,
    deductions: null as number | null,
    deductionNotes: '',
    refund: 0 as number,
    sendEmail: true
  };
}
