/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const API_CONFIG = {
  BASE_URL: typeof window !== 'undefined' ? window.location.origin : '',
  API_PREFIX: '/api'
};

export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}${cleanEndpoint}`;
};
