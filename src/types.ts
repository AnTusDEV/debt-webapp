/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: number;
  username: string;
  fullname?: string;
  role: 'admin' | 'user';
}

export interface Debtor {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  area?: string;
}

export interface Debt {
  id: number;
  debtor_id: number;
  debtor_name: string;
  debtor_area?: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid';
  debt_date: string;
  paid_at: string | null;
  created_at: string;
}
