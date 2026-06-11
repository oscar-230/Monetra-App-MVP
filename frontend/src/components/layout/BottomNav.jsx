export const BottomNav = ({ seccionActiva, setSeccionActiva }) => {
  const items = [
    { id: 'dashboard', label: 'Inicio', icon: <HomeIcon /> },
    { id: 'analisis', label: 'Análisis', icon: <ChartIcon /> },
    { id: 'ahorros', label: 'Ahorros', icon: <PigIcon /> },
    { id: 'perfil', label: 'Perfil', icon: <UserIcon /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex items-end justify-around px-2 py-2">
      {items.slice(0, 2).map(item => <NavButton key={item.id} item={item} active={seccionActiva} onClick={setSeccionActiva} />)}

      {/* Botón central Scan */}
      <button onClick={() => setSeccionActiva('ocr')}
        className="flex flex-col items-center -mt-5 bg-emerald-700 rounded-full w-14 h-14 items-center justify-center shadow-lg border-4 border-[#f2f4f7]">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 4v1m0 14v1M4 12h1m14 0h1m-2.05-7.95-.707.707M6.757 17.243l-.707.707M17.243 17.243l.707.707M6.757 6.757l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      </button>

      {items.slice(2).map(item => <NavButton key={item.id} item={item} active={seccionActiva} onClick={setSeccionActiva} />)}
    </nav>
  );
};

const NavButton = ({ item, active, onClick }) => (
  <button onClick={() => onClick(item.id)}
    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
      active === item.id ? 'text-emerald-700 bg-emerald-50' : 'text-gray-400 hover:text-gray-600'
    }`}>
    {item.icon}
    {item.label}
  </button>
);

// Iconos SVG simples
const HomeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ChartIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const PigIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const UserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;