import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useSettings } from './hooks/useSettings'
import Setup from './pages/Setup'
import DailyFlow from './pages/DailyFlow'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-400">{name} — coming soon</div>
}

function AppRoutes() {
  const { settings, isLoading } = useSettings()

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Caricamento...</div>
  }

  if (!settings.setupComplete) {
    return <Setup />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DailyFlow />} />
        <Route path="/calendar" element={<Placeholder name="Calendario" />} />
        <Route path="/report" element={<Placeholder name="Report" />} />
        <Route path="/oncall" element={<Placeholder name="Reperibilità" />} />
        <Route path="/absences" element={<Placeholder name="Permessi/Ferie" />} />
        <Route path="/settings" element={<Placeholder name="Impostazioni" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
