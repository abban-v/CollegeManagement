import { Department, CampusLocation, IssueCategory, Asset, Issue, IssueComment, IssueStatusHistory, User, AppNotification } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'user-student-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@campus.edu',
    role: 'STUDENT',
    departmentId: 'dept-cse',
    classYear: '3rd Year CSE',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-official-1',
    name: 'Rajesh Kumar (Facilities)',
    email: 'rajesh.k@campus.edu',
    role: 'OFFICIAL',
    departmentId: 'dept-facilities',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-admin-1',
    name: 'Dr. Evelyn Vance (Admin / Mod)',
    email: 'evelyn.vance@campus.edu',
    role: 'ADMIN',
    departmentId: 'dept-facilities',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-student-2',
    name: 'Priya Sharma',
    email: 'priya.s@campus.edu',
    role: 'STUDENT',
    departmentId: 'dept-ece',
    classYear: '4th Year ECE',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  }
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'dept-ece', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'dept-mech', name: 'Mechanical Engineering', code: 'MECH' },
  { id: 'dept-civil', name: 'Civil Engineering', code: 'CIVIL' },
  { id: 'dept-admin', name: 'Main Administration & Library', code: 'ADMIN' },
  { id: 'dept-facilities', name: 'Campus Facilities & Maintenance', code: 'FACILITIES' },
];

export const MOCK_LOCATIONS: CampusLocation[] = [
  { id: 'loc-1', building: 'Turing Block', floor: '3rd Floor', room: 'Room 304 (Lecture Hall)', description: 'Smart classroom equipped with projector & 3 AC units' },
  { id: 'loc-2', building: 'Turing Block', floor: '2nd Floor', room: 'Advanced AI & OS Lab 202', description: '60 High-performance Linux workstations' },
  { id: 'loc-3', building: 'Faraday Block', floor: '1st Floor', room: 'VLSI & IoT Lab 105', description: 'Oscilloscopes, FPGA kits, soldering stations' },
  { id: 'loc-4', building: 'Central Library', floor: 'Ground Floor', room: 'Main Reading Area & Server Room', description: 'Central UPS, WiFi Access Points & HVAC' },
  { id: 'loc-5', building: 'Newton Block', floor: 'Ground Floor', room: 'Thermal & Fluid Dynamics Workshop', description: 'Heavy machinery and water cooling circulation pumps' },
  { id: 'loc-6', building: 'Student Activity Center', floor: '2nd Floor', room: 'Auditorium Audio-Visual Booth', description: 'Central stage lighting, PA system and 4K laser projector' },
];

export const MOCK_CATEGORIES: IssueCategory[] = [
  { id: 'cat-projector', name: 'Projector & AV Systems', description: 'Smart boards, HDMI link, optical lamps, speakers', iconName: 'Projector', active: true },
  { id: 'cat-hvac', name: 'HVAC & Air Conditioning', description: 'Cooling issues, thermostat, leaks, filter replacement', iconName: 'AirVent', active: true },
  { id: 'cat-lab', name: 'Lab Equipment & Instruments', description: 'Microscopes, oscilloscopes, test benches, 3D printers', iconName: 'Microscope', active: true },
  { id: 'cat-computing', name: 'Workstations & Network', description: 'Lab computers, LAN switch, WiFi AP, power cables', iconName: 'Monitor', active: true },
  { id: 'cat-electrical', name: 'Electrical & Power Supply', description: 'UPS backup, switchboards, short circuits, high voltage', iconName: 'Zap', active: true },
  { id: 'cat-plumbing', name: 'Water & Plumbing', description: 'Water coolers, washroom plumbing, drainage, pumps', iconName: 'Droplets', active: true },
  { id: 'cat-furniture', name: 'Infrastructure & Furniture', description: 'Benches, podiums, doors, window latches, structural', iconName: 'Hammer', active: true },
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'ast-1',
    name: 'Epson EB-2250U 5000lm Projector',
    assetTag: 'PRJ-TUR-304',
    category: 'cat-projector',
    departmentId: 'dept-cse',
    locationId: 'loc-1',
    status: 'OPERATIONAL',
    modelNumber: 'EB-2250U',
    serialNumber: 'X8K9021482',
    installedAt: '2023-08-15',
    lastServicedAt: '2025-11-20',
    reportedIssuesCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'ast-2',
    name: 'Daikin 2.0 Ton Inverter Cassette AC #1',
    assetTag: 'AC-TUR-202-A',
    category: 'cat-hvac',
    departmentId: 'dept-cse',
    locationId: 'loc-2',
    status: 'OPERATIONAL',
    modelNumber: 'FCQ71KAVEA',
    serialNumber: 'DAIK-8812903',
    installedAt: '2022-06-10',
    lastServicedAt: '2025-10-05',
    reportedIssuesCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'ast-3',
    name: 'Keysight 200MHz Digital Storage Oscilloscope',
    assetTag: 'LAB-FAR-105-OSC1',
    category: 'cat-lab',
    departmentId: 'dept-ece',
    locationId: 'loc-3',
    status: 'OPERATIONAL',
    modelNumber: 'DSOX1204G',
    serialNumber: 'MY5924018',
    installedAt: '2024-01-20',
    lastServicedAt: '2026-02-10',
    reportedIssuesCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'ast-4',
    name: 'Schneider Galaxy 40kVA Modular 3-Phase UPS',
    assetTag: 'UPS-LIB-SRV-01',
    category: 'cat-electrical',
    departmentId: 'dept-admin',
    locationId: 'loc-4',
    status: 'OPERATIONAL',
    modelNumber: 'G35T40KH',
    serialNumber: 'SCH-7749012',
    installedAt: '2021-03-12',
    lastServicedAt: '2026-05-15',
    reportedIssuesCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'ast-5',
    name: 'Kirloskar 7.5 HP Industrial Chilled Water Pump',
    assetTag: 'PUMP-NEWT-WS-02',
    category: 'cat-plumbing',
    departmentId: 'dept-mech',
    locationId: 'loc-5',
    status: 'OPERATIONAL',
    modelNumber: 'KOS-750',
    serialNumber: 'KIR-90314',
    installedAt: '2020-09-01',
    lastServicedAt: '2026-07-22',
    reportedIssuesCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80'
  }
];

export const MOCK_ISSUES: Issue[] = [];
export const MOCK_COMMENTS: Record<string, IssueComment[]> = {};
export const MOCK_STATUS_HISTORY: Record<string, IssueStatusHistory[]> = {};
export const MOCK_NOTIFICATIONS: AppNotification[] = [];
