/**
 * @jest-environment jsdom
 */
import { EventBus } from "../src/core/EventBus";
import { AutoUpgradeEvent } from "../src/client/InputHandler";
import { ClientGameRunner } from "../src/client/ClientGameRunner";
import { UnitType } from "../src/core/game/Game";
import { SendUpgradeStructureIntentEvent } from "../src/client/Transport";

// Focus: verify autoUpgradeEvent emits correct number of SendUpgradeStructureIntentEvent instances
// for multi-level (shift) upgrades based on player gold affordability.

class MockPlayerView {
  private readonly _gold: bigint;
  private readonly _actions: any;
  constructor(gold: bigint, actions: any) {
    this._gold = gold;
    this._actions = actions;
  }
  gold() { return this._gold; }
  troops() { return 0; }
  actions(_: any) { return Promise.resolve(this._actions); }
}

const mockRenderer: any = {
  uiState: { attackRatio: 1 },
  initialize: jest.fn(),
  tick: jest.fn(),
  transformHandler: {
    screenToWorldCoordinates: (x: number, y: number) => ({ x: Math.floor(x / 10), y: Math.floor(y / 10) }),
  },
};

const makeGameView = (unitId: number, unitType: UnitType, unitLevel: number) => ({
  isValidCoord: () => true,
  ref: (x: number, y: number) => ({ x, y }),
  inSpawnPhase: () => false,
  manhattanDist: () => 0,
  units: () => [{
    id: () => unitId,
    level: () => unitLevel,
    tile: () => ({ x: 0, y: 0 }),
    owner: () => ({ id: () => 1, isPlayer: () => true }),
  }],
  playerByClientID: () => new MockPlayerView(0n, {}),
  owner: () => ({ id: () => 1, isPlayer: () => true }),
  setFocusedPlayer: jest.fn(),
  isLand: () => true,
  nearbyUnits: () => [],
  euclideanDistSquared: () => 0,
} as any);

const buildActions = (unitId: number, cost: bigint, type: UnitType) => ({
  canAttack: false,
  buildableUnits: [{ canUpgrade: unitId, cost, type }],
});

describe("ClientGameRunner autoUpgradeEvent", () => {
  const lobby: any = {
    clientID: 1,
    gameID: 1,
    playerName: "p",
    serverConfig: {},
    gameStartInfo: { config: { difficulty: 0, gameMap: "" }, gameID: 1, players: [] },
    flag: "f",
    pattern: undefined,
    token: "tkn",
  };
  const transport: any = { joinGame: jest.fn(), connect: jest.fn(), leaveGame: jest.fn(), turnComplete: jest.fn(), isLocal: true, reconnect: jest.fn() };
  const worker: any = { start: jest.fn(), sendTurn: jest.fn(), cleanup: jest.fn(), sendHeartbeat: jest.fn() };
  const input: any = { initialize: jest.fn() };

  test("shift middle click (levels=10) with enough gold emits 10 upgrade intents", async () => {
    const eventBus = new EventBus();
    const unitId = 42;
    const costPerLevel = 10n;
    const gold = 200n; // sufficient for >10
    const actions = buildActions(unitId, costPerLevel, UnitType.House);
    const gameView = makeGameView(unitId, UnitType.House, 1);
    gameView.playerByClientID = () => new MockPlayerView(gold, actions);

    const emitted: SendUpgradeStructureIntentEvent[] = [];
    eventBus.on(SendUpgradeStructureIntentEvent, (e) => emitted.push(e));

    const runner = new ClientGameRunner(lobby, eventBus, mockRenderer, input, transport, worker, gameView);
    runner.start();

    eventBus.emit(new AutoUpgradeEvent(50, 50, 10));
    await new Promise((r) => setTimeout(r, 0));

    expect(emitted).toHaveLength(10);
    emitted.forEach((e) => expect(e.unitId).toBe(unitId));
  });

  test("shift middle click (levels=10) with gold for only 7 emits 7 upgrade intents", async () => {
    const eventBus = new EventBus();
    const unitId = 77;
    const costPerLevel = 10n;
    const gold = 70n; // only 7 affordable
    const actions = buildActions(unitId, costPerLevel, UnitType.House);
    const gameView = makeGameView(unitId, UnitType.House, 2);
    gameView.playerByClientID = () => new MockPlayerView(gold, actions);

    const emitted: SendUpgradeStructureIntentEvent[] = [];
    eventBus.on(SendUpgradeStructureIntentEvent, (e) => emitted.push(e));

    const runner = new ClientGameRunner(lobby, eventBus, mockRenderer, input, transport, worker, gameView);
    runner.start();

    eventBus.emit(new AutoUpgradeEvent(100, 100, 10));
    await new Promise((r) => setTimeout(r, 0));

    expect(emitted).toHaveLength(7);
    emitted.forEach((e) => expect(e.unitId).toBe(unitId));
  });

  test("fallback: requesting 10 with insufficient gold for even 1 still emits 1 attempt", async () => {
    const eventBus = new EventBus();
    const unitId = 5;
    const costPerLevel = 10n;
    const gold = 5n; // cannot afford a single level => fallback path
    const actions = buildActions(unitId, costPerLevel, UnitType.House);
    const gameView = makeGameView(unitId, UnitType.House, 1);
    gameView.playerByClientID = () => new MockPlayerView(gold, actions);

    const emitted: SendUpgradeStructureIntentEvent[] = [];
    eventBus.on(SendUpgradeStructureIntentEvent, (e) => emitted.push(e));

    const runner = new ClientGameRunner(lobby, eventBus, mockRenderer, input, transport, worker, gameView);
    runner.start();

    eventBus.emit(new AutoUpgradeEvent(25, 25, 10));
    await new Promise((r) => setTimeout(r, 0));

    expect(emitted).toHaveLength(1);
    expect(emitted[0].unitId).toBe(unitId);
  });
});
