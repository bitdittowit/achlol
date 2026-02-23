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
  fromField: string;
  toField: string;
  status: PrankStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  completionStoryText: string | null;
  createdAt: string;
  updatedAt: string;
  media: Media[];
}
