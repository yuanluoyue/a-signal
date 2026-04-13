import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_PROVIDER } from './db.constants.js';
import * as schema from './schema.js';

@Injectable()
export class DbService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    public db: NodePgDatabase<typeof schema>,
  ) {}
}
