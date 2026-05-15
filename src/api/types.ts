// Vendored from /shared/types/index.ts. Kept in sync manually.

export type FontSource = 'local' | 'adobe' | 'google' | 'system' | 'user-installed';
export type FontCategory = 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting';
export type UserRole = 'admin' | 'user';
export type ActivationAction = 'activate' | 'deactivate';
export type ActivationTrigger = 'manual' | 'auto' | 'collection';
export type ActivationMode = 'temporary' | 'permanent';
export type OutputProfile = 'print' | 'web' | 'video' | 'presentation';

export interface VariableAxis {
  min: number;
  max: number;
  default: number;
}

export interface Font {
  id: string;
  familyName: string;
  subfamily: string | null;
  postscriptName: string | null;
  source: FontSource;
  sourceId: string | null;
  filePath: string | null;
  category: FontCategory | null;
  tags: string[];
  variableAxes: Record<string, VariableAxis> | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyVariant {
  id: string;
  subfamily: string | null;
  origFamilyName: string;
  category: FontCategory | null;
  filePath: string | null;
}

export interface FamilyGroup {
  familyName: string;
  source: FontSource;
  variantCount: number;
  primaryId: string;
  category: FontCategory | null;
  variants: FamilyVariant[];
}

export interface CollectionFontEntry extends Font {
  sortOrder: number;
  addedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  outputProfile: OutputProfile | null;
  fontCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionWithFonts extends Collection {
  fonts: CollectionFontEntry[];
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastSeenAt: string | null;
  onboardedAt: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: PublicUser;
}

export interface ActivationEvent {
  id: string;
  userId: string;
  fontId: string;
  familyName: string | null;
  subfamily: string | null;
  action: ActivationAction;
  appName: string | null;
  triggeredBy: ActivationTrigger;
  createdAt: string;
}

export interface CurrentAutoApp {
  appName: string;
  at: string;
}

export interface ActiveFontEntry {
  fontId: string;
  activatedAt: string;
  triggeredBy: ActivationTrigger;
  mode: ActivationMode;
  source: FontSource;
  filePath: string | null;
  familyName: string;
  subfamily: string | null;
}

export interface ActivationState {
  userId: string;
  activeFonts: ActiveFontEntry[];
  lastUpdatedAt: string | null;
  currentAutoApp: CurrentAutoApp | null;
}

export interface AutoActivationRule {
  id: string;
  userId: string;
  bundleId: string;
  collectionId: string;
  collectionName: string;
  appName: string | null;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutoActivationApplyResult {
  bundleId: string;
  appName: string | null;
  matchedRuleIds: string[];
  activated: string[];
  deactivated: string[];
  state: ActivationState;
}

export interface AdminStats {
  fontsBySource: Record<FontSource, number>;
  totalFonts: number;
  totalCollections: number;
  totalUsers: number;
  activeSessionsCount: number;
  storageBytes: number;
}

export interface IntegrationStatus {
  source: FontSource;
  count: number;
  lastSyncedAt: string | null;
  inProgress: boolean;
  withBinaries?: number;
}

export interface ImportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  total: number;
  processed: number;
  errors: string[];
  createdAt: string;
  completedAt: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface FontsListQuery {
  page?: number;
  pageSize?: number;
  source?: FontSource;
  category?: FontCategory;
  tag?: string;
  search?: string;
  variable?: boolean;
  active?: boolean;
  sort?: 'name' | 'recent' | 'activated';
  collectionId?: string;
  favorited?: boolean;
}
