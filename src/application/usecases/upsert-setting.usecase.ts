import { ResponseBody, SettingsRepository, UpsertSettingInput, UpsertSettingResponse } from '@st-hiring/shared';

export const createUpsertSettingUseCase =
  ({ settingsRepository }: { settingsRepository: SettingsRepository }) =>
  (input: UpsertSettingInput): Promise<ResponseBody<UpsertSettingResponse>> =>
    settingsRepository.upsertSetting(input);
