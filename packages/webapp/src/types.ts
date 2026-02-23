export type PrankStatus = "planned" | "completed";
export type IconType = "auto" | "prompt" | "upload";

export interface Media {
  id: number;
  prankId: number;
  type: "photo" | "video";
  filePath: string;
  sortOrder: number;
  createdAt: string;
}

export interface Prank {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  iconType: IconType;
  iconPath: string | null;
  participants: string;
  status: PrankStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  completionStoryText: string | null;
  witnessUserId?: number | null;
  /** Present when witness was set; for display in confirmation flow */
  witness?: { id: number; firstName: string | null; lastName: string | null; username: string | null };
  confirmedAt?: string | null;
  witnessRejectedAt?: string | null;
  confirmed?: boolean;
  witnessRejected?: boolean;
  isOwner?: boolean;
  /** True if current user is the witness (can confirm/reject) */
  isWitness?: boolean;
  createdAt: string;
  updatedAt: string;
  media: Media[];
}
