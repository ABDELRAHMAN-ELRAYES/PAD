export interface GuidelineFile {
  id: string;
  userId: string;
  name: string;
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface Guideline {
  id: string;
  userId: string;
  fileId: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  file: GuidelineFile | null;
}
