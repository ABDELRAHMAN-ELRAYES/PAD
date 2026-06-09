export interface InputPanelProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  isLoading: boolean
}
