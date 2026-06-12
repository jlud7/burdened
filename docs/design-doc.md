# Game Design Document: Project "Burdened" (Working Title)

> A 2D card rogue-like deckbuilder. Streamlined GDD summarizing all core mechanics and systems.

## 1. Core Concept & Genre

A 2D roguelite deckbuilder crossed with an extraction survival game. The player manages a grid-based inventory where equipped items dictate their combat deck, and hoarding valuable loot actively pollutes their draw pile with "encumbrance" cards. The goal is to survive expeditions, gather resources, and extract back to the village before nightfall brings overwhelming danger.

## 2. The Core Gameplay Loop

1. **Prepare**: Equip items in a grid inventory at the Hub Village to build your deck. Hire familiars/sidekicks.
2. **Deploy**: Select a destination on the Macro World Map (e.g., Forest for wood, Dungeon for gold).
3. **Explore**: Traverse procedurally generated nodes (combats, events, gathering).
4. **Extract**: Turn around and backtrack through the nodes to return home.
5. **Survive**: Manage the Day/Night cycle and evolving nodes on the return trip.
6. **Upgrade**: Use extracted loot to upgrade the Hub Village and unlock new gear/meta-progression.

## 3. Key Mechanics

### Classless, Inventory-Based Deckbuilding

- **The Grid**: Characters do not have innate classes. The deck is built entirely by arranging items in a Diablo-style grid inventory.
- **Badges & Runestones**: Equipping a "Hunter Badge" changes base attacks to arrows. Equipping a "Fire Runestone" adds a Fireball card to the deck.
- **Dual-Purpose Items**: Utility items have combat functions. A Torch lights the map, but can be played as a "Searing Strike" card (which breaks the torch and hinders future map travel).

### The Encumbrance System (Risk vs. Reward)

- **Loot is a Burden**: Picking up treasure (like a "Heavy Chalice" or "Small Chest") takes up grid space and adds useless, unplayable "Junk" cards into your combat deck.
- **Deck Bloat**: The greedier the player gets on an expedition, the less likely they are to draw their essential survival and attack cards in combat.

### The Party Composition (The 2/3 – 1/3 Rule)

- **The Main Character**: Provides the core of the deck (roughly 2/3 of the cards) based on their equipped weapons and badges.
- **The Sidekick/Familiar**: Provides the remaining 1/3 of the deck with basic utility cards (e.g., a Cleric brings minor heals, a Soldier brings basic blocks).
- **The Pack Mule**: Players can hire a defenseless villager to carry extra loot, at the cost of polluting the deck with terrible cards like "Cower in Fear."

## 4. Map Traversal & World Systems

### Expedition Node System

- **Macro vs. Micro**: Players choose a macro-destination (from low-stakes resource fields to high-stakes dungeons), which generates a specific micro-path of nodes.
- **Backtracking & Evolving Nodes**: Players must walk back the way they came to extract. Cleared nodes have a percentage chance to "corrupt" into Elite battles or surprise bosses on the return trip.
- **The Enrage Timer (Day/Night)**: Taking too many actions pushes the clock toward Night. Nighttime spawns significantly harder enemies, punishing players who overstay their welcome.

## 5. Meta-Progression & Town Defense

### The Hub Village

- Extracted resources are used to build and upgrade structures in the village, unlocking new items, cards, and passive buffs.

### Surprise Village Raids

- **The Raid Event**: Occasionally, returning to the village triggers a 3-wave tower defense "Raid" against a massive threat (e.g., a Giant Skeleton).
- **Town Deck**: During a raid, the player's standard deck is supplemented by powerful "Town Cards" (e.g., Catapult, Burning Pitch, Militia) tied directly to their meta-progression upgrades.
- **Soft-Fail Punishment**: Failing a raid does not erase permanent upgrades. Instead, it "ruins" buildings, requiring the player to spend resources (wood/stone) to repair them before they can be used again.

## 6. Visual Presentation

- **Art Style**: Clean, minimalist 2D vector art with a heavily textured/grainy overlay and a muted, earthy color palette.
- **Perspective**: 2D side-scroller/flat perspective for both combat and village scenes. Minimalist animation (heavily reliant on code-driven "juice", tweens, and VFX over frame-by-frame drawing).
