import { RelayPool } from '../infrastructure/relays/pool.ts';
import { RelayInformation } from '../infrastructure/relays/information.ts';
import { PublicService } from '../public/service.ts';
export function createPublicService(): PublicService { return new PublicService(new RelayPool(), new RelayInformation()); }
