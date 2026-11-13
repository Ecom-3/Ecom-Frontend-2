import { isValidIndianMobile } from './phoneValidation.js';

export const validateAddressFields = ({ houseNumber, floor, landmark, phone, manualMode, manualLocation = {} }) => {
  const errors = {};
  const required = (key, value, message) => {
    if (!String(value ?? '').trim()) errors[key] = message;
  };
  if (manualMode) {
    required('street', manualLocation.street, 'Enter your street, road or area.');
    required('village', manualLocation.village, 'Enter your village or locality.');
    required('city', manualLocation.city, 'Enter your city.');
    required('state', manualLocation.state, 'Enter your state.');
    if (!/^[1-9]\d{5}$/.test(String(manualLocation.pincode ?? '').trim())) errors.pincode = 'Enter a valid 6-digit PIN code.';
  }
  required('houseNumber', houseNumber, 'Enter your house number, building name or area.');
  required('floor', floor, 'Enter your floor.');
  required('landmark', landmark, 'Enter a nearby landmark.');
  if (!String(phone ?? '').trim()) errors.phone = "Enter the receiver's phone number.";
  else if (!isValidIndianMobile(phone)) errors.phone = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
  return errors;
};
