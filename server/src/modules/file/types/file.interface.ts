export interface IFile {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  mimetype: string;
  path: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}
