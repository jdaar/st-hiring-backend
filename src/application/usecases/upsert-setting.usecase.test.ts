import { describe, expect, it, vi } from 'vitest';
import { SettingsRepository } from '@st-hiring/shared';
import { createUpsertSettingUseCase } from './upsert-setting.usecase';

describe('upsertSetting', () => {
  it('upserts the setting through the repository', async () => {
    // Arrange
    const setting = { id: 'theme', value: 'dark', version: 2 };
    const settingsRepository = { upsertSetting: vi.fn().mockResolvedValue(setting) } as unknown as SettingsRepository;
    const upsertSetting = createUpsertSettingUseCase({ settingsRepository });
    const input = { id: 'theme', value: 'dark', version: 1 };

    // Act
    const result = await upsertSetting(input);

    // Assert
    expect(settingsRepository.upsertSetting).toHaveBeenCalledWith(input);
    expect(result).toBe(setting);
  });
});
