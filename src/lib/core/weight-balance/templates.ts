/**
 * Item Template Storage for Weight & Balance
 * Allows users to save custom item configurations as reusable templates
 */

import type { LoadingItem } from './types';

const TEMPLATES_STORAGE_KEY = 'wb.item.templates.v1';

export interface ItemTemplate {
  id: string;
  name: string;
  description?: string;
  type: LoadingItem['type'];
  defaultWeight: number;
  defaultArm: number;
  category?: 'occupant' | 'fuel' | 'baggage' | 'equipment' | 'cargo' | 'custom';
  createdAt: string;
  tags?: string[];
}

export interface TemplateLibrary {
  version: string;
  templates: ItemTemplate[];
  lastModified: string;
}

/**
 * Load all templates from localStorage
 */
export function loadTemplates(): ItemTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!stored) return [];
    
    const library: TemplateLibrary = JSON.parse(stored);
    return library.templates || [];
  } catch (error) {
    console.error('Failed to load item templates:', error);
    return [];
  }
}

/**
 * Save templates to localStorage
 */
export function saveTemplates(templates: ItemTemplate[]): boolean {
  try {
    const library: TemplateLibrary = {
      version: '1.0',
      templates,
      lastModified: new Date().toISOString()
    };
    
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(library, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save item templates:', error);
    return false;
  }
}

/**
 * Add a new template
 */
export function addTemplate(template: Omit<ItemTemplate, 'id' | 'createdAt'>): ItemTemplate {
  const templates = loadTemplates();
  
  const newTemplate: ItemTemplate = {
    ...template,
    id: generateTemplateId(),
    createdAt: new Date().toISOString()
  };
  
  templates.push(newTemplate);
  saveTemplates(templates);
  
  return newTemplate;
}

/**
 * Update an existing template
 */
export function updateTemplate(id: string, updates: Partial<ItemTemplate>): boolean {
  const templates = loadTemplates();
  const index = templates.findIndex(t => t.id === id);
  
  if (index === -1) return false;
  
  templates[index] = {
    ...templates[index],
    ...updates
  };
  
  return saveTemplates(templates);
}

/**
 * Delete a template
 */
export function deleteTemplate(id: string): boolean {
  const templates = loadTemplates();
  const filtered = templates.filter(t => t.id !== id);
  
  if (filtered.length === templates.length) return false; // Not found
  
  return saveTemplates(filtered);
}

/**
 * Get template by ID
 */
export function getTemplate(id: string): ItemTemplate | null {
  const templates = loadTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * Create a loading item from a template
 */
export function createItemFromTemplate(template: ItemTemplate, itemId: string): LoadingItem {
  return {
    id: itemId,
    type: template.type,
    name: template.name,
    weight: template.defaultWeight,
    arm: template.defaultArm,
    editable: true,
    notes: template.description
  };
}

/**
 * Create a template from a loading item
 */
export function createTemplateFromItem(
  item: LoadingItem,
  templateName?: string,
  description?: string,
  category?: ItemTemplate['category']
): Omit<ItemTemplate, 'id' | 'createdAt'> {
  return {
    name: templateName || item.name,
    description: description || item.notes,
    type: item.type,
    defaultWeight: item.weight,
    defaultArm: item.arm,
    category: category || inferCategory(item.type)
  };
}

/**
 * Infer category from item type
 */
function inferCategory(type: LoadingItem['type']): ItemTemplate['category'] {
  if (type === 'occupant') return 'occupant';
  if (type.startsWith('fuel_')) return 'fuel';
  if (type.startsWith('baggage_')) return 'baggage';
  if (type.startsWith('equipment_')) return 'equipment';
  if (type === 'cargo') return 'cargo';
  return 'custom';
}

/**
 * Generate unique template ID
 */
function generateTemplateId(): string {
  return `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): ItemTemplate[] {
  const templates = loadTemplates();
  const lowerQuery = query.toLowerCase();
  
  return templates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description?.toLowerCase().includes(lowerQuery) ||
    t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: ItemTemplate['category']): ItemTemplate[] {
  const templates = loadTemplates();
  return templates.filter(t => t.category === category);
}

/**
 * Export templates to JSON file
 */
export function exportTemplates(): string {
  const templates = loadTemplates();
  const library: TemplateLibrary = {
    version: '1.0',
    templates,
    lastModified: new Date().toISOString()
  };
  
  return JSON.stringify(library, null, 2);
}

/**
 * Import templates from JSON
 */
export function importTemplates(jsonString: string, merge: boolean = false): boolean {
  try {
    const imported: TemplateLibrary = JSON.parse(jsonString);
    
    if (!imported.templates || !Array.isArray(imported.templates)) {
      throw new Error('Invalid template format');
    }
    
    let finalTemplates = imported.templates;
    
    if (merge) {
      const existing = loadTemplates();
      // Merge, avoiding duplicates by ID
      const existingIds = new Set(existing.map(t => t.id));
      const newTemplates = imported.templates.filter(t => !existingIds.has(t.id));
      finalTemplates = [...existing, ...newTemplates];
    }
    
    return saveTemplates(finalTemplates);
  } catch (error) {
    console.error('Failed to import templates:', error);
    return false;
  }
}
