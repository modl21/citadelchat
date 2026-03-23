export interface KnowledgePackMeta {
  id: string;
  title: string;
  description: string;
  category: 'medical' | 'survival' | 'comms' | 'engineering';
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
];

export const KNOWLEDGE_PRESETS: KnowledgePreset[] = [
  {
    id: 'starter',
    name: 'Preparedness Starter',
    description: 'Balanced baseline for everyday resilience and rapid response.',
    packIds: ['emergency-medical', 'water-food', 'comms-navigation'],
  },
  {
    id: 'full',
    name: 'Full Citadel Library',
    description: 'All available packs for complete offline coverage.',
    packIds: KNOWLEDGE_PACKS.map(pack => pack.id),
  },
  {
    id: 'medical-ops',
    name: 'Medical Ops Focus',
    description: 'Prioritizes trauma, public health, and emergency logistics knowledge.',
    packIds: ['emergency-medical', 'water-food'],
  },
  {
    id: 'tech-ops',
    name: 'Technical Operations',
    description: 'Power systems, communications, and field engineering workflows.',
    packIds: ['comms-navigation', 'field-engineering'],
  },
];

export function getKnowledgePackById(packId: string): KnowledgePackMeta | undefined {
  return KNOWLEDGE_PACKS.find(pack => pack.id === packId);
}
