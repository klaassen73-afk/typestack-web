import { api } from './client';
import type { AutoActivationRule } from './types';

export function listMyAutoActivationRules(): Promise<{ data: AutoActivationRule[] }> {
  return api('/auto-activation-rules');
}

export function listAutoActivationRulesForCollection(
  collectionId: string,
): Promise<{ data: AutoActivationRule[] }> {
  return api(`/collections/${collectionId}/auto-activation-rules`);
}

export function createAutoActivationRule(
  collectionId: string,
  input: { bundleId: string; appName?: string | null; priority?: number; enabled?: boolean },
): Promise<AutoActivationRule> {
  return api(`/collections/${collectionId}/auto-activation-rules`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAutoActivationRule(
  ruleId: string,
  input: { bundleId?: string; appName?: string | null; priority?: number; enabled?: boolean },
): Promise<AutoActivationRule> {
  return api(`/auto-activation-rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteAutoActivationRule(ruleId: string): Promise<{ success: true }> {
  return api(`/auto-activation-rules/${ruleId}`, { method: 'DELETE' });
}

// Common macOS bundle IDs for creative-suite apps. Pulled out as a constant so
// the rule editor can offer them as quick-add presets instead of forcing users
// to type reverse-DNS strings.
export const COMMON_CREATIVE_APPS: ReadonlyArray<{ bundleId: string; appName: string }> = [
  { bundleId: 'com.adobe.InDesign', appName: 'Adobe InDesign' },
  { bundleId: 'com.adobe.illustrator', appName: 'Adobe Illustrator' },
  { bundleId: 'com.adobe.Photoshop', appName: 'Adobe Photoshop' },
  { bundleId: 'com.adobe.AfterEffects', appName: 'Adobe After Effects' },
  { bundleId: 'com.adobe.Premiere', appName: 'Adobe Premiere Pro' },
  { bundleId: 'com.figma.Desktop', appName: 'Figma' },
  { bundleId: 'com.bohemiancoding.sketch3', appName: 'Sketch' },
  { bundleId: 'com.microsoft.Powerpoint', appName: 'Microsoft PowerPoint' },
  { bundleId: 'com.apple.iWork.Keynote', appName: 'Keynote' },
];
