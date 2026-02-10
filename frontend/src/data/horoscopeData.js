// Horoscope data for Indian astrology
// Rasi (Moon Sign) and Natchathiram (Star/Nakshatra) mapping
// Using Tamil star names with English equivalents

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
  { value: 'Karthigai', label: 'Karthigai', rasi: 'Mesham' },
  
  // Rishabam (Taurus) - 2nd Rasi
  { value: 'Rohini', label: 'Rohini', rasi: 'Rishabam' },
  { value: 'Mrigashirsham', label: 'Mrigashirsham', rasi: 'Rishabam' },
  { value: 'Thiruvaathirai', label: 'Thiruvaathirai (Ardra)', rasi: 'Rishabam' },
  
  // Mithunam (Gemini) - 3rd Rasi
  { value: 'Punarpusam', label: 'Punarpusam (Punarvasu)', rasi: 'Mithunam' },
  { value: 'Poosam', label: 'Poosam (Pushya)', rasi: 'Mithunam' },
  { value: 'Aayilyam', label: 'Aayilyam (Ashlesha)', rasi: 'Mithunam' },
  
  // Kadagam (Cancer) - 4th Rasi
  { value: 'Magam', label: 'Magam (Magha)', rasi: 'Kadagam' },
  { value: 'Pooram', label: 'Pooram (Purva Phalguni)', rasi: 'Kadagam' },
  { value: 'Uthiram', label: 'Uthiram (Uttara Phalguni)', rasi: 'Kadagam' },
  
  // Simmam (Leo) - 5th Rasi
  { value: 'Hastham', label: 'Hastham (Hasta)', rasi: 'Simmam' },
  { value: 'Chithirai', label: 'Chithirai (Chitra)', rasi: 'Simmam' },
  { value: 'Swathi', label: 'Swathi', rasi: 'Simmam' },
  
  // Kanni (Virgo) - 6th Rasi
  { value: 'Vishakam', label: 'Vishakam (Vishaka)', rasi: 'Kanni' },
  { value: 'Anusham', label: 'Anusham (Anuradha)', rasi: 'Kanni' },
  { value: 'Kettai', label: 'Kettai (Jyeshta)', rasi: 'Kanni' },
  
  // Thulam (Libra) - 7th Rasi
  { value: 'Moolam', label: 'Moolam (Mula)', rasi: 'Thulam' },
  { value: 'Pooraadam', label: 'Pooraadam (Purva Ashadha)', rasi: 'Thulam' },
  { value: 'Uthiraadam', label: 'Uthiraadam (Uttara Ashadha)', rasi: 'Thulam' },
  
  // Vrischikam (Scorpio) - 8th Rasi
  { value: 'Thiruvonam', label: 'Thiruvonam (Shravana)', rasi: 'Vrischikam' },
  { value: 'Avittam', label: 'Avittam (Dhanishta)', rasi: 'Vrischikam' },
  { value: 'Sathayam', label: 'Sathayam (Satabhisha)', rasi: 'Vrischikam' },
  
  // Dhanusu (Sagittarius) - 9th Rasi
  { value: 'Poorattathi', label: 'Poorattathi (Purva Bhadrapada)', rasi: 'Dhanusu' },
  { value: 'Uthirattathi', label: 'Uthirattathi (Uttara Bhadrapada)', rasi: 'Dhanusu' },
  { value: 'Revathi', label: 'Revathi', rasi: 'Dhanusu' },
  
  // Makaram (Capricorn) - 10th Rasi
  { value: 'Ashwini', label: 'Ashwini', rasi: 'Makaram' },
  { value: 'Bharani', label: 'Bharani', rasi: 'Makaram' },
  { value: 'Karthigai', label: 'Karthigai', rasi: 'Makaram' },
  
  // Kumbam (Aquarius) - 11th Rasi
  { value: 'Rohini', label: 'Rohini', rasi: 'Kumbam' },
  { value: 'Mrigashirsham', label: 'Mrigashirsham', rasi: 'Kumbam' },
  { value: 'Thiruvaathirai', label: 'Thiruvaathirai (Ardra)', rasi: 'Kumbam' },
  
  // Meenam (Pisces) - 12th Rasi
  { value: 'Punarpusam', label: 'Punarpusam (Punarvasu)', rasi: 'Meenam' },
  { value: 'Poosam', label: 'Poosam (Pushya)', rasi: 'Meenam' },
  { value: 'Aayilyam', label: 'Aayilyam (Ashlesha)', rasi: 'Meenam' }
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
