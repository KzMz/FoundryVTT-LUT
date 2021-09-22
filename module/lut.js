/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { LUTActor } from "./actor.js";
import { LUTItem } from "./item.js";
import { LUTItemSheet } from "./item-sheet.js";
import { LUTActorSheet } from "./actor-sheet.js";
import { createLUTMacro, rollItemMacro, rollAttributeMacro } from "./macro.js";

import * as chat from "./chat.js";
import { _getInitiativeFormula } from "./combat.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
    console.log(`Initializing Ultima Torcia System`);

    game.ultimatorcia = {
        LUTActor,
        LUTItem,
        rollItemMacro,
        rollAttributeMacro
    };

    CONFIG.LUT = {};
    CONFIG.LUT.attributes = LUTActor.lutAttributeNames();

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
	    formula: "1d20",
        decimals: 2
    };
	Combat.prototype._getInitiativeFormula = _getInitiativeFormula;

    // Define custom Entity classes
    CONFIG.Actor.entityClass = LUTActor;
    CONFIG.Item.entityClass = LUTItem;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("ultima-torcia", LUTActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("ultima-torcia", LUTItemSheet, {makeDefault: true});

    // Register system settings
    game.settings.register("ultima-torcia", "macroShorthand", {
        name: "Shortened Macro Syntax",
        hint: "Enable a shortened macro syntax which allows referencing attributes directly, for example @str instead of @attributes.str.value. Disable this setting if you need the ability to reference the full attribute model, for example @attributes.str.label.",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });
});

Hooks.on("renderChatMessage", (app, html, data) => {
    chat.displayChatActionButtons(app, html, data);
});

Hooks.on("renderChatLog", (app, html, data) => {
    LUTItem.chatListeners(html);
    LUTActor.chatListeners(html);
});

Hooks.once("ready", async function () {
   Hooks.on("hotbarDrop", (bar, data, slot) => createLUTMacro(data, slot));

   return game.user.character.createAttributeMacros();
});

Hooks.on("createToken", (scene, token, user) => {
    const actor = game.actors.get(token.actorId);

    let light = 0;
    let duration = 0;
    for (let item of actor.items) {
       if (item.type === "light" && item.data.data.container === "equipped") {
           light = item.data.data.range;
           duration = item.data.data.duration;
       }
    }

    if (game.modules.get("about-time").active === true) {
        // About Time
        ((backup) => {
            game.Gametime.doIn({minutes: Math.floor(3 * duration / 4)}, () => {
                ChatMessage.create({
                    user: game.user._id,
                    content: "Il fuoco si sta indebolendo...",
                    speaker: speaker
                }, {});
            });
        })(Object.assign({}, token.data));

        ((backup) => {
            game.Gametime.doIn({minutes:duration}, () => {
                ChatMessage.create({
                    user: game.user._id,
                    content: "Le fiamme si spengono, lasciandoti nel buio più profondo.",
                    speaker: speaker
                }, {});
                actor.token.update({
                    vision: true,
                    dimSight: backup.dimSight,
                    brightSight: backup.brightSight,
                    dimLight: backup.dimLight,
                    brightLight:  backup.brightLight,
                    lightAngle: backup.lightAngle,
                    lockRotation: backup.lockRotation
                });
            });
        })(Object.assign({}, token.data));
    }

    token.brightLight = light;
    token.brightSight = 0;
});