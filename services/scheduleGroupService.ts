import { getApiUrl } from '../config';
import type { ScheduleGroup } from '../types';

export type ScheduleGroupInput = {
  day_of_week: number;
  time_start: string;
  time_end: string;
  title: string;
};

async function authHeaders(accessToken: string): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function createScheduleGroup(
  accessToken: string,
  input: ScheduleGroupInput,
): Promise<ScheduleGroup> {
  const response = await fetch(getApiUrl('api/schedule-groups'), {
    method: 'POST',
    headers: await authHeaders(accessToken),
    body: JSON.stringify(input),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось создать группу');
  }
  return data.group as ScheduleGroup;
}

export async function deleteScheduleGroup(accessToken: string, id: string): Promise<void> {
  const response = await fetch(getApiUrl(`api/schedule-groups/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось удалить группу');
  }
}
