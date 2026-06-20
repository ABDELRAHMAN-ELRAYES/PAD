import { Diagram } from "../models/diagrams";

export interface DiagramCanvasProps {
  code: string;
  diagram: Diagram;
  onError?: (errorMsg: string | null) => void;
}
