import Navbar from './Navbar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto p-4 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
