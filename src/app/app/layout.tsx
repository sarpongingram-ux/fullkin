import { BottomNav } from "./BottomNav"

// Alle app-schermen delen de onderste navigatiebalk (max 4 items). De extra
// onderruimte zorgt dat inhoud nooit achter de balk verdwijnt.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-24">
      {children}
      <BottomNav />
    </div>
  )
}
