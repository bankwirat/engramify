import { Search, FolderInput, AlignLeft, Plus, Hexagon } from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'

export type Tab = 'search' | 'ingest' | 'bm25' | 'add'

const NAV = [
  { id: 'search' as Tab, label: 'Search',     icon: Search },
  { id: 'ingest' as Tab, label: 'Ingest',     icon: FolderInput },
  { id: 'bm25'   as Tab, label: 'BM25',       icon: AlignLeft },
  { id: 'add'    as Tab, label: 'Add Memory', icon: Plus },
]

interface AppSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="cursor-default select-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Hexagon className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Engramify</span>
                  <span className="text-xs text-muted-foreground">Memory Engine</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="px-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <SidebarMenuItem key={id}>
              <SidebarMenuButton
                isActive={activeTab === id}
                onClick={() => onTabChange(id)}
                tooltip={label}
              >
                <Icon />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-muted-foreground/60">
          all-MiniLM-L6-v2 · 384d
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
