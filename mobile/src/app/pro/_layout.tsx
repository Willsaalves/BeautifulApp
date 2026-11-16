import { AppTabs } from '@/components/tab-bar';

export default function ProLayout() {
  return (
    <AppTabs
      tabs={[
        { name: 'index', href: '/pro', label: 'Home', icon: 'home' },
        { name: 'agenda', href: '/pro/agenda', label: 'Agenda', icon: 'calendar' },
        { name: 'clientes', href: '/pro/clientes', label: 'Clientes', icon: 'people' },
        { name: 'lucro', href: '/pro/lucro', label: 'Lucro', icon: 'trending-up' },
        { name: 'estoque', href: '/pro/estoque', label: 'Estoque', icon: 'cube' },
        { name: 'perfil', href: '/pro/perfil', label: 'Perfil', icon: 'color-palette' },
      ]}
    />
  );
}
