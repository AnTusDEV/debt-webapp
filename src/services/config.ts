/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const API_CONFIG = {
  BASE_URL: 'https://ais-dev-ymafo7jrnafxsx5yppdklu-557970887341.asia-southeast1.run.app',
  API_PREFIX: '/api'
};

export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}${cleanEndpoint}`;
};
