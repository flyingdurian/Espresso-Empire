# Tower Café · M0
A web-first, deterministic engineering fixture for Via Bianca. The section drawing is a diagnostic diagram. G0 production art awaits the owner's separate visual approval.

## Run
Use Node 24 and npm. Run `npm ci`, then `npm run dev`. Open the local URL Vite prints. For a static deployment run `npm run build` and serve `dist/`. Run the regression suite with `npm test`.

`npm run headless -- 1989 100` prints the complete canonical snapshot, ordered events and digest at the browser's reference checkpoint. The two positional arguments are the seed and tick. `node scripts/checkpoint.ts` deliberately regenerates the stored reference after a reviewed fixture change.

## Inspect
The fixture opens paused. Step to advance one 100 ms tick with the supplied data, or Run to watch the 24-second trace. Pause and Step, inspect any floor or follow the cart, switch between orders/stations/cart, and open the event log. Framing displays the 4:3 design surface and central 16:9 gameplay area. Enter a seed and Restart to use it. Replay verification runs the reference seed in isolation and compares it to the saved headless digest. Switching apps pauses playback.

## Ownership
- `public/data/` contains tuning, building graph, menu definitions, customer archetypes, fixture data and their JSON schemas. Station values and order mix in this build are diagnostic samples.
- `src/content/` validates input in both environments, including references across files.
- `src/sim/` owns all deterministic state. Time is measured in integer ticks. Each tick updates outstanding timers, executes recorded commands in data order, then emits the trace-complete event if due. Seeded randomness selects the marked fixture order. Renderers consume copied snapshots.
- `src/view/` owns the technical elevation and PixiJS rendering, with a Canvas fallback. `src/debug/` owns the inspector. No service HUD uses these omniscient views.
- `scripts/` contains the headless entry point, `tests/` contains the regression suite.

## Milestone boundary
Position changes are fixture commands. Timers demonstrate instrumentation. Campaign service, scoring, recipes, cart interactions and travel have distinct M1–M3 milestones. The M0 inspector exposes positions, order timers, station transitions, cart occupancy and history. Service/expiry counts, mean patience at serve, trash and travel metrics will be recorded from actual gameplay transitions when those exist.

## Working rulings for M1 review
Four physical seats may host successive customers, each with one order. For service-fixture tests use a preloaded cart. Begin in the Back Bar with the first Lounge section active. Use customer pose and a bar beneath the bubble with the same logical thresholds. These are design decisions to evaluate in M1. The omniscient elevation and fixture timeline belong exclusively to debug.

## Painted tableside service review
The normal browser entry now opens the playable Via Bianca review shift. The original diagnostic studio is available at `/studio.html`. Run and test commands above apply to both.

The first pull or plated snack starts the review shift. A short pull yields ristretto. A standard pull yields espresso, which takes hot water for an Americano, milk for a latte, or chilled base for a coffee frappé. Adding foam to a latte makes a cappuccino. Foam uses the milk portion already committed. Tap the active item to park it, tap a full well to select it, then tap any matching guest. Two wells can hold items alongside the active cradle. The pantry stocks wrapped cookies and plain cornetti. The oven prepares warm cornetti. Tap Recipes to pause and consult the coffee menu.

The cart begins loaded. The Back Bar runs independent grinder, steamer and oven batches. Tap again to load a ready batch, or tap an amber pantry compartment for an immediate refill. Open orders lose patience during travel. Unrevealed orders open when the cart is back in the Lounge. Complete seven orders in the green zone to earn three stars in this eight-order playtest.

The G1 review is in **Menu → Art comparison**. It displays the approved G0 artwork and the suspended live stage, with the palette and 48 px order icon samples. All room, customer, machine and inventory artwork is raster. The PixiJS sprite tree and Canvas fallback share positions, textures and action state. The first review has four character identities, eight orders and one service section. Full customer patience poses, station animation sets, other floors, upgrades and campaign content remain later work.

`src/service/shift.ts` runs without a browser or renderer. The active shift uses `public/data/lounge-shift.json` with global tuning from `public/data/tuning.json`. Replay tests cover complete service and expiry paths, one-cup state, supply consumption, wrong targets, mixed orders, capacity, hold expiry and travel. The live inspector has per-order patience, supply levels, station timers, seed, floor time, rides, waste, mean patience and cart occupancy.

## Via Bianca counter playtest · dine-in and takeaway
Open the home page in a landscape browser. Door and Window share an espresso workbench. Kitchen turns to the rear equipment wall. The last counter end is your return point. Recipes pauses service. Pause → Inspector shows the fixed-step simulation, stations and guests. Pause → Show equipment labels enables persistent touch labels.

Start a pull and select the serving cup when ready. A second saucer can hold another drink. Paper and clear takeaway cups come in Small, Medium and Large. A finished shot transfers when a compatible cup is taken or a staged cup is tapped. Hot takeaway drinks use paper, cold drinks use clear plastic and both need a lid. Kitchen food travels on two towel spaces. Select food and tap the paper bag for a takeaway guest. Each matching item crosses off separately. The guest pays once, on completion.

The eight-ticket shift covers eight drinks, four foods, concurrent appliance cycles and both service styles. Tuning and orders live in public/data/counter.json. src/counter/bench.ts contains no renderer or browser dependencies. Latest browser screenshots are review/workbench7-counter.jpg and review/workbench7-kitchen.jpg. Open the front drawer or kitchen cupboard for takeaway reserves. Load returned ceramics from the kitchen tub, run the dishwasher, and unload clean cups to the front racks. Drag prepared items to either lined bin. The art and difficulty of this shift await owner playtest. The earlier cart and debug studio are at /cart.html and /studio.html.

The espresso basket starts with six pulls. Grind ahead, then release the spent handle, knock out the puck, fill at the grinder outlet and lock the handle into the group. Refill the empty hopper from the bean cabinet. Tap or drag to work. Drag a clean unused cup back to its own channel or an untouched brownie back to its source. The compact kitchen keeps its upper press cabinet and right shutter available for future equipment.
# Espresso-Empire
