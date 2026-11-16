import { useClientSync } from '@/api/use-client-sync';
import { AppTabs } from '@/components/tab-bar';

export default function ClienteLayout() {
  useClientSync();
  return (
    <AppTabs
      tabs={[
        { name: 'index', href: '/cliente', label: 'Início', icon: 'home' },
        { name: 'explorar', href: '/cliente/explorar', label: 'Encontrar', icon: 'search' },
        { name: 'agenda', href: '/cliente/agenda', label: 'Horários', icon: 'calendar' },
        { name: 'perfil', href: '/cliente/perfil', label: 'Perfil', icon: 'person' },
      ]}
    />
  );
}
