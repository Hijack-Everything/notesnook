/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Cipher, SerializedKey } from "@notesnook/crypto";
import Database from "..";
import { CURRENT_DATABASE_VERSION, EV, EVENTS } from "../../common";
import { logger } from "../../logger";
import {
  SyncItem,
  SyncTransferItem,
  SYNC_COLLECTIONS_MAP,
  SYNC_ITEM_TYPES
} from "./types";
import { Item, MaybeDeletedItem } from "../../types";

class Collector {
  logger = logger.scope("SyncCollector");
  constructor(private readonly db: Database) {}

  async *collect(
    chunkSize: number,
    lastSyncedTimestamp: number,
    isForceSync = false
  ): AsyncGenerator<SyncTransferItem, void, unknown> {
    const key = await this.db.user.getEncryptionKey();
    if (!key || !key.key || !key.salt) {
      EV.publish(EVENTS.userSessionExpired);
      throw new Error("User encryption key not generated. Please relogin.");
    }

    for (const itemType of SYNC_ITEM_TYPES) {
      const collectionKey = SYNC_COLLECTIONS_MAP[itemType];
      const collection = this.db[collectionKey].collection;
      for await (const chunk of collection.unsynced(
        isForceSync ? 0 : lastSyncedTimestamp,
        chunkSize
      )) {
        const items = await this.prepareChunk(chunk, key);
        if (!items) continue;
        yield { items, type: itemType };
      }
    }
  }

  async prepareChunk(chunk: MaybeDeletedItem<Item>[], key: SerializedKey) {
    const { ids, items } = filterSyncableItems(chunk);
    if (!ids.length) return;
    const ciphers = await this.db.storage().encryptMulti(key, items);
    return toPushItem(ids, ciphers);
  }
}
export default Collector;

function toPushItem(ids: string[], ciphers: Cipher<"base64">[]) {
  if (ids.length !== ciphers.length)
    throw new Error("ids.length must be equal to ciphers.length");

  const items: SyncItem[] = [];
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i];
    const cipher = ciphers[i];
    items.push({ ...cipher, v: CURRENT_DATABASE_VERSION, id });
  }
  return items;
}

function filterSyncableItems(items: MaybeDeletedItem<Item>[]): {
  items: string[];
  ids: string[];
} {
  if (!items || !items.length) return { items: [], ids: [] };

  const ids = [];
  const syncableItems = [];
  for (const item of items) {
    // const isSyncable = !item.synced || isForceSync;

    // synced is a local only property. we don't want to sync it.
    delete item.synced;

    ids.push(item.id);
    syncableItems.push(JSON.stringify(item));
  }
  return { items: syncableItems, ids };
}