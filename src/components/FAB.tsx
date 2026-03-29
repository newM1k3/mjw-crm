import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Users, UserPlus, CalendarPlus } from 'lucide-react';

interface FABProps {
  onAddClient: () => void;
  onAddContact: () => void;
  onNewEvent: () => void;
}

const FAB: React.FC<FABProps> = ({ onAddClient, onAddContact, onNewEvent }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAction = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const items = [
    {
      label: 'New Event',
      icon: <CalendarPlus className="w-4 h-4" />,
      onClick: () => handleAction(onNewEvent),
    },
    {
      label: 'Add Contact',
      icon: <UserPlus className="w-4 h-4" />,
      onClick: () => handleAction(onAddContact),
    },
    {
      label: 'Add Client',
      icon: <Users className="w-4 h-4" />,
      onClick: () => handleAction(onAddClient),
    },
  ];

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-200 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="flex items-center gap-2.5 bg-white text-gray-700 text-sm font-medium pl-3 pr-4 py-2.5 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 hover:shadow-xl transition-all duration-150 whitespace-nowrap"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 text-primary-700">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close quick-add menu' : 'Open quick-add menu'}
        className={`w-14 h-14 rounded-full bg-primary-700 text-white shadow-lg hover:bg-primary-800 hover:shadow-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 ${
          open ? 'rotate-45' : 'rotate-0'
        }`}
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default FAB;
