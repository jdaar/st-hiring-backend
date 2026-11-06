import { describe, expect, it, vi } from 'vitest';
import { UseCases } from '../../application/usecases';
import { Route, createRouter } from '../create-route';
import { createEventsRoutes } from './events.routes';
import { createSettingsRoutes } from './settings.routes';
import { createV1Router } from '.';

vi.mock('../create-route', () => ({ createRouter: vi.fn() }));
vi.mock('./events.routes', () => ({ createEventsRoutes: vi.fn() }));
vi.mock('./settings.routes', () => ({ createSettingsRoutes: vi.fn() }));

const route = (path: string): Route => ({ method: 'get', path, handlers: [] });

describe('createV1Router', () => {
  it('builds one router from the events and settings routes', () => {
    // Arrange
    const useCases = {} as UseCases;
    const router = vi.fn();
    vi.mocked(createEventsRoutes).mockReturnValue([route('/events')]);
    vi.mocked(createSettingsRoutes).mockReturnValue([route('/settings')]);
    vi.mocked(createRouter).mockReturnValue(router as never);

    // Act
    const result = createV1Router(useCases);

    // Assert
    expect(createEventsRoutes).toHaveBeenCalledWith(useCases);
    expect(createSettingsRoutes).toHaveBeenCalledWith(useCases);
    expect(createRouter).toHaveBeenCalledWith([route('/events'), route('/settings')]);
    expect(result).toBe(router);
  });
});
