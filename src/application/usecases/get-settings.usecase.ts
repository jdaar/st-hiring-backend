import { GetSettingsResponse, ResponseBody, SettingsRepository } from '@st-hiring/shared';

export const createGetSettingsUseCase =
  ({ settingsRepository }: { settingsRepository: SettingsRepository }) =>
  (): Promise<ResponseBody<GetSettingsResponse>> =>
    settingsRepository.getSettings();
