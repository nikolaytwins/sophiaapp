/**
 * After Dark: только astro API (skills/astro-core/scripts/astro_api_server.py).
 * Мок-репозиторий удалён — при недоступном API показывается ошибка в UI.
 */
export * from './repository.types';

import type { PrivateModuleRepository } from './repository.types';
import { remotePrivateRepository } from './remote-repository';

export const privateRepos: PrivateModuleRepository = remotePrivateRepository;
