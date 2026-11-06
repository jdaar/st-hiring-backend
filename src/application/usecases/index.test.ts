import { describe, expect, it, vi } from 'vitest';
import { createGetPaginatedEventsUseCase } from './get-paginated-events.usecase';
import { createGetSettingsUseCase } from './get-settings.usecase';
import { createUpsertSettingUseCase } from './upsert-setting.usecase';
import { Repositories, createUseCases } from '.';

vi.mock('./get-paginated-events.usecase', () => ({
  createGetPaginatedEventsUseCase: vi.fn(() => 'getPaginatedEvents'),
}));
vi.mock('./get-settings.usecase', () => ({ createGetSettingsUseCase: vi.fn(() => 'getSettings') }));
vi.mock('./upsert-setting.usecase', () => ({ createUpsertSettingUseCase: vi.fn(() => 'upsertSetting') }));

describe('createUseCases', () => {
  it('wires every use case to its repository', () => {
    // Arrange
    const repositories = { events: { name: 'events' }, settings: { name: 'settings' } } as unknown as Repositories;

    // Act
    const useCases = createUseCases(repositories);

    // Assert
    expect(createGetPaginatedEventsUseCase).toHaveBeenCalledWith({ eventsRepository: repositories.events });
    expect(createGetSettingsUseCase).toHaveBeenCalledWith({ settingsRepository: repositories.settings });
    expect(createUpsertSettingUseCase).toHaveBeenCalledWith({ settingsRepository: repositories.settings });
    expect(useCases).toEqual({
      getPaginatedEvents: 'getPaginatedEvents',
      getSettings: 'getSettings',
      upsertSetting: 'upsertSetting',
    });
  });
});
