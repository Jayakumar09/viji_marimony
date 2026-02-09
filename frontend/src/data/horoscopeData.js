// Horoscope data for Indian astrology
// Rasi (Moon Sign) and Natchathiram (Star/Nakshatra) mapping

export const RAASI_CHOICES = [
  { value: 'Mesham', label: 'Mesham (Aries)', order: 1 },
  { value: 'Rishabam', label: 'Rishabam (Taurus)', order: 2 },
  { value: 'Mithunam', label: 'Mithunam (Gemini)', order: 3 },
  { value: 'Kadagam', label: 'Kadagam (Cancer)', order: 4 },
  { value: 'Simmam', label: 'Simmam (Leo)', order: 5 },
  { value: 'Kanni', label: 'Kanni (Virgo)', order: 6 },
  { value: 'Thulam', label: 'Thulam (Libra)', order: 7 },
  { value: 'Vrischikam', label: 'Vrischikam (Scorpio)', order: 8 },
  { value: 'Dhanusu', label: 'Dhanusu (Sagittarius)', order: 9 },
  { value: 'Makaram', label: 'Makaram (Capricorn)', order: 10 },
  { value: 'Kumbam', label: 'Kumbam (Aquarius)', order: 11 },
  { value: 'Meenam', label: 'Meenam (Pisces)', order: 12 }
];

export const NATCHATHIRAM_CHOICES = [
  // Mesham (Aries) - 1st Rasi
  { value: 'Ashwini', label: 'Ashwini', rasi: 'Mesham' },
  { value: 'Bharani', label: 'Bharani', rasi: 'Mesham' },
  { value: 'Krittika', label: 'Krittika (Part)', rasi: 'Mesham' },
  
  // Rishabam (Taurus) - 2nd Rasi
  { value: 'Rohini', label: 'Rohini', rasi: 'Rishabam' },
  { value: 'Mrigashirsha', label: 'Mrigashirsha', rasi: 'Rishabam' },
  { value: 'Ardra', label: 'Ardra (Part)', rasi: 'Rishabam' },
  
  // Mithunam (Gemini) - 3rd Rasi
  { value: 'Punarvasu', label: 'Punarvasu (Part)', rasi: 'Mithunam' },
  { value: 'Pushya', label: 'Pushya', rasi: 'Mithunam' },
  { value: 'Ashlesha', label: 'Ashlesha', rasi: 'Mithunam' },
  
  // Kadagam (Cancer) - 4th Rasi
  { value: 'Magha', label: 'Magha', rasi: 'Kadagam' },
  { value: 'Purva Phalguni', label: 'Purva Phalguni', rasi: 'Kadagam' },
  { value: 'Uttara Phalguni', label: 'Uttara Phalguni (Part)', rasi: 'Kadagam' },
  
  // Simmam (Leo) - 5th Rasi
  { value: 'Hasta', label: 'Hasta (Part)', rasi: 'Simmam' },
  { value: 'Chitra', label: 'Chitra (Part)', rasi: 'Simmam' },
  { value: 'Swati', label: 'Swati', rasi: 'Simmam' },
  
  // Kanni (Virgo) - 6th Rasi
  { value: 'Vishaka', label: 'Vishaka (Part)', rasi: 'Kanni' },
  { value: 'Anuradha', label: 'Anuradha', rasi: 'Kanni' },
  { value: 'Jyeshta', label: 'Jyeshta', rasi: 'Kanni' },
  
  // Thulam (Libra) - 7th Rasi
  { value: 'Mula', label: 'Mula (Part)', rasi: 'Thulam' },
  { value: 'Purva Ashadha', label: 'Purva Ashadha', rasi: 'Thulam' },
  { value: 'Uttara Ashadha', label: 'Uttara Ashadha (Part)', rasi: 'Thulam' },
  
  // Vrischikam (Scorpio) - 8th Rasi
  { value: 'Shravana', label: 'Shravana (Part)', rasi: 'Vrischikam' },
  { value: 'Dhanishta', label: 'Dhanishta (Part)', rasi: 'Vrischikam' },
  { value: 'Satabhisha', label: 'Satabhisha (Part)', rasi: 'Vrischikam' },
  
  // Dhanusu (Sagittarius) - 9th Rasi
  { value: 'Purva Bhadrapada', label: 'Purva Bhadrapada (Part)', rasi: 'Dhanusu' },
  { value: 'Uttara Bhadrapada', label: 'Uttara Bhadrapada (Part)', rasi: 'Dhanusu' },
  { value: 'Revati', label: 'Revati', rasi: 'Dhanusu' },
  
  // Makaram (Capricorn) - 10th Rasi
  { value: 'Ashwini', label: 'Ashwini (Part)', rasi: 'Makaram' },
  { value: 'Bharani', label: 'Bharani (Part)', rasi: 'Makaram' },
  { value: 'Rohini', label: 'Rohini (Part)', rasi: 'Makaram' },
  
  // Kumbam (Aquarius) - 11th Rasi
  { value: 'Mrigashirsha', label: 'Mrigashirsha (Part)', rasi: 'Kumbam' },
  { value: 'Ardra', label: 'Ardra (Part)', rasi: 'Kumbam' },
  { value: 'Punarvasu', label: 'Punarvasu (Part)', rasi: 'Kumbam' },
  
  // Meenam (Pisces) - 12th Rasi
  { value: 'Pushya', label: 'Pushya (Part)', rasi: 'Meenam' },
  { value: 'Ashlesha', label: 'Ashlesha (Part)', rasi: 'Meenam' },
  { value: 'Magha', label: 'Magha (Part)', rasi: 'Meenam' }
];

