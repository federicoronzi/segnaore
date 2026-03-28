import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Placeholder name="Daily Flow" />} />
          <Route path="/calendar" element={<Placeholder name="Calendario" />} />
          <Route path="/report" element={<Placeholder name="Report" />} />
          <Route path="/oncall" element={<Placeholder name="Reperibilità" />} />
          <Route path="/absences" element={<Placeholder name="Permessi/Ferie" />} />
          <Route path="/settings" element={<Placeholder name="Impostazioni" />} />
          <Route path="/setup" element={<Placeholder name="Setup" />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
