export type WsUserRole = 'customer' | 'employee' | 'admin';

export type WsUserStatus = 'pending' | 'approved' | 'invited';

export type WsUser = {
  id: string;
  email: string;
  password: string;
  role: WsUserRole;
  status: WsUserStatus;
  locked?: boolean;
  companyName: string;
  contactName: string;
  address?: string;
  phone?: string;
  createdAt: string;
};

export type WsResetToken = {
  email: string;
  token: string;
  expiresAt: string;
};

export type WsActivationToken = {
  email: string;
  token: string;
  expiresAt: string;
  invitedBy?: string;
};

export const WS_ADMIN_EMAIL = 'info@reineke.pro';
export const WS_ADMIN_PASSWORD = 'Yuki';

export const WS_USERS_KEY = 'ws-demo-users';
export const WS_SESSION_KEY = 'ws-demo-session';
export const WS_RESET_KEY = 'ws-demo-reset-tokens';
export const WS_ACTIVATION_KEY = 'ws-demo-activation-tokens';

export function normalizeWsEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function wsRoleLabel(role: WsUserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'employee':
      return 'Mitarbeiter';
    case 'customer':
      return 'Fleischerei';
  }
}

export function wsStatusLabel(status: WsUserStatus): string {
  switch (status) {
    case 'approved':
      return 'Freigeschaltet';
    case 'invited':
      return 'Einladung ausstehend';
    default:
      return 'Wartet auf Freigabe';
  }
}
