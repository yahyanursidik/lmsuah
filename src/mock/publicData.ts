export interface Program {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  instructor: string;
  category: 'Fiqih' | 'Aqidah' | 'Hadits' | 'Akhlaq' | 'Tafsir';
  status: 'Berlangsung' | 'Selesai' | 'Akan Datang';
  totalLessons: number;
  completedLessons?: number;
  routineSchedule: string;
  venueId: string;
  venueName: string;
  coverImage: string;
  bookTitle: string;
  author: string;
  lessons: {
    id: string;
    meetingNumber: number;
    title: string;
    duration: string;
    date: string;
    summary: string;
    youtubeUrl: string;
    pdfUrl?: string;
  }[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  programId?: string;
  speaker: string;
  category: string;
  type: 'Rutin' | 'Tematik' | 'Special';
  day: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  status?: 'Rutin' | 'Dibatalkan' | 'Diundur' | 'Pindah Lokasi';
  statusReason?: string;
  venueId: string;
  venueName?: string;
  isLiveStream: boolean;
  streamUrl?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  coordinates: { lat: number; lng: number };
  googleMapsUrl: string;
  description: string;
  facilities: string[];
  capacity: string;
  phone: string;
  image: string;
  activeKajiansCount: number;
}

export interface Speaker {
  id: string;
  name: string;
  title: string;
  bio: string;
  education: string[];
  focusAreas: string[];
  image: string;
  activeProgramsCount: number;
  totalKajiansCount: number;
  socials: {
    youtube?: string;
    instagram?: string;
    telegram?: string;
    website?: string;
  };
}

export const MOCK_SPEAKER: Speaker = {
  id: 'ustadz-abu-haidar',
  name: 'Ustadz Abu Haidar As-Sundawy',
  title: 'Hafizhahullah',
  bio: 'Ustadz Abu Haidar As-Sundawy (hafizhahullah) adalah seorang dai dan ustadz senior yang secara konsisten mengampu berbagai kajian kitab-kitab induk dalam bidang Fiqih, Aqidah, Hadits, dan Akhlaqul Karimah berlandaskan Al-Qur\'an dan As-Sunnah sesuai pemahaman Salafus Shalih. Beliau juga merupakan Pembina Yayasan Tarbiyah Sunnah.',
  education: [
    'Al-Madinah International University (MEDIU)',
    'Lembaga Pengajaran Bahasa Arab (LPBA) Jakarta',
    'Sanad Keilmuan & Mulazamah Ulama Ahlussunnah'
  ],
  focusAreas: ['Fiqih & Muamalah', 'Aqidah Ahlussunnah', 'Musthalah Hadits', 'Tazkiyatun Nufs'],
  image: '/logo-abu-haidar.jpg',
  activeProgramsCount: 4,
  totalKajiansCount: 1250,
  socials: {
    youtube: 'https://www.youtube.com/@TarbiyahSunnahChannel/',
    instagram: 'https://instagram.com/tarbiyahsunnah.id',
    telegram: 'https://t.me/tarbiyahsunnah',
    website: 'https://tarbiyahsunnah.or.id'
  }
};

export const MOCK_VENUES: Venue[] = [
  {
    id: 'masjid-umar-bin-khattab',
    name: 'Masjid Umar bin Khattab',
    address: 'Jl. Selat Karimata No. 12, Komplek Radio Rodja Bandung',
    district: 'Ujungberung',
    city: 'Kota Bandung',
    province: 'Jawa Barat',
    postalCode: '40611',
    coordinates: { lat: -6.9147, lng: 107.6890 },
    googleMapsUrl: 'https://maps.google.com/?q=-6.9147,107.6890',
    description: 'Masjid pusat kegiatan Yayasan Tarbiyah Sunnah Bandung dilengkapi studio siaran langsung Radio Rodja & Rodja TV Bandung.',
    facilities: ['Ruang Utama Ber-AC', 'Area Akhwat Terpisah', 'Parkir Luas', 'Studio Live Streaming', 'Perpustakaan Islam'],
    capacity: '1.500 Jamaah',
    phone: '0811-2233-4455',
    image: '/masjid-umar.jpg',
    activeKajiansCount: 3
  },
  {
    id: 'masjid-al-ukhuwah',
    name: 'Masjid Al-Ukhuwah Bandung',
    address: 'Jl. Wastukencana No. 27, Babakan Ciamis',
    district: 'Sumur Bandung',
    city: 'Kota Bandung',
    province: 'Jawa Barat',
    postalCode: '40117',
    coordinates: { lat: -6.9100, lng: 107.6094 },
    googleMapsUrl: 'https://maps.google.com/?q=-6.9100,107.6094',
    description: 'Masjid ikonik di pusat Kota Bandung yang rutin menyelenggarakan kajian umum akhir pekan.',
    facilities: ['Lokasi Strategis Pusat Kota', 'Lantai 2 Akhwat', 'Toilet & Tempat Wudhu Higenis', 'Kantin Halal'],
    capacity: '2.500 Jamaah',
    phone: '0812-3456-7890',
    image: '/masjid-ukhuwah.jpg',
    activeKajiansCount: 1
  }
];

export const MOCK_PROGRAMS: Program[] = [
  {
    id: 'bulughul-maram',
    title: 'Syarah Bulughul Maram',
    subtitle: 'Kajian Fiqih Ibadah & Muamalah Berdasarkan Hadits-Hadits Hukum',
    description: 'Pembahasan tuntas Kitab Bulughul Maram karangan Al-Hafiz Ibn Hajar Al-Asqalani. Mengupas hukum-hukum fiqih mulai dari Thaharah, Shalat, Zakat, Puasa, hingga Muamalah.',
    instructor: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Fiqih',
    status: 'Berlangsung',
    totalLessons: 48,
    routineSchedule: 'Sabtu Pekan Ke-1 & Ke-3 • 09:00 - 11:30 WIB',
    venueId: 'masjid-umar-bin-khattab',
    venueName: 'Masjid Umar bin Khattab',
    coverImage: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=800&q=80',
    bookTitle: 'Bulughul Maram min Adillatil Ahkam',
    author: 'Al-Hafiz Ibn Hajar Al-Asqalani',
    lessons: [
      {
        id: 'bm-1',
        meetingNumber: 1,
        title: 'Bab Thaharah: Pembagian Air dan Kesuciannya',
        duration: '1 jam 45 menit',
        date: '10 Januari 2026',
        summary: 'Pembahasan mendalam syarat kesucian air mutlak, air musta\'mal, dan hukum air yang terkena najis.',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      {
        id: 'bm-2',
        meetingNumber: 2,
        title: 'Bab Bejana dan Hukum Kulit Bangkai yang Disamak',
        duration: '1 jam 30 menit',
        date: '24 Januari 2026',
        summary: 'Larangan penggunaan bejana emas & perak untuk makan minum serta pensucian kulit hewan.',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    ]
  },
  {
    id: 'kitab-tauhid',
    title: 'Syarah Kitab At-Tauhid',
    subtitle: 'Memurnikan Ibadah Hanya Kepada Allah Ta\'ala',
    description: 'Kajian pokok-pokok aqidah tauhid uluhiyah, rububiyah, dan asma wa sifat serta bahaya syirik besar maupun kecil.',
    instructor: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Aqidah',
    status: 'Berlangsung',
    totalLessons: 36,
    routineSchedule: 'Minggu Pekan Ke-2 & Ke-4 • 09:00 - 11:30 WIB',
    venueId: 'masjid-umar-bin-khattab',
    venueName: 'Masjid Umar bin Khattab',
    coverImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
    bookTitle: 'Kitab At-Tauhid Al-Ladzii Huwa Haqqullah \'Alal \'Ibaad',
    author: 'Syaikh Muhammad At-Tamimi',
    lessons: [
      {
        id: 'kt-1',
        meetingNumber: 1,
        title: 'Keutamaan Tauhid dan Dosa-Dosa yang Diampuni Karenanya',
        duration: '1 jam 50 menit',
        date: '18 Januari 2026',
        summary: 'Penjelasan hakikat kalimat Syahadah dan jaminan surga bagi pemurni tauhid.',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    ]
  },
  {
    id: 'adab-al-mufrad',
    title: 'Syarah Al-Adab Al-Mufrad',
    subtitle: 'Panduan Adab, Akhlaq, dan Silaturahmi dalam Islam',
    description: 'Kajian kumpulan hadits adab keseharian karya Imam Al-Bukhari yang membahas bakti kepada orang tua, tetangga, dan akhlaq islami.',
    instructor: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Akhlaq',
    status: 'Berlangsung',
    totalLessons: 52,
    routineSchedule: 'Sabtu Pekan Ke-2 • 15:30 - 17:30 WIB',
    venueId: 'masjid-al-ukhuwah',
    venueName: 'Masjid Al-Ukhuwah Bandung',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    bookTitle: 'Al-Adab Al-Mufrad',
    author: 'Imam Al-Bukhari',
    lessons: []
  }
];

export const MOCK_SCHEDULES: ScheduleItem[] = [
  {
    id: 'sch-1',
    title: 'Kajian Rutin Syarah Bulughul Maram',
    programId: 'bulughul-maram',
    speaker: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Fiqih',
    type: 'Rutin',
    day: 'Sabtu',
    date: '08 Februari 2026',
    time: '09:00 - 11:30 WIB',
    venueId: 'masjid-umar-bin-khattab',
    venueName: 'Masjid Umar bin Khattab Bandung',
    status: 'Diundur',
    statusReason: 'Ustadz berhalangan hadir pada jam 09:00, diundur ke jam 13:00 WIB',
    isLiveStream: true,
    streamUrl: 'https://youtube.com/@TarbiyahSunnah'
  },
  {
    id: 'sch-2',
    title: 'Kajian Rutin Syarah Kitab At-Tauhid',
    programId: 'kitab-tauhid',
    speaker: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Aqidah',
    type: 'Rutin',
    day: 'Minggu',
    date: '09 Februari 2026',
    time: '09:00 - 11:30 WIB',
    venueId: 'masjid-umar-bin-khattab',
    venueName: 'Masjid Umar bin Khattab Bandung',
    status: 'Rutin',
    isLiveStream: true,
    streamUrl: 'https://youtube.com/@TarbiyahSunnah'
  },
  {
    id: 'sch-3',
    title: 'Kajian Tematik Menyambut Bulan Ramadhan',
    speaker: 'Ustadz Abu Haidar As-Sundawy',
    category: 'Tematik',
    type: 'Tematik',
    day: 'Sabtu',
    date: '15 Februari 2026',
    time: '15:30 - 17:30 WIB',
    venueId: 'masjid-al-ukhuwah',
    venueName: 'Masjid Al-Ukhuwah Bandung',
    status: 'Rutin',
    isLiveStream: true,
    streamUrl: 'https://youtube.com/@TarbiyahSunnah'
  }
];

export const ABOUT_YTS = {
  title: 'Yayasan Tarbiyah Sunnah',
  subtitle: 'Dakwah, Pendidikan, dan Pembinaan Umat Berdasarkan Al-Qur\'an dan As-Sunnah',
  description: 'Yayasan Tarbiyah Sunnah (YTS) didirikan sebagai wadah dakwah Islamiyah yang berfokus pada penyebaran ilmu syar\'i yang murni, pembinaan aqidah yang shahihah, serta akhlaqul karimah di tengah masyarakat.',
  vision: 'Menjadi lembaga dakwah dan pendidikan Islam terdepan dalam mencetak generasi muslim yang berilmu, beramal, dan berakhlaq sesuai pemahaman Salafus Shalih.',
  missions: [
    'Menyelenggarakan kajian ilmiah rutin dan tematik yang terstruktur.',
    'Mengembangkan media pembelajaran digital (LMS) berbasis teknologi terkini.',
    'Menyediakan transkrip PDF resmi dan materi pembelajaran verified bagi para penuntut ilmu.',
    'Membangun jejaring ma\'had dan sarana ibadah yang nyaman bagi masyarakat.'
  ]
};
