// Data contracts shared by the hosted workspace and generated local app.
export type Device = { id: string; name: string; createdAt: string; lastUsedAt: string | null };
export type VisitorCounts = { total: number; today: number };
export type RecordComment = { id: string; name: string; content: string; createdAt: string };
export type Reaction = 'like' | 'disappointed';
export type Engagement = { views: number; likes: number; disappointed: number; mine: Reaction | null };