export const LAGNAM_CHOICES = [
  { value: 'Mesham', label: 'Mesham (Aries)' },
  { value: 'Rishabam', label: 'Rishabam (Taurus)' },
  { value: 'Mithunam', label: 'Mithunam (Gemini)' },
  { value: 'Kadagam', label: 'Kadagam (Cancer)' },
  { value: 'Simmam', label: 'Simmam (Leo)' },
  { value: 'Kanni', label: 'Kanni (Virgo)' },
  { value: 'Thulam', label: 'Thulam (Libra)' },
  { value: 'Vrischikam', label: 'Vrischikam (Scorpio)' },
  { value: 'Dhanusu', label: 'Dhanusu (Sagittarius)' },
  { value: 'Makaram', label: 'Makaram (Capricorn)' },
  { value: 'Kumbam', label: 'Kumbam (Aquarius)' },
  { value: 'Meenam', label: 'Meenam (Pisces)' }
];

export const DHOSAM_CHOICES = [
  { value: 'None', label: 'No Dhosam' },
  { value: 'Kuja Dhosam', label: 'Kuja Dhosam' },
  { value: 'Rahu Dhosam', label: 'Rahu Dhosam' },
  { value: 'Kethu Dhosam', label: 'Kethu Dhosam' },
  { value: 'Sani Dhosam', label: 'Sani Dhosam' },
  { value: 'Chandras Dhosam', label: 'Chandras Dhosam' },
  { value: 'Guru Dhosam', label: 'Guru Dhosam' },
  { value: 'Other', label: 'Other' }
];

// Get Natchathiram based on selected Rasi
export const getNatchathiramForRasi = (rasi) => {
  if (!rasi) return [];
  return NATCHATHIRAM_CHOICES.filter(n => n.rasi === rasi);
};

// Subscription tiers
export const SUBSCRIPTION_TIERS = [
  { 
    id: 'FREE', 
    name: 'Free', 
    price: 0, 
    successFee: 0,
    features: ['Basic profile viewing', 'Limited interests per day']
  },
  { 
    id: 'STANDARD', 
    name: 'Standard', 
    price: 999, 
    successFee: 5000,
    features: ['Priority in search results', 'More interests per day', 'View contact details']
  },
  { 
    id: 'PREMIUM', 
    name: 'Premium', 
    price: 2499, 
    successFee: 10000,
    features: ['Top priority in search', 'Unlimited interests', 'View all photos', 'Dedicated support']
  },
  { 
    id: 'ELITE', 
    name: 'Elite', 
    price: 4999, 
    successFee: 25000,
    features: ['Featured profile', 'All Premium features', 'Matchmaker assistance', 'Profile highlight']
  }
];

// Success fee by Indian marriage law guidelines
export const SUCCESS_FEE_NOTE = "Success fee is applicable only when marriage is fixed through our platform. This follows the guidelines set by the Government of India for matrimonial services.";
