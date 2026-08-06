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
  FlatCard, isHallRoom, Occupant, PAYMENT_MODES, ROOM_SUGGESTIONS, RoomSpec, RoomView
} from '../../core/models';

type Sheet = 'flat' | 'tenant' | 'receipt' | null;

/** A room, plus which of the two kinds of room it is. */
export interface RoomVM extends RoomView {
  isHall: boolean;
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
 * going spare, so it gets its own band above the bedrooms. It used to get its
 * own colour too, and every bedroom cycled through four more — five hues to
 * say something the band headings already said.
 */
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
  readonly query = signal('');
  readonly toast = signal<{ text: string; bad?: boolean } | null>(null);
  readonly sheet = signal<Sheet>(null);
  readonly sheetError = signal<string | null>(null);

  readonly activeFlat = signal<FlatCard | null>(null);
  readonly activeOccupant = signal<Occupant | null>(null);
  readonly editingFlat = signal(false);
  readonly editingTenant = signal(false);

  flatForm = blankFlat();
  tenantForm = blankTenant();
  receiptForm = blankReceipt();

  /**
   * Cards redrawn as view models: hall beds split off from bedroom beds.
   */
  readonly views = computed<FlatVM[]>(() =>
    this.cards().map((card) => {
      const halls: RoomVM[] = [];
      const bedrooms: RoomVM[] = [];

      for (const room of card.rooms) {
        if (isHallRoom(room.name)) {
          halls.push({ ...room, isHall: true });
        } else {
          bedrooms.push({ ...room, isHall: false });
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
            card.flatNo, card.floor ?? '', room.name, room.capacity,
            'Occupied', o.name, o.email, o.phone, o.monthlyRent,
            o.paidThisMonth ? 'Yes' : 'No', o.receiptNoThisMonth ?? ''
          ]);
        }
        for (let i = 0; i < room.vacant; i++) {
          rows.push([
            card.flatNo, card.floor ?? '', room.name, room.capacity,
            'Vacant', '', '', '', '', '', ''
          ]);
        }
      }
    }

    downloadCsv(
      csvName('Beds', new Date().toISOString().slice(0, 7)),
      ['Flat', 'Floor', 'Room', 'Room beds', 'Status', 'Tenant', 'Email',
       'Phone', 'Rent', 'Receipt sent', 'Receipt no'],
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
        rows.push([card.flatNo, room.name, room.capacity, room.filled, room.vacant]);
      }
      rows.push([card.flatNo, 'ALL ROOMS', card.totalSeats, card.filledSeats, card.vacantSeats]);
    }

    const t = this.totals();
    rows.push(['ALL FLATS', '', t.seats, t.filled, t.vacant]);

    downloadCsv(
      csvName('Vacancy', new Date().toISOString().slice(0, 10)),
      ['Flat', 'Room', 'Beds', 'Filled', 'Vacant'],
      rows
    );
  }

  fillPercent(card: FlatCard): number {
    return card.totalSeats === 0
      ? 0
      : Math.round((card.filledSeats / card.totalSeats) * 100);
  }

  /**
   * One segment per bed, the taken ones first. Six green blocks and two
   * indigo gaps is a number you read without reading — "75%" is not, and a
   * plain bar hides whether the gap is one bed or three.
   *
   * Past eighteen beds the segments are too thin to count and the card
   * falls back to the bar; an empty array is the signal to do that.
   */
  seatPips(card: FlatCard): boolean[] {
    if (card.totalSeats < 1 || card.totalSeats > 18) {
      return [];
    }
    return Array.from({ length: card.totalSeats }, (_, i) => i < card.filledSeats);
  }

  /** Two letters standing in for a face, so a bed has someone in it. */
  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
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
      phone: occupant.phone,
      monthlyRent: occupant.monthlyRent,
      securityDeposit: occupant.securityDeposit ?? null,
      joinDate: occupant.joinDate ?? new Date().toISOString().slice(0, 10),
      notes: ''
    };
    this.open('tenant');
  }

  async saveTenant(): Promise<void> {
    const f = this.tenantForm;
    if (!f.name.trim()) {
      this.sheetError.set('Enter the tenant name.');
      return;
    }
    if (!f.email.trim()) {
      this.sheetError.set('An email is required — receipts are sent there.');
      return;
    }
    if (!f.phone.trim()) {
      this.sheetError.set('Enter a phone number.');
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
        email: f.email.trim(),
        phone: f.phone.trim(),
        monthlyRent: Number(f.monthlyRent),
        securityDeposit: f.securityDeposit === null ? undefined : Number(f.securityDeposit),
        joinDate: f.joinDate,
        notes: f.notes.trim() || undefined
      };

      const occupant = this.activeOccupant();
      if (this.editingTenant() && occupant) {
        await this.api.updateTenant(occupant.id, body);
        this.say(`${body.name} updated.`);
      } else {
        await this.api.addTenant(body);
        this.say(`${body.name} moved into ${body.roomName}. Welcome email sent.`);
      }
    });
  }

  /** Nudge one tenant straight from their bed slot. */
  async remind(occupant: Occupant): Promise<void> {
    const month = new Date().toISOString().slice(0, 7);
    this.busy.set(true);
    try {
      const result = await this.api.sendReminders(month, [occupant.id]);
      if (result.sent > 0) {
        this.say(`Reminder sent to ${occupant.name} at ${occupant.email}.`);
      } else {
        const why = result.skipped[0]?.reason ?? 'nothing to remind about';
        this.say(`${occupant.name} was not reminded — ${why}.`, true);
      }
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    } finally {
      this.busy.set(false);
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

  async vacate(occupant: Occupant): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    if (!confirm(
      `Mark ${occupant.name} as vacated on ${today}? The bed frees up and their `
      + `receipts stay on record.`
    )) {
      return;
    }
    try {
      await this.api.vacateTenant(occupant.id, today);
      this.say(`${occupant.name} moved out. That bed is now vacant.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    }
  }

  // -------------------------------------------------------------
  //  Receipt sheet
  // -------------------------------------------------------------
  openReceipt(card: FlatCard, occupant: Occupant): void {
    this.activeFlat.set(card);
    this.activeOccupant.set(occupant);
    this.receiptForm = blankReceipt();
    this.receiptForm.amount = occupant.monthlyRent;
    this.open('receipt');
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
        paymentMode: f.paymentMode,
        transactionId: f.transactionId.trim() || undefined,
        paidOn: f.paidOn,
        notes: f.notes.trim() || undefined
      });
      this.say(`${saved.receiptNo} sent to ${this.activeOccupant()!.email}.`);
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
  flatNo: string; floor: string; notes: string; rooms: RoomSpec[];
} {
  return {
    flatNo: '',
    floor: '',
    notes: '',
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
    joinDate: new Date().toISOString().slice(0, 10),
    notes: ''
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
    notes: ''
  };
}
