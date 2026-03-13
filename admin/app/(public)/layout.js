/**
 * Layout для публичных страниц (брифы для клиентов).
 * Переопределяет корневой layout — без шапки admin и без ClerkProvider-шапки.
 */
export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      {children}
    </div>
  );
}
