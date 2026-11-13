import { serviceBaseUrl } from '../config/serviceRoutes.js';
import { customerAuthService } from './customerAuthService';
import { apiRequest } from './apiClient';
const PROFILE_BASE_URL = serviceBaseUrl('customerProfile', import.meta.env);
const request = (path, options = {}) => apiRequest(PROFILE_BASE_URL, path, options);

const genderToApi = { Female: 'FEMALE', Male: 'MALE', Other: 'OTHER', 'Prefer not to say': 'PREFER_NOT_TO_SAY' };
const genderFromApi = { FEMALE: 'Female', MALE: 'Male', OTHER: 'Other', PREFER_NOT_TO_SAY: 'Prefer not to say' };

const fromApi = (profile) => ({ ...profile, gender: genderFromApi[profile.gender] || profile.gender || '' });
const toApi = (profile) => ({
  name: profile.name,
  phone: profile.phone,
  email: profile.email || null,
  gender: genderToApi[profile.gender] || profile.gender || null,
  dateOfBirth: profile.dateOfBirth || null,
  photo: profile.photo || null,
});

export const customerProfileService = {
  async me(options = {}) {
    try {
      const profile = fromApi(await request('/api/v1/profiles/me', options));
      if (profile.name && profile.phone) return profile;
      const customer = fromApi(await customerAuthService.me());
      return {
        ...customer,
        ...profile,
        id: profile.id || customer.id || customer.customerId,
        username: profile.username || customer.username || customer.email,
        name: profile.name || customer.name,
        phone: profile.phone || customer.phone,
        email: profile.email || customer.email,
      };
    } catch (error) {
      if (error.status !== 404) throw error;
      return fromApi(await customerAuthService.me());
    }
  },
  async save(profile) { await customerAuthService.updateName(profile.name); return fromApi(await request('/api/v1/profiles/me', { method: 'PUT', body: JSON.stringify(toApi(profile)) })); },
  async remove() { await request('/api/v1/profiles/me', { method: 'DELETE' }); },
  async addresses() { return request('/api/v1/profiles/me/addresses'); },
  async createAddress(address) { return request('/api/v1/profiles/me/addresses', { method: 'POST', body: JSON.stringify(addressToApi(address)) }); },
  async updateAddress(id, address) { return request(`/api/v1/profiles/me/addresses/${id}`, { method: 'PUT', body: JSON.stringify(addressToApi(address)) }); },
  async deleteAddress(id) { await request(`/api/v1/profiles/me/addresses/${id}`, { method: 'DELETE' }); },
  async setDefaultAddress(id) { return request(`/api/v1/profiles/me/addresses/${id}/default`, { method: 'PATCH' }); },
};

const addressToApi = (address) => ({
  type: address.type,
  address: address.address,
  phone: String(address.phone || '').replace(/\D/g, ''),
  houseNumber: address.houseNumber,
  floor: address.floor,
  landmark: address.landmark || null,
  latitude: address.coordinates?.lat ?? null,
  longitude: address.coordinates?.lng ?? null,
  street: address.manualLocation?.street || null,
  city: address.manualLocation?.city || null,
  state: address.manualLocation?.state || null,
  pincode: address.manualLocation?.pincode || null,
  defaultAddress: Boolean(address.isDefault),
});
