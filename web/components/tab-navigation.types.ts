export interface TabNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: string[]
}
