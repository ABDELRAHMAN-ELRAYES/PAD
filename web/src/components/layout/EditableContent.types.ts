export interface EditableContentProps {
  content: string
  isEditing: boolean
  onEdit: () => void
  onSave: (content: string) => void
  onCancel: () => void
}
