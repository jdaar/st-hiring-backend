import { describe, expect, it, vi } from 'vitest';
import { SettingsRepository } from '@st-hiring/shared';
import { createGetSettingsUseCase } from './get-settings.usecase';

describe('getSettings', () => {
  it('returns the settings of the repository', async () => {
    // Arrange
    const settings = [{ id: 'theme' }];
    const settingsRepository = { getSettings: vi.fn().mockResolvedValue(settings) } as unknown as SettingsRepository;
    const getSettings = createGetSettingsUseCase({ settingsRepository });

    // Act
    const result = await getSettings();

    // Assert
    expect(settingsRepository.getSettings).toHaveBeenCalledWith();
    expect(result).toBe(settings);
  });
});
