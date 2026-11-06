import { describe, expect, it, vi } from 'vitest';
import { GetSettingsEndpoint, UpsertSettingEndpoint } from '@st-hiring/shared';
import { UseCases } from '../../application/usecases';
import { createRoute } from '../create-route';
import { createSettingsRoutes } from './settings.routes';

vi.mock('../create-route', () => ({ createRoute: vi.fn((contract, handler) => ({ contract, handler })) }));

const setting = { id: 'a b', value: true, version: 1, createdAt: new Date(), updatedAt: new Date() };

const createResponse = () => {
  const res = { json: vi.fn(), status: vi.fn(), location: vi.fn() };
  res.status.mockReturnValue(res);
  res.location.mockReturnValue(res);
  return res;
};

const handlerFor = (useCases: Partial<UseCases>, index: number) => {
  createSettingsRoutes(useCases as UseCases);
  return vi.mocked(createRoute).mock.calls[index][1];
};

describe('createSettingsRoutes', () => {
  it('serves the get and upsert settings endpoints', () => {
    // Arrange
    const useCases = { getSettings: vi.fn(), upsertSetting: vi.fn() } as unknown as UseCases;

    // Act
    const routes = createSettingsRoutes(useCases);

    // Assert
    expect(routes).toHaveLength(2);
    expect(createRoute).toHaveBeenNthCalledWith(1, GetSettingsEndpoint, expect.any(Function));
    expect(createRoute).toHaveBeenNthCalledWith(2, UpsertSettingEndpoint, expect.any(Function));
  });

  it('answers with every setting', async () => {
    // Arrange
    const getSettings = vi.fn().mockResolvedValue([setting]);
    const handler = handlerFor({ getSettings }, 0);
    const res = createResponse();

    // Act
    await handler({} as never, res as never);

    // Assert
    expect(getSettings).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith({ isSuccess: true, body: [setting] });
  });

  it('answers an update with the updated setting', async () => {
    // Arrange
    const upsertSetting = vi.fn().mockResolvedValue(setting);
    const handler = handlerFor({ upsertSetting }, 1);
    const req = { params: { id: setting.id }, body: { value: false, version: 1 } };
    const res = createResponse();

    // Act
    await handler(req as never, res as never);

    // Assert
    expect(upsertSetting).toHaveBeenCalledWith({ id: setting.id, value: false, version: 1 });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ isSuccess: true, body: setting });
  });

  it('answers a creation with 201 and the location of the setting', async () => {
    // Arrange
    const upsertSetting = vi.fn().mockResolvedValue(setting);
    const handler = handlerFor({ upsertSetting }, 1);
    const req = { params: { id: setting.id }, body: { value: true } };
    const res = createResponse();

    // Act
    await handler(req as never, res as never);

    // Assert
    expect(upsertSetting).toHaveBeenCalledWith({ id: setting.id, value: true });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.location).toHaveBeenCalledWith('/v1/settings/a%20b');
    expect(res.json).toHaveBeenCalledWith({ isSuccess: true, body: setting });
  });
});
