export type Points = 1 | 3 | 5;
export type Status = "todo" | "doing" | "review" | "done";

export interface Member {
  id: string;
  name: string;
  role: "lead" | "member";
  hoursPerWeek: number;
  skills: string[];
  avatar: string; // background colour for the initials circle
}

export interface Deliverable {
  id: string;
  title: string;
  due: string; // ISO date
}

export interface Task {
  id: string;
  title: string;
  deliverableId: string;
  points: Points;
  status: Status;
  assigneeId: string | null;
  reviewerId?: string | null;
  requiredSkills: string[];
  due: string;
  dependsOn: string[];
  reason?: string; // one-line explanation of the assignment
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  course: string;
  startedAt: number;
  due: string;
  brief: string;
  deliverables: Deliverable[];
  tasks: Task[];
}

export interface Move {
  taskId: string;
  fromId: string;
  toId: string;
  reason: string;
}

export type Vote = "yes" | "no";

export interface RebalanceProposal {
  id: string;
  projectId: string;
  createdAt: number;
  moves: Move[];
  status: "pending" | "accepted" | "declined";
  votes: Record<string, Vote>;
  signature: string;
}

export type PanicResponse = "pending" | "accepted" | "declined";

export interface PanicRequest {
  id: string;
  projectId: string;
  memberId: string;
  reason?: string; // private: visible to requester and lead only
  createdAt: number;
  moves: Move[];
  responses: Record<string, PanicResponse>; // keyed by taskId
  status: "open" | "resolved";
}

export interface Notification {
  id: string;
  at: number;
  title: string;
  body: string;
  kind: "pace" | "deadline" | "stalled" | "rebalance" | "panic" | "digest" | "info";
  read: boolean;
}

export interface Activity {
  id: string;
  at: number;
  text: string;
}

export interface Digest {
  id: string;
  projectId: string;
  at: number;
  completion: number;
  deliverablesDone: string[];
  balance: { memberId: string; line: string; tone: "good" | "room" | "heavy" }[];
  risks: string[];
  action: string;
  sentToNotion: boolean;
}

export interface NotionState {
  connected: boolean;
  workspaceName?: string;
  databaseName?: string;
  lastSyncedAt?: number;
  autoSync: boolean;
  // Mirror of the Notion database rows (taskId -> status as seen in Notion).
  rows: Record<string, { status: Status; editedAt: number }>;
}
