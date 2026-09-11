import { IFile } from "../../file/types/file.interface";

export interface IGuideline {
  id: string;
  userId: string;
  fileId: string | null;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  file?: IFile | null;
}
