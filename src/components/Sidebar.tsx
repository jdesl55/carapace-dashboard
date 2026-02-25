import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  ShieldAlert,
  Target,
  TrendingUp,
  ScrollText,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/rules', label: 'Security Rules', icon: ShieldAlert },
  { to: '/goals', label: 'Goals & Anchoring', icon: Target },
  { to: '/performance', label: 'Performance', icon: TrendingUp },
  { to: '/activity', label: 'Activity Log', icon: ScrollText },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-carapace-bg-surface border-r border-carapace-border flex flex-col z-50">
      <div className="p-6 pb-8">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-carapace-red flex-shrink-0" />
          <span className="font-mono font-bold text-sm tracking-[0.15em] text-carapace-red">
            CARAPACE
          </span>
        </div>
        <p className="text-xs text-carapace-text-dim italic mt-1.5 pl-[30px]">
          armor for your agent
        </p>
      </div>

      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${
                isActive
                  ? 'text-carapace-red border-l-[3px] border-carapace-red bg-[rgba(220,38,38,0.15)] ml-0 pl-[9px]'
                  : 'text-carapace-text-secondary hover:text-carapace-text-primary hover:bg-carapace-bg-raised border-l-[3px] border-transparent'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 pt-4 border-t border-carapace-border space-y-2">
        <p className="font-mono text-xs text-carapace-text-dim">v0.1.1</p>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)]">
          <div className="w-1.5 h-1.5 rounded-full bg-carapace-green" />
          <span className="font-mono text-xs text-carapace-green">
            Local Mode
          </span>
        </div>
        <p className="font-mono text-[10px] text-carapace-text-dim">
          Config: ~/.carapace/
        </p>
      </div>
    </aside>
  );
}
