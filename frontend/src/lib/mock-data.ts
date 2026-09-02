import { Department, CampusLocation, IssueCategory, Asset, Issue, IssueComment, IssueStatusHistory, AppNotification, User } from './types';

export const DEPARTMENTS: Department[] = [
  { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'dept-ece', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'dept-eee', name: 'Electrical & Electronics', code: 'EEE' },
  { id: 'dept-mech', name: 'Mechanical Engineering', code: 'MECH' },
  { id: 'dept-civil', name: 'Civil Engineering', code: 'CIVIL' },
  { id: 'dept-facilities', name: 'Campus Facilities & Maintenance', code: 'FACILITIES' },
];

export const CATEGORIES: IssueCategory[] = [
  { id: 'cat-electrical', name: 'Electrical & Power', description: 'Power supply, wiring, switches, lighting', iconName: 'Zap', active: true },
  { id: 'cat-hvac', name: 'HVAC & Ventilation', description: 'Air conditioning, fans, climate control', iconName: 'AirVent', active: true },
  { id: 'cat-plumbing', name: 'Plumbing & Water', description: 'Restrooms, water supply, drainage, leaks', iconName: 'Droplets', active: true },
  { id: 'cat-lab', name: 'Lab Hardware & Computers', description: 'Workstations, lab equipment, oscilloscopes', iconName: 'Cpu', active: true },
  { id: 'cat-projector', name: 'Projectors & AV Systems', description: 'Classroom projectors, audio systems, HDMI', iconName: 'Tv', active: true },
  { id: 'cat-furniture', name: 'Furniture & Desks', description: 'Classroom benches, chairs, podiums, doors', iconName: 'Armchair', active: true },
  { id: 'cat-general', name: 'General Infrastructure', description: 'Classroom fixtures, civil structures, pathways', iconName: 'Building', active: true },
  { id: 'cat-network', name: 'Network & IT', description: 'WiFi, internet, routers, campus portal, ethernet', iconName: 'Wifi', active: true },
  { id: 'cat-safety', name: 'Campus Safety', description: 'Fire hazards, alarms, broken glass, emergency equipment', iconName: 'ShieldAlert', active: true },
];

export const LOCATIONS: CampusLocation[] = [
  { id: 'loc-cs-201', building: 'Computer Science Block', room: 'CS 201', floor: '2' },
  { id: 'loc-cs-lab1', building: 'Computer Science Block', room: 'Software Lab 1', floor: '1' },
  { id: 'loc-mech-lab', building: 'Mechanical Block', room: 'Machine Lab 2', floor: '1' },
  { id: 'loc-main-aud', building: 'Main Administrative Block', room: 'College Auditorium', floor: '1' },
  { id: 'loc-library', building: 'Central Library', room: 'Reading Hall 2nd Floor', floor: '2' },
];

export const MOCK_DEPARTMENTS = DEPARTMENTS;
export const MOCK_CATEGORIES = CATEGORIES;
export const MOCK_LOCATIONS = LOCATIONS;
export const MOCK_USERS: User[] = [];
export const MOCK_ASSETS: Asset[] = [];
export const MOCK_ISSUES: Issue[] = [];
export const MOCK_COMMENTS: Record<string, IssueComment[]> = {};
export const MOCK_STATUS_HISTORY: Record<string, IssueStatusHistory[]> = {};
export const MOCK_NOTIFICATIONS: AppNotification[] = [];
