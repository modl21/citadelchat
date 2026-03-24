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
    description: 'Radio discipline, navigation, and practical mesh networking operations.',
    category: 'comms',
    filePath: '/knowledge-packs/comms-navigation.json',
    sizeBytes: 2_200_000,
    sizeLabel: '~2.2 MB',
    docCount: 10,
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
    description: 'Seed saving, composting safety, crop rotation, storage, and resilient food systems.',
    category: 'agriculture',
    filePath: '/knowledge-packs/long-term-agriculture.json',
    sizeBytes: 2_400_000,
    sizeLabel: '~2.4 MB',
    docCount: 7,
  },
  {
    id: 'off-grid-medicine',
    title: 'Off-Grid Long-Term Medicine',
    description: 'Infection triage, wound care, hydration, maternal safety, and medication stewardship.',
    category: 'medical',
    filePath: '/knowledge-packs/off-grid-medicine.json',
    sizeBytes: 2_400_000,
    sizeLabel: '~2.4 MB',
    docCount: 6,
    recommended: true,
  },
  {
    id: 'cbrn-survival',
    title: 'CBRN Survival',
    description: 'Radiation basics, decontamination boundaries, biological isolation, and hazard limits.',
    category: 'cbrn',
    filePath: '/knowledge-packs/cbrn-survival.json',
    sizeBytes: 2_000_000,
    sizeLabel: '~2.0 MB',
    docCount: 6,
  },
  {
    id: 'trade-barter',
    title: 'Post-Collapse Economics & Security',
    description: 'Barter value, safer exchange protocols, community stability, and local ledgers.',
    category: 'security',
    filePath: '/knowledge-packs/trade-barter.json',
    sizeBytes: 1_900_000,
    sizeLabel: '~1.9 MB',
    docCount: 5,
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
  {
    id: 'community-governance',
    title: 'Community Governance and Dispute Resolution',
    description: 'Community charters, decision process, scarcity rules, accountability, and conflict resolution.',
    category: 'security',
    filePath: '/knowledge-packs/community-governance.json',
    sizeBytes: 2_100_000,
    sizeLabel: '~2.1 MB',
    docCount: 8,
    recommended: true,
  },
  {
    id: 'offline-information-systems',
    title: 'Offline Information Systems and Mesh Services',
    description: 'Local services, mesh topology, sneakernet workflows, backups, and data integrity.',
    category: 'comms',
    filePath: '/knowledge-packs/offline-information-systems.json',
    sizeBytes: 2_200_000,
    sizeLabel: '~2.2 MB',
    docCount: 8,
    recommended: true,
  },
  {
    id: 'education-skill-transfer',
    title: 'Education and Skill Transfer',
    description: 'Cross-training, drills, youth continuity, leadership pipeline, and local knowledge retention.',
    category: 'survival',
    filePath: '/knowledge-packs/education-skill-transfer.json',
    sizeBytes: 1_900_000,
    sizeLabel: '~1.9 MB',
    docCount: 7,
  },
];

export const KNOWLEDGE_PRESETS: KnowledgePreset[] = [
  {
    id: 'starter',
    name: 'Preparedness Starter',
    description: 'Balanced baseline for everyday resilience and rapid response.',
    packIds: ['emergency-medical', 'water-food', 'comms-navigation', 'off-grid-medicine', 'offline-information-systems'],
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
    description: 'Power systems, security architecture, comms, mesh services, and repair capability.',
    packIds: ['comms-navigation', 'offline-information-systems', 'field-engineering', 'trade-barter', 'mechanical-repair', 'perimeter-defense', 'firearms-weapons'],
  },
  {
    id: 'homestead',
    name: 'Long-Term Homestead',
    description: 'Sustainable agriculture, water systems, fuel resilience, and ecosystem management.',
    packIds: ['long-term-agriculture', 'water-food', 'field-engineering', 'water-systems', 'fuel-heat-cooking', 'education-skill-transfer'],
  },
  {
    id: 'security-core',
    name: 'Security Core',
    description: 'Defensive readiness with comms, perimeter hardening, governance, and weapons safety workflows.',
    packIds: ['comms-navigation', 'perimeter-defense', 'community-governance', 'firearms-weapons', 'trade-barter'],
  },
  {
    id: 'infrastructure-core',
    name: 'Infrastructure Core',
    description: 'Water, heat, fuel, mechanical continuity, and local information systems.',
    packIds: ['water-systems', 'fuel-heat-cooking', 'mechanical-repair', 'field-engineering', 'offline-information-systems'],
  },
  {
    id: 'civic-resilience',
    name: 'Civic Resilience',
    description: 'Governance, education, health continuity, and trust-preserving systems under stress.',
    packIds: ['community-governance', 'education-skill-transfer', 'off-grid-medicine', 'water-systems', 'offline-information-systems'],
  },
];

export function getKnowledgePackById(packId: string): KnowledgePackMeta | undefined {
  return KNOWLEDGE_PACKS.find(pack => pack.id === packId);
}
