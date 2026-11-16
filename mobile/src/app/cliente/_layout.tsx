import { useClientSync } from '@/api/use-client-sync';
import { useSocialSync } from '@/api/use-social-sync';
import { AppTabs } from '@/components/tab-bar';
import { usePushRegistration } from '@/lib/push';

export default function ClienteLayout() {
  useClientSync();
  useSocialSync();
  usePushRegistration(true);
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
