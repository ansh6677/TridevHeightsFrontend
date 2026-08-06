import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { errorText } from '../../core/error-text';
import { lockScroll } from '../../core/scroll-lock';
import { IconComponent } from '../../shared/icon.component';
import { DeskUser, ROLE_ADMIN, ROLE_VIEWER } from '../../core/models';

@Component({
  selector: 'th-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly ADMIN = ROLE_ADMIN;
  readonly VIEWER = ROLE_VIEWER;

  readonly users = signal<DeskUser[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly sheetOpen = signal(false);
  readonly editing = signal<DeskUser | null>(null);
  readonly sheetError = signal<string | null>(null);
  readonly toast = signal<{ text: string; bad?: boolean } | null>(null);

  form = blank();

  constructor() {
    this.load();

    // The page behind the sheet stays where it was.
    effect(() => lockScroll(this, this.sheetOpen()));
    inject(DestroyRef).onDestroy(() => lockScroll(this, false));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.api.users());
    } catch (e) {
      this.say(errorText(e, 'Could not load logins.'), true);
    } finally {
      this.loading.set(false);
    }
  }

  openNew(): void {
    this.editing.set(null);
    this.form = blank();
    this.sheetError.set(null);
    this.sheetOpen.set(true);
  }

  openEdit(user: DeskUser): void {
    this.editing.set(user);
    this.form = { name: user.name, email: user.email, password: '', role: user.role };
    this.sheetError.set(null);
    this.sheetOpen.set(true);
  }

  close(): void {
    this.sheetOpen.set(false);
    this.sheetError.set(null);
  }

  async save(): Promise<void> {
    if (!this.form.name.trim()) {
      this.sheetError.set('Enter a name.');
      return;
    }
    if (!this.form.email.trim()) {
      this.sheetError.set('Enter an email.');
      return;
    }

    const editing = this.editing();
    if (!editing && this.form.password.length < 8) {
      this.sheetError.set('Set a password of at least 8 characters.');
      return;
    }
    if (editing && this.form.password && this.form.password.length < 8) {
      this.sheetError.set('A new password must be at least 8 characters.');
      return;
    }

    this.sheetError.set(null);
    this.busy.set(true);
    try {
      const body: Record<string, unknown> = {
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        role: Number(this.form.role)
      };
      // Leaving it blank on an edit keeps the existing password.
      if (this.form.password) {
        body['password'] = this.form.password;
      }

      if (editing) {
        await this.api.updateUser(editing.id, body);
        this.say(`${body['name']} updated.`);
      } else {
        await this.api.createUser(body);
        this.say(
          Number(this.form.role) === ROLE_ADMIN
            ? `${body['name']} added with full access.`
            : `${body['name']} added with view-only access.`
        );
      }
      this.close();
      await this.load();
    } catch (e) {
      this.sheetError.set(errorText(e, 'Could not save that login.'));
    } finally {
      this.busy.set(false);
    }
  }

  async toggleActive(user: DeskUser): Promise<void> {
    const turningOff = user.active;
    if (turningOff && !confirm(`Deactivate ${user.name}? They will not be able to sign in.`)) {
      return;
    }
    try {
      await this.api.setUserActive(user.id, !user.active);
      this.say(turningOff ? `${user.name} deactivated.` : `${user.name} can sign in again.`);
      await this.load();
    } catch (e) {
      this.say(errorText(e), true);
    }
  }

  async remove(user: DeskUser): Promise<void> {
    if (!confirm(`Delete the login for ${user.email}? This cannot be undone.`)) {
      return;
    }
    try {
      await this.api.deleteUser(user.id);
      this.say(`${user.name} deleted.`);
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
  return { name: '', email: '', password: '', role: ROLE_VIEWER as number };
}
