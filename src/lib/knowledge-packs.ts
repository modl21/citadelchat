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
  {
    id: 'firearms-weapons',
    title: 'Firearms and Defensive Weapons',
    description: 'Weapon safety, maintenance, ammo discipline, low-light procedures, and team fire control.',
    category: 'security',
    filePath: '/knowledge-packs/firearms-weapons.json',
    sizeBytes: 2_400_000,
    sizeLabel: '~2.4 MB',
    docCount: 8,
    recommended: true,
  },
  {
    id: 'perimeter-defense',
    title: 'Perimeter Defense and Site Hardening',
    description: 'Layered perimeter design, watch routines, entry control, alarms, and contact drills.',
    category: 'security',
    filePath: '/knowledge-packs/perimeter-defense.json',
    sizeBytes: 2_000_000,
    sizeLabel: '~2.0 MB',
    docCount: 7,
    recommended: true,
  },
  {
    id: 'mechanical-repair',
    title: 'Mechanical Repair and Fabrication',
    description: 'Spare-part planning, field-expedient fixes, generator upkeep, and maintenance logging.',
    category: 'engineering',
    filePath: '/knowledge-packs/mechanical-repair.json',
    sizeBytes: 2_300_000,
    sizeLabel: '~2.3 MB',
    docCount: 8,
  },
  {
    id: 'fuel-heat-cooking',
    title: 'Fuel, Heat, and Off-Grid Cooking',
    description: 'Fuel prioritization, stove operation, winter heat retention, and fire prevention workflows.',
    category: 'survival',
    filePath: '/knowledge-packs/fuel-heat-cooking.json',
    sizeBytes: 2_100_000,
    sizeLabel: '~2.1 MB',
    docCount: 7,
  },
  {
    id: 'water-systems',
    title: 'Water Systems and Sanitation Engineering',
    description: 'Source risk mapping, treatment trains, chlorination, latrine siting, and pump maintenance.',
    category: 'survival',
    filePath: '/knowledge-packs/water-systems.json',
    sizeBytes: 2_300_000,
    sizeLabel: '~2.3 MB',
    docCount: 7,
    recommended: true,
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
    description: 'All available packs for complete, multi-year offline coverage.',
    packIds: KNOWLEDGE_PACKS.map(pack => pack.id),
  },
  {
    id: 'medical-ops',
    name: 'Medical Ops Focus',
    description: 'Prioritizes trauma, long-term medicine, public health, and clean water operations.',
    packIds: ['emergency-medical', 'water-food', 'off-grid-medicine', 'cbrn-survival', 'water-systems'],
  },
  {
    id: 'tech-ops',
    name: 'Technical & Secure Ops',
    description: 'Power systems, security architecture, comms, field engineering, and repair capability.',
    packIds: ['comms-navigation', 'field-engineering', 'trade-barter', 'mechanical-repair', 'perimeter-defense', 'firearms-weapons'],
  },
  {
    id: 'homestead',
    name: 'Long-Term Homestead',
    description: 'Sustainable agriculture, water systems, fuel resilience, and ecosystem management.',
    packIds: ['long-term-agriculture', 'water-food', 'field-engineering', 'water-systems', 'fuel-heat-cooking'],
  },
  {
    id: 'security-core',
    name: 'Security Core',
    description: 'Defensive readiness with comms, perimeter hardening, and weapons safety workflows.',
    packIds: ['comms-navigation', 'perimeter-defense', 'firearms-weapons', 'trade-barter'],
  },
  {
    id: 'infrastructure-core',
    name: 'Infrastructure Core',
    description: 'Water, heat, fuel, and mechanical continuity when supply chains fail.',
    packIds: ['water-systems', 'fuel-heat-cooking', 'mechanical-repair', 'field-engineering'],
  },
];

export function getKnowledgePackById(packId: string): KnowledgePackMeta | undefined {
  return KNOWLEDGE_PACKS.find(pack => pack.id === packId);
}
