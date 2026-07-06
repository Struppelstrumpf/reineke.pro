export type FwUserRole = 'admin' | 'employee';

export type FwUserStatus = 'approved' | 'locked';

export type FwUser = {
  id: string;
  email: string;
  password: string;
  contactName: string;
  role: FwUserRole;
  status: FwUserStatus;
  createdAt: string;
};

export const FW_ADMIN_EMAIL = 'info@reineke.pro';
export const FW_ADMIN_PASSWORD = 'Fusswerk';
export const FW_USERS_KEY = 'fw-demo-users';
export const FW_SESSION_KEY = 'fw-demo-session';

export function normalizeFwEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function fwRoleLabel(role: FwUserRole): string {
  return role === 'admin' ? 'Administrator' : 'Mitarbeiter';
}
