import { useEffect, useState } from 'react';

import { overdueClients as localOverdue } from '@/domain/rules';
import type { Client, Service } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';

import { overdueClients, profitReport } from './business';
import { API_ENABLED } from './client';

export interface OverdueRow {
  client: Client;
  service: Pick<Service, 'name'>;
  daysLate: number;
  lastAt: Date;
}

/** Faturamento do mês e clientes atrasadas: do servidor com a API ligada, senão calculado no app. */
export function useProStats() {
  const s = useStore();
  const L = useLookup();
  const remote = API_ENABLED && !!L.myPro?.remote;
  const [remoteOverdue, setRemoteOverdue] = useState<OverdueRow[] | null>(null);
  const [remoteRevenue, setRemoteRevenue] = useState<number | null>(null);
  const completedCount = s.appointments.filter((a) => a.professionalId === s.proId && a.status === 'concluido').length;

  useEffect(() => {
    if (!remote) return;
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    profitReport(start, end).then((p) => setRemoteRevenue((p.revenueCents ?? 0) / 100)).catch(() => undefined);
    overdueClients()
      .then((list) =>
        setRemoteOverdue(
          list.map((o) => ({
            client: {
              id: o.clientAccountId!,
              name: o.name ?? 'Cliente',
              phone: o.phone ?? '',
              photo: o.photoUrl,
              avatar: '#E8DCF2',
              favorites: [],
              dreams: [],
            },
            service: { name: o.serviceName ?? '' },
            daysLate: o.daysLate ?? 0,
            lastAt: new Date(o.lastAt ?? Date.now()),
          })),
        ),
      )
      .catch(() => undefined);
    // recalcula quando um atendimento é concluído
  }, [remote, completedCount]);

  const now = new Date();
  const localRevenue = s.appointments
    .filter((a) => a.professionalId === s.proId && a.status === 'concluido' && new Date(a.startsAt).getMonth() === now.getMonth() && new Date(a.startsAt).getFullYear() === now.getFullYear())
    .reduce((sum, a) => sum + a.price - (a.discountApplied ?? 0), 0);

  return {
    monthRevenue: remote ? (remoteRevenue ?? 0) : localRevenue,
    overdue: remote ? (remoteOverdue ?? []) : (localOverdue(s.appointments, s.services, s.clients, s.proId) as OverdueRow[]),
  };
}
