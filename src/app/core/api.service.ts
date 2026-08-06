import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DashboardSummary, DeskUser, Expense, Flat, FlatCard, Receipt, ReminderResult
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  // ---- Flats ----
  flatCards(q?: string): Promise<FlatCard[]> {
    let params = new HttpParams();
    if (q) {
      params = params.set('q', q);
    }
    return firstValueFrom(this.http.get<FlatCard[]>(`${this.base}/flats`, { params }));
  }

  addFlat(body: Record<string, unknown>): Promise<Flat> {
    return firstValueFrom(this.http.post<Flat>(`${this.base}/flats`, body));
  }

  updateFlat(id: string, body: Record<string, unknown>): Promise<Flat> {
    return firstValueFrom(this.http.put<Flat>(`${this.base}/flats/${id}`, body));
  }

  deleteFlat(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/flats/${id}`));
  }

  // ---- Tenants ----
  addTenant(body: Record<string, unknown>): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/tenants`, body));
  }

  updateTenant(id: string, body: Record<string, unknown>): Promise<unknown> {
    return firstValueFrom(this.http.put(`${this.base}/tenants/${id}`, body));
  }

  vacateTenant(id: string, exitDate: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/tenants/${id}/vacate`, { exitDate }));
  }

  reactivateTenant(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/tenants/${id}/reactivate`, {}));
  }

  deleteTenant(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/tenants/${id}`));
  }

  // ---- Receipts ----
  receipts(month?: string): Promise<Receipt[]> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    return firstValueFrom(this.http.get<Receipt[]>(`${this.base}/payments`, { params }));
  }

  /** Records the money and emails the tenant their PDF, in one action. */
  sendReceipt(body: Record<string, unknown>): Promise<Receipt> {
    return firstValueFrom(this.http.post<Receipt>(`${this.base}/payments`, body));
  }

  resendReceipt(id: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${this.base}/payments/${id}/resend`, {})
    );
  }

  deleteReceipt(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/payments/${id}`));
  }

  /** Fetches through HttpClient so the JWT interceptor still applies. */
  async downloadReceiptPdf(receipt: Receipt): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/payments/${receipt.id}/pdf`, { responseType: 'blob' })
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.tenantName.replace(/[^a-zA-Z0-9]+/g, '-')}_${receipt.fromDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Expenses ----
  expenses(month?: string, paidBy?: string): Promise<Expense[]> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    if (paidBy) {
      params = params.set('paidBy', paidBy);
    }
    return firstValueFrom(this.http.get<Expense[]>(`${this.base}/expenses`, { params }));
  }

  addExpense(body: Record<string, unknown>): Promise<Expense> {
    return firstValueFrom(this.http.post<Expense>(`${this.base}/expenses`, body));
  }

  deleteExpense(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/expenses/${id}`));
  }

  // ---- Rent reminders ----
  /** Omit tenantIds to remind everyone who still owes for that month. */
  sendReminders(month: string, tenantIds?: string[], note?: string): Promise<ReminderResult> {
    return firstValueFrom(
      this.http.post<ReminderResult>(`${this.base}/reminders`, { month, tenantIds, note })
    );
  }

  // ---- Logins ----
  users(): Promise<DeskUser[]> {
    return firstValueFrom(this.http.get<DeskUser[]>(`${this.base}/users`));
  }

  createUser(body: Record<string, unknown>): Promise<DeskUser> {
    return firstValueFrom(this.http.post<DeskUser>(`${this.base}/users`, body));
  }

  updateUser(id: string, body: Record<string, unknown>): Promise<DeskUser> {
    return firstValueFrom(this.http.put<DeskUser>(`${this.base}/users/${id}`, body));
  }

  setUserActive(id: string, active: boolean): Promise<DeskUser> {
    return firstValueFrom(
      this.http.post<DeskUser>(`${this.base}/users/${id}/active`, { active })
    );
  }

  deleteUser(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/users/${id}`));
  }

  // ---- Dashboard ----
  /** Omit `month` for the current one. */
  dashboard(months = 6, month?: string): Promise<DashboardSummary> {
    let params = new HttpParams().set('months', months);
    if (month) {
      params = params.set('month', month);
    }
    return firstValueFrom(
      this.http.get<DashboardSummary>(`${this.base}/dashboard/summary`, { params })
    );
  }
}
