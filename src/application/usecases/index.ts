import { EventsRepository, SettingsRepository } from '@st-hiring/shared';
import { createGetPaginatedEventsUseCase } from './get-paginated-events.usecase';
import { createGetSettingsUseCase } from './get-settings.usecase';
import { createUpsertSettingUseCase } from './upsert-setting.usecase';

export interface Repositories {
  events: EventsRepository;
  settings: SettingsRepository;
}

export const createUseCases = ({ events, settings }: Repositories) => ({
  getPaginatedEvents: createGetPaginatedEventsUseCase({ eventsRepository: events }),
  getSettings: createGetSettingsUseCase({ settingsRepository: settings }),
  upsertSetting: createUpsertSettingUseCase({ settingsRepository: settings }),
});

export type UseCases = ReturnType<typeof createUseCases>;
