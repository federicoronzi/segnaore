import { HashRouter, Routes, Route } from 'react-router-dom'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-500">{name} — coming soon</div>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Placeholder name="Daily Flow" />} />
        <Route path="/calendar" element={<Placeholder name="Calendar" />} />
        <Route path="/report" element={<Placeholder name="Report" />} />
        <Route path="/oncall" element={<Placeholder name="On-Call" />} />
        <Route path="/absences" element={<Placeholder name="Absences" />} />
        <Route path="/settings" element={<Placeholder name="Settings" />} />
        <Route path="/setup" element={<Placeholder name="Setup" />} />
      </Routes>
    </HashRouter>
  )
}
