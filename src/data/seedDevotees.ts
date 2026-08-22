import { Devotee } from '../types';

export const INITIAL_DEVOTEES: Devotee[] = [
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    phone_number: '9876543201',
    group_name: 'Ram Das Group',
    family_members: [
      { name: 'Ram Das', phone_number: '9876543201' },
      { name: 'Sita Devi', phone_number: '9876543299' },
      { name: 'Laxman Das', phone_number: '' } // blank phone number
    ],
    is_admin: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000002',
    phone_number: '9876543202',
    group_name: 'Govinda Priya Group',
    family_members: [
      { name: 'Govinda Das', phone_number: '9876543202' },
      { name: 'Priya Radhika Devi', phone_number: '9876543298' },
      { name: 'Gopal', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000003',
    phone_number: '9876543203',
    group_name: 'Madhava Charan Group',
    family_members: [
      { name: 'Madhava Das', phone_number: '9876543203' },
      { name: 'Yamuna Devi', phone_number: '9876543297' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000004',
    phone_number: '9876543204',
    group_name: 'Mukunda Sevak Group',
    family_members: [
      { name: 'Mukunda Das', phone_number: '9876543204' },
      { name: 'Tulasi Priya Devi', phone_number: '9876543296' },
      { name: 'Nimai', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000005',
    phone_number: '9876543205',
    group_name: 'Damodar Prasad Group',
    family_members: [
      { name: 'Damodar Das', phone_number: '9876543205' },
      { name: 'Lalita Devi', phone_number: '9876543295' },
      { name: 'Nitai', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000006',
    phone_number: '9876543206',
    group_name: 'Ananda Murari Group',
    family_members: [
      { name: 'Ananda Das', phone_number: '9876543206' },
      { name: 'Vishakha Devi', phone_number: '9876543294' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000007',
    phone_number: '9876543207',
    group_name: 'Chaitanya Prem Group',
    family_members: [
      { name: 'Chaitanya Das', phone_number: '9876543207' },
      { name: 'Padmavati Devi', phone_number: '9876543293' },
      { name: 'Gauranga', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000008',
    phone_number: '9876543208',
    group_name: 'Gauranga Sundar Group',
    family_members: [
      { name: 'Gauranga Das', phone_number: '9876543208' },
      { name: 'Malati Devi', phone_number: '9876543292' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000009',
    phone_number: '9876543209',
    group_name: 'Hari Bhakt Group',
    family_members: [
      { name: 'Hari Das', phone_number: '9876543209' },
      { name: 'Kunti Devi', phone_number: '9876543291' },
      { name: 'Arjuna', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000010',
    phone_number: '9876543210',
    group_name: 'Jagannath Seva Group',
    family_members: [
      { name: 'Jagannath Das', phone_number: '9876543210' },
      { name: 'Subhadra Devi', phone_number: '9876543290' },
      { name: 'Baladev', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000011',
    phone_number: '9876543211',
    group_name: 'Keshav Kripa Group',
    family_members: [
      { name: 'Keshav Das', phone_number: '9876543211' },
      { name: 'Gandhari Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000012',
    phone_number: '9876543212',
    group_name: 'Murari Gupta Group',
    family_members: [
      { name: 'Murari Das', phone_number: '9876543212' },
      { name: 'Saraswati Devi', phone_number: '' },
      { name: 'Madhu', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000013',
    phone_number: '9876543213',
    group_name: 'Narayan Smaran Group',
    family_members: [
      { name: 'Narayan Das', phone_number: '9876543213' },
      { name: 'Lakshmi Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000014',
    phone_number: '9876543214',
    group_name: 'Radha Raman Group',
    family_members: [
      { name: 'Radha Raman Das', phone_number: '9876543214' },
      { name: 'Chandravati Devi', phone_number: '' },
      { name: 'Keshava', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000015',
    phone_number: '9876543215',
    group_name: 'Syamasundar Group',
    family_members: [
      { name: 'Syama Das', phone_number: '9876543215' },
      { name: 'Ananga Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000016',
    phone_number: '9876543216',
    group_name: 'Vrindavan Das Group',
    family_members: [
      { name: 'Vrindavan Das', phone_number: '9876543216' },
      { name: 'Jahnava Devi', phone_number: '' },
      { name: 'Balaram', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000017',
    phone_number: '9876543217',
    group_name: 'Bhakti Vinod Group',
    family_members: [
      { name: 'Bhakti Das', phone_number: '9876543217' },
      { name: 'Bimala Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000018',
    phone_number: '9876543218',
    group_name: 'Gopinath Charan Group',
    family_members: [
      { name: 'Gopinath Das', phone_number: '9876543218' },
      { name: 'Hemalata Devi', phone_number: '' },
      { name: 'Sudama', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000019',
    phone_number: '9876543219',
    group_name: 'Rasik Murari Group',
    family_members: [
      { name: 'Rasik Das', phone_number: '9876543219' },
      { name: 'Indulekha Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000020',
    phone_number: '9876543220',
    group_name: 'Vrajendranandan Group',
    family_members: [
      { name: 'Vraja Das', phone_number: '9876543220' },
      { name: 'Champakalata Devi', phone_number: '' },
      { name: 'Govardhan', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000021',
    phone_number: '9876543221',
    group_name: 'Baladev Bhakti Group',
    family_members: [
      { name: 'Baladev Das', phone_number: '9876543221' },
      { name: 'Revati Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000022',
    phone_number: '9876543222',
    group_name: 'Advaita Acharya Group',
    family_members: [
      { name: 'Advaita Das', phone_number: '9876543222' },
      { name: 'Sita Devi (Advaita)', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000023',
    phone_number: '9876543223',
    group_name: 'Srivas Pandit Group',
    family_members: [
      { name: 'Srivas Das', phone_number: '9876543223' },
      { name: 'Malini Devi', phone_number: '' },
      { name: 'Narayani', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000024',
    phone_number: '9876543224',
    group_name: 'Gadadhar Seva Group',
    family_members: [
      { name: 'Gadadhar Das', phone_number: '9876543224' },
      { name: 'Tungavidya Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000025',
    phone_number: '9876543225',
    group_name: 'Sanatan Goswami Group',
    family_members: [
      { name: 'Sanatan Das', phone_number: '9876543225' },
      { name: 'Chitra Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000026',
    phone_number: '9876543226',
    group_name: 'Rupa Goswami Group',
    family_members: [
      { name: 'Rupa Das', phone_number: '9876543226' },
      { name: 'Sudevi Devi', phone_number: '' },
      { name: 'Jiva', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000027',
    phone_number: '9876543227',
    group_name: 'Raghunath Bhatta Group',
    family_members: [
      { name: 'Raghunath Das', phone_number: '9876543227' },
      { name: 'Rangadevi Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000028',
    phone_number: '9876543228',
    group_name: 'Gopal Bhatta Group',
    family_members: [
      { name: 'Gopal Bhatta Das', phone_number: '9876543228' },
      { name: 'Gauri Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000029',
    phone_number: '9876543229',
    group_name: 'Loknath Seva Group',
    family_members: [
      { name: 'Loknath Das', phone_number: '9876543229' },
      { name: 'Kalavati Devi', phone_number: '' }
    ],
    is_admin: false
  },
  {
    id: 'd1000000-0000-0000-0000-000000000030',
    phone_number: '9876543230',
    group_name: 'Narottam Das Group',
    family_members: [
      { name: 'Narottam Das', phone_number: '9876543230' },
      { name: 'Anuradha Devi', phone_number: '' },
      { name: 'Madhur', phone_number: '' }
    ],
    is_admin: false
  }
];
