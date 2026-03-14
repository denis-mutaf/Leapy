/**
 * Full-width layout for creatives generator (breaks out of main max-w).
 */
export default function CreativesLayout({ children }) {
  return (
    <div
      className="w-screen relative left-1/2 -translate-x-1/2 overflow-x-hidden flex flex-col flex-1"
      style={{ height: 'calc(100vh - 180px)', minHeight: 480 }}
    >
      {children}
    </div>
  );
}
