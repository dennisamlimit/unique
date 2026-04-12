import { getPool } from "../../infrastructure/database.js";
import { DEFAULT_SPAWN, PlayerMp, setHeading, vector3 } from "../../runtime/helpers.js";
import type { SpawnPointDto } from "./api/spawn-dtos.js";

export class SpawnService {
  async getSpawn(): Promise<SpawnPointDto> {
    const result = await getPool().query(
      "SELECT pos_x, pos_y, pos_z, rot_z, dimension FROM server_spawn WHERE spawn_key = 'default' LIMIT 1;"
    );

    const row = result.rows[0];
    if (!row) {
      return { ...DEFAULT_SPAWN };
    }

    return {
      x: Number(row.pos_x),
      y: Number(row.pos_y),
      z: Number(row.pos_z),
      rotZ: Number(row.rot_z),
      dimension: Number(row.dimension)
    };
  }

  async saveFromPlayer(player: PlayerMp): Promise<SpawnPointDto> {
    const spawn = {
      x: Number(player.position.x),
      y: Number(player.position.y),
      z: Number(player.position.z),
      rotZ: Number(player.heading ?? player.rotation?.z ?? 0),
      dimension: Number(player.dimension ?? 0)
    };

    await getPool().query(
      `
        INSERT INTO server_spawn (spawn_key, pos_x, pos_y, pos_z, rot_z, dimension)
        VALUES ('default', $1, $2, $3, $4, $5)
        ON CONFLICT (spawn_key)
        DO UPDATE SET pos_x = EXCLUDED.pos_x, pos_y = EXCLUDED.pos_y, pos_z = EXCLUDED.pos_z, rot_z = EXCLUDED.rot_z, dimension = EXCLUDED.dimension;
      `,
      [spawn.x, spawn.y, spawn.z, spawn.rotZ, spawn.dimension]
    );

    return spawn;
  }

  async apply(player: PlayerMp) {
    const spawn = await this.getSpawn();
    player.dimension = spawn.dimension;
    player.position = vector3(spawn.x, spawn.y, spawn.z);
    setHeading(player, spawn.rotZ);
  }
}
