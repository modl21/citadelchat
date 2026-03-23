export interface KnowledgePackMeta {
  id: string;
  title: string;
  description: string;
  category: 'medical' | 'survival' | 'comms' | 'engineering' | 'agriculture' | 'cbrn' | 'security';
  filePath: string;
  sizeBytes: number;
  sizeLabel: string;
  docCount: number;
  recommended?: boolean;
}

export interface KnowledgePreset {
  id: string;
  name: string;
  description: string;
  packIds: string[];
}

export const KNOWLEDGE_PACKS: KnowledgePackMeta[] = [
  {
    id: 'emergency-medical',
    title: 'Emergency Medical Field Guide',
    description: 'Triage, trauma response, infection control, and emergency care workflows.',
    category: 'medical',
    filePath: '/knowledge-packs/emergency-medical.json',
    sizeBytes: 2_800_000,
    sizeLabel: '~2.8 MB',
    docCount: 8,
    recommended: true,
  },
  {
    id: 'water-food',
    title: 'Water, Food, and Sanitation',
    description: 'Water purification, ration planning, food preservation, and hygiene protocols.',
    category: 'survival',
    filePath: '/knowledge-packs/water-food.json',
    sizeBytes: 2_100_000,
    sizeLabel: '~2.1 MB',
    docCount: 7,
    recommended: true,
  },
  {
    id: 'comms-navigation',
    title: 'Communications and Navigation',
    description: 'Radio procedures, signal plans, map/grid basics, and movement planning.',
    category: 'comms',
    filePath: '/knowledge-packs/comms-navigation.json',
    sizeBytes: 1_900_000,
    sizeLabel: '~1.9 MB',
    docCount: 7,
    recommended: true,
  },
  {
    id: 'field-engineering',
    title: 'Field Engineering and Power',
    description: 'Shelter building, microgrids, battery safety, repairs, and tool workflows.',
    category: 'engineering',
    filePath: '/knowledge-packs/field-engineering.json',
    sizeBytes: 2_500_000,
    sizeLabel: '~2.5 MB',
    docCount: 8,
  },
  {
    id: 'long-term-agriculture',
    title: 'Agriculture and Ecosystems',
    description: 'Seed saving, crop rotation, root cellars, processing waste, and foraging.',
    category: 'agriculture',
    filePath: '/knowledge-packs/long-term-agriculture.json',
    sizeBytes: 2_300_000,
    sizeLabel: '~2.3 MB',
    docCount: 6,
  },
  {
    id: 'off-grid-medicine',
    title: 'Off-Grid Long-Term Medicine',
    description: 'Antibiotic protocol, unassisted childbirth, dental emergencies, and disease control.',
    category: 'medical',
    filePath: '/knowledge-packs/off-grid-medicine.json',
    sizeBytes: 2_200_000,
    sizeLabel: '~2.2 MB',
    docCount: 5,
    recommended: true,
  },
  {
    id: 'cbrn-survival',
    title: 'CBRN Survival',
    description: 'Chemical, Biological, Radiological, and Nuclear response, isolation, and decontamination protocols.',
    category: 'cbrn',
    filePath: '/knowledge-packs/cbrn-survival.json',
    sizeBytes: 1_800_000,
    sizeLabel: '~1.8 MB',
    docCount: 5,
  },
  {
    id: 'trade-barter',
    title: 'Post-Collapse Economics & Security',
    description: 'Valuation of barter items, trade security, community defense architecture, and grey man tactics.',
    category: 'security',
    filePath: '/knowledge-packs/trade-barter.json',
    sizeBytes: 1_600_000,
    sizeLabel: '~1.6 MB',
    docCount: 4,
  },
];

export const KNOWLEDGE_PRESETS: KnowledgePreset[] = [
  {
    id: 'starter',
    name: 'Preparedness Starter',
    description: 'Balanced baseline for everyday resilience and rapid response.',
    packIds: ['emergency-medical', 'water-food', 'comms-navigation', 'off-grid-medicine'],
  },
  {
    id: 'full',
    name: 'Full Citadel Library',
    description: 'All 9 available packs for complete, multi-year offline coverage.',
    packIds: KNOWLEDGE_PACKS.map(pack => pack.id),
  },
  {
    id: 'medical-ops',
    name: 'Medical Ops Focus',
    description: 'Prioritizes trauma, long-term medicine, and public health knowledge.',
    packIds: ['emergency-medical', 'water-food', 'off-grid-medicine', 'cbrn-survival'],
  },
  {
    id: 'tech-ops',
    name: 'Technical & Secure Ops',
    description: 'Power systems, security architecture, communications, and field engineering.',
    packIds: ['comms-navigation', 'field-engineering', 'trade-barter'],
  },
  {
    id: 'homestead',
    name: 'Long-Term Homestead',
    description: 'Sustainable agriculture, preservation, and ecosystem management.',
    packIds: ['long-term-agriculture', 'water-food', 'field-engineering'],
  },
];

export function getKnowledgePackById(packId: string): KnowledgePackMeta | undefined {
  return KNOWLEDGE_PACKS.find(pack => pack.id === packId);
}
