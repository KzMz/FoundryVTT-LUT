/**
 * Extend the basic ActorSheet
 * @extends {ActorSheet}
 */
import {LUTActor} from "./actor.js";

export class LUTActorSheet extends ActorSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
        classes: ["lut", "sheet", "actor"],
        width: 820,
        height: 600,
        tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
        dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/ultima-torcia/templates/actor/";
    return `${path}/${this.actor.data.type}.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    this._prepareData(data);
    return data;
  }

  _prepareData(sheetData) {
    if (this.actor.data.type === "character") {
      this._prepareCharacterData(sheetData);
    } else {
      this._prepareNpcData(sheetData);
    }
  }

  _prepareCharacterData(sheetData) {
    const actorData = sheetData.actor;

    const features = [];
    const lutClass = [];
    const race = [];
    const guild = [];
    const racialFeatures = [];
    const backpack = [];
    const nearhand = [];
    const mantle = [];
    const bandoleer = [];
    const worn = [];
    const equipped = [];

    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;

      if (i.type === "race") {
        race.push(i);
      }
      else if (i.type === "role") {
        lutClass.push(i);
      }
      else if (i.type === "guild") {
        guild.push(i);
      }
      else if (i.type === "passivefeature" || i.type === "activefeature" || i.type === "spellfeature") {
        features.push(i);
      }
      else if (i.type === "generic" || i.type === "weapon" || i.type === "spellscroll" || i.type === "potion" || i.type === "light") {
        if (item.container === "") {
          item.container = "backpack";
        }
      }

      i.canBeEquipped = i.type === "weapon" || i.type === "light";
      if (i.type === "potion" || i.type === "spellscroll" || i.type === "weapon") {
        i.hasRoll = true;
      }

      if (item.container === "nearhand") {
        nearhand.push(i);
      }
      else if (item.container === "mantle") {
        mantle.push(i);
      }
      else if (item.container === "bandoleer") {
        bandoleer.push(i);
      }
      else if (item.container === "backpack") {
        backpack.push(i);
      }
      else if (item.container === "worn") {
        worn.push(i);
      }
      else if (item.container === "equipped") {
        equipped.push(i);
      }
    }

    for (let i of actorData.data.inventory.equipped.weapons) {
      i.img = i.img || DEFAULT_TOKEN;
    }
    if (actorData.data.inventory.equipped.armor) {
      actorData.data.inventory.equipped.armor.img = actorData.data.inventory.equipped.armor.img || DEFAULT_TOKEN;
    }
    if (actorData.data.inventory.equipped.shield) {
      actorData.data.inventory.equipped.shield.img = actorData.data.inventory.equipped.shield.img || DEFAULT_TOKEN;
    }

    actorData.backpack = backpack;
    actorData.bandoleer = bandoleer;
    actorData.mantle = mantle;
    actorData.nearhand = nearhand;
    actorData.worn = worn;
    actorData.equipped = equipped;

    actorData.mantlesize = actorData.data.inventory.mantlesize.value;
    actorData.bandoleersize = actorData.data.inventory.bandoleersize.value;

    if (race.length > 0) actorData.race = race[0];
    if (lutClass.length > 0) actorData.role = lutClass[0];
    if (guild.length > 0) actorData.guild = guild[0];

    actorData.features = features;

    const prevHp = actorData.data.health.max;
    const prevMp = actorData.data.mana.max;

    let baseHp = 0;
    let baseMp = 0;
    if (actorData.race) {
      baseHp = Number(actorData.race.data.healthbase);
      baseMp = Number(actorData.race.data.manabase);

      actorData.data.attributes.agility.modifier = Number(actorData.race.data.attributes.agilitymod);
      actorData.data.attributes.courage.modifier = Number(actorData.race.data.attributes.couragemod);
      actorData.data.attributes.strength.modifier = Number(actorData.race.data.attributes.strengthmod);
      actorData.data.attributes.intelligence.modifier = Number(actorData.race.data.attributes.intelligencemod);
      actorData.data.attributes.magic.modifier = Number(actorData.race.data.attributes.magicmod);
      actorData.data.attributes.dexterity.modifier = Number(actorData.race.data.attributes.dexteritymod);
      actorData.data.attributes.perception.modifier = Number(actorData.race.data.attributes.perceptionmod);
      actorData.data.attributes.sociality.modifier = Number(actorData.race.data.attributes.socialitymod);

      const folder = game.folders.find(f => f.name === actorData.race.name);
      if (folder) {
        for (let i of folder.entities) {
          if (i.entity !== "Item") continue;

          if (i.data.type === "passivefeature") {
            racialFeatures.push(i);
          }
        }
      }
    }

    actorData.racialfeatures = racialFeatures;

    let modHp = 0;
    let modMp = 0;
    if (actorData.role) {
      modHp = Number(actorData.role.data.healthmod);
      modMp = Number(actorData.role.data.manamod);

      actorData.data.attributes.agility.dice = Number(actorData.role.data.attributes.agility);
      actorData.data.attributes.courage.dice = Number(actorData.role.data.attributes.courage);
      actorData.data.attributes.strength.dice = Number(actorData.role.data.attributes.strength);
      actorData.data.attributes.intelligence.dice = Number(actorData.role.data.attributes.intelligence);
      actorData.data.attributes.magic.dice = Number(actorData.role.data.attributes.magic);
      actorData.data.attributes.dexterity.dice = Number(actorData.role.data.attributes.dexterity);
      actorData.data.attributes.perception.dice = Number(actorData.role.data.attributes.perception);
      actorData.data.attributes.sociality.dice = Number(actorData.role.data.attributes.sociality);
    }

    let maxHp = baseHp + modHp + Number(actorData.data.modifiers.health);
    let maxMp = baseMp + modMp + Number(actorData.data.modifiers.mana);
    for (let f of features) {
      if (f.type === "passivefeature") {
        maxHp += Number(f.data.healthmod);
        maxMp += Number(f.data.manamod);

        actorData.data.attributes.agility.modifier += Number(f.data.attributes.agility.modifier);
        actorData.data.attributes.courage.modifier += Number(f.data.attributes.courage.modifier);
        actorData.data.attributes.strength.modifier += Number(f.data.attributes.strength.modifier);
        actorData.data.attributes.intelligence.modifier += Number(f.data.attributes.intelligence.modifier);
        actorData.data.attributes.magic.modifier += Number(f.data.attributes.magic.modifier);
        actorData.data.attributes.dexterity.modifier += Number(f.data.attributes.dexterity.modifier);
        actorData.data.attributes.perception.modifier += Number(f.data.attributes.perception.modifier);
        actorData.data.attributes.sociality.modifier += Number(f.data.attributes.sociality.modifier);

        actorData.data.attributes.agility.dice += Number(f.data.attributes.agility.dice);
        actorData.data.attributes.courage.dice += Number(f.data.attributes.courage.dice);
        actorData.data.attributes.strength.dice += Number(f.data.attributes.strength.dice);
        actorData.data.attributes.intelligence.dice += Number(f.data.attributes.intelligence.dice);
        actorData.data.attributes.magic.dice += Number(f.data.attributes.magic.dice);
        actorData.data.attributes.dexterity.dice += Number(f.data.attributes.dexterity.dice);
        actorData.data.attributes.perception.dice += Number(f.data.attributes.perception.dice);
        actorData.data.attributes.sociality.dice += Number(f.data.attributes.sociality.dice);
      }
    }

    if (actorData.data.inventory.equipped.armor) {
      const a = actorData.data.inventory.equipped.armor;

      actorData.data.attributes.agility.modifier += Number(a.data.attributes.agilitymod);
      actorData.data.attributes.courage.modifier += Number(a.data.attributes.couragemod);
      actorData.data.attributes.strength.modifier += Number(a.data.attributes.strengthmod);
      actorData.data.attributes.intelligence.modifier += Number(a.data.attributes.intelligencemod);
      actorData.data.attributes.magic.modifier += Number(a.data.attributes.magicmod);
      actorData.data.attributes.dexterity.modifier += Number(a.data.attributes.dexteritymod);
      actorData.data.attributes.perception.modifier += Number(a.data.attributes.perceptionmod);
      actorData.data.attributes.sociality.modifier += Number(a.data.attributes.socialitymod);
    }

    if (actorData.data.modifiers.attributes === undefined) {
      actorData.data.modifiers.attributes = {};
    }

    actorData.data.attributes.agility.modifier += Number(actorData.data.modifiers.attributes.agility);
    actorData.data.attributes.courage.modifier += Number(actorData.data.modifiers.attributes.courage);
    actorData.data.attributes.strength.modifier += Number(actorData.data.modifiers.attributes.strength);
    actorData.data.attributes.intelligence.modifier += Number(actorData.data.modifiers.attributes.intelligence);
    actorData.data.attributes.magic.modifier += Number(actorData.data.modifiers.attributes.magic);
    actorData.data.attributes.dexterity.modifier += Number(actorData.data.modifiers.attributes.dexterity);
    actorData.data.attributes.perception.modifier += Number(actorData.data.modifiers.attributes.perception);
    actorData.data.attributes.sociality.modifier += Number(actorData.data.modifiers.attributes.sociality);

    actorData.data.health.value += (maxHp - prevHp);
    actorData.data.mana.value += (maxMp - prevMp);

    actorData.data.health.max = maxHp;
    actorData.data.health.value = Math.max(actorData.data.health.min, Math.min(maxHp,actorData.data.health.value));

    actorData.data.mana.max = maxMp;
    actorData.data.mana.value = Math.max(actorData.data.mana.min, Math.min(maxMp,actorData.data.mana.value));

    actorData.data.survival.water.value = Math.max(actorData.data.survival.water.min, Math.min(actorData.data.survival.water.max, Number(actorData.data.survival.water.value)));
    actorData.data.survival.rations.value = Math.max(actorData.data.survival.rations.min, Math.min(actorData.data.survival.rations.max, Number(actorData.data.survival.rations.value)));
    actorData.data.survival.ammunition.value = Math.max(actorData.data.survival.ammunition.min, Math.min(actorData.data.survival.ammunition.max, Number(actorData.data.survival.ammunition.value)));

    let armorMod = actorData.data.armor.min;
    if (actorData.data.inventory.equipped.armor) {
      armorMod += actorData.data.inventory.equipped.armor.data.armormod;
    }
    if (actorData.data.inventory.equipped.shield) {
      armorMod += actorData.data.inventory.equipped.shield.data.armormod;
    }

    actorData.data.armor.value = armorMod;
    actorData.isGM = game.user.isGM;
  }

  _prepareNpcData(sheetData) {
    const actorData = sheetData.actor;

    for (let i of sheetData.items) {
      i.img = i.img || DEFAULT_TOKEN;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if (this.actor.owner) {
      let handler = ev => this._onDragItemStart(ev);

      html.find('li.item').each((i, li) => {
          if (li.classList.contains("item-header")) return;

          li.setAttribute("draggable", true);
          li.addEventListener("dragstart", handler, false);
      });
    }

    // Update Feature Item
    html.find('.feature-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Feature Item
    html.find('.feature-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    html.find('.item-worn').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));

      const prev = item.data.data.container;

      const update = {_id: item._id, "data.container": "worn"};
      this.actor.updateEmbeddedEntity("OwnedItem", update);
      li.slideUp(200, () => {
        this.render(false)

        const update = {};
        if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
          update[`data.inventory.${prev}size.value`] = parseInt(this.actor.data.data.inventory[`${prev}size`].value) + parseInt(item.data.data.slots);
        }

        this.actor.update(update);
      });
    });

    html.find('.item-backpack').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));

      const prev = item.data.data.container;

      if (item.type === "light") {
        this.actor.setupLight(item, false);
      }

      const update = {_id: item._id, "data.container": "backpack"};
      this.actor.updateEmbeddedEntity("OwnedItem", update);
      li.slideUp(200, () => {
        this.render(false)

        const update = {};
        if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
          update[`data.inventory.${prev}size.value`] = parseInt(this.actor.data.data.inventory[`${prev}size`].value) + parseInt(item.data.data.slots);
        }

        this.actor.update(update);
      });
    });

    html.find('.item-band').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));

      if (this.actor.data.data.inventory.bandoleersize.value >= item.data.data.slots) {
        const prev = item.data.data.container;

        if (item.type === "light") {
          this.actor.setupLight(item, false);
        }

        const update = {_id: item._id, "data.container": "bandoleer"};
        this.actor.updateEmbeddedEntity("OwnedItem", update);
        li.slideUp(200, () => {
          this.render(false)

          const update = {};
          update['data.inventory.bandoleersize.value'] = parseInt(this.actor.data.data.inventory.bandoleersize.value) - parseInt(item.data.data.slots);

          if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
            update[`data.inventory.${prev}size.value`] = parseInt(this.actor.data.data.inventory[`${prev}size`].value) + parseInt(item.data.data.slots);
          }

          this.actor.update(update);
        });
      }
      else {
        ui.notifications.error(`Bandoliera già piena!`);
      }
    });

    html.find('.item-hand').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));

      if (this.actor.data.data.inventory.nearhandsize.value >= item.data.data.slots) {
        const prev = item.data.data.container;

        if (item.type === "light") {
          this.actor.setupLight(item, false);
        }

        const update = {_id: item._id, "data.container": "nearhand"};
        this.actor.updateEmbeddedEntity("OwnedItem", update);
        li.slideUp(200, () => {
          this.render(false)

          const update = {};
          update['data.inventory.nearhandsize.value'] = parseInt(this.actor.data.data.inventory.nearhandsize.value) - parseInt(item.data.data.slots);

          if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
            update[`data.inventory.${prev}size.value`] = parseInt(this.actor.data.data.inventory[`${prev}size`].value) + parseInt(item.data.data.slots);
          }

          this.actor.update(update);
        });
      }
      else {
        ui.notifications.error(`Spazi a portata di mano già pieni!`);
      }
    });

    html.find('.item-mantle').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));

      if (this.actor.data.data.inventory.mantlesize.value >= item.data.data.slots) {
        const prev = item.data.data.container;

        if (item.type === "light") {
          this.actor.setupLight(item, false);
        }

        const update = {_id: item._id, "data.container": "mantle"};
        this.actor.updateEmbeddedEntity("OwnedItem", update);
        li.slideUp(200, () => {
          this.render(false)

          const update = {};
          update['data.inventory.mantlesize.value'] = parseInt(this.actor.data.data.inventory.mantlesize.value) - parseInt(item.data.data.slots);

          if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
            update[`data.inventory.${prev}size.value`] = parseInt(this.actor.data.data.inventory[`${prev}size`].value) + parseInt(item.data.data.slots);
          }

          this.actor.update(update);
        });
      }
      else {
        ui.notifications.error(`Mantello già pieno!`);
      }
    });

    html.find('.item-equip').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));

      const prev = item.data.data.container;

      this.actor.setupLight(item);

      const update = {_id: item._id, "data.container": "equipped"};
      this.actor.updateEmbeddedEntity("OwnedItem", update);
      li.slideUp(200, () => {
        this.render(false)

        const update = {};
        if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
          update[`data.inventory.${prev}size.value`] = parseInt(this.actor.data.data.inventory[`${prev}size`].value) + parseInt(item.data.data.slots);
        }

        this.actor.update(update);
      });
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");

      let prev = "";
      let item = game.items.get(li.data("itemId"));
      if (!item) {
        item = this.actor.items.get(li.data("itemId"));
      }

      if (item) {
        prev = item.data.data.container;

        if (item.type === "armor") {
          this.actor.data.data.inventory.equipped.armor = null;
        }
        else if (item.type === "shield") {
          this.actor.data.data.inventory.equipped.shield = null;
        }
        else if (item.type === "light") {
          this.actor.setupLight(item, false);
        }
      }

      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => {
        this.render(false);

        const update = {};
        if (prev !== "worn" && prev !== "equipped" && prev !== "backpack" && prev !== "" && this.actor.data.data.inventory[`${prev}size`] !== undefined) {
          update[`data.inventory.${prev}size.value`] = parseInt(this.actor.data.data.inventory[`${prev}size`].value) + parseInt(item.data.data.slots);
        }

        this.actor.update(update);
      });
    });

    html.find('.item-details-toggle').click(this._showItemDetails.bind(this));
    html.find(".rollable").click(this._onRoll.bind(this));
  }

  _showItemDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    if (toggler.hasClass('description-hidden')) {
      toggler.removeClass('description-hidden').addClass('description-shown');
      description.slideDown();
    } else {
      toggler.removeClass('description-shown').addClass('description-hidden');
      description.slideUp();
    }
  }

  _onRoll(event) {
    event.preventDefault();

    const rollable = $(event.currentTarget);
    if (rollable.hasClass('attribute')) {
      this._onRollAttribute(event);
    }
    else if (rollable.hasClass('specialty')) {
      this._onRollSpecialty(event);
    }
    else if (rollable.hasClass('recover')) {
      this._onRecoverRoll(event);
    }
    else if (rollable.hasClass('feature') || rollable.hasClass('weapon')) {
      const li = rollable.parent();

      let item = game.items.get(li.data("itemId"));
      if (!item) {
        item = this.actor.items.get(li.data("itemId"));
      }

      if (!item) return;
      item.roll();
    }
  }

  _onRollAttribute(event) {
    const rollable = $(event.currentTarget);
    //const specialty = rollable.siblings('input[type="checkbox"]');
    const diceNo = rollable.siblings('.attribute-value').find('.dice-attribute');
    // const modifier = rollable.siblings('.attribute-value').find('.dice-modifier');

    const attrName = diceNo.attr("name").split("data.attributes.")[1].split(".dice")[0];

    const actor = this.actor;

    if (attrName === "agility") {
      let d = new Dialog({
        title: "Tiro di Agilità?",
        content: "<p>Scegli il tipo di Tiro Agilità voluto.</p>",
        buttons: {
          generic: {
            icon: '',
            label: "Tiro Generico",
            callback: () => actor.attributeCheck("agility")
          },
          attack: {
            icon: '',
            label: "Tiro per Colpire in Corpo a Corpo",
            callback: () => actor.attributeCheck("agility", true)
          },
          defense: {
            icon: '',
            label: "Parata",
            callback: () => actor.attributeCheck("agility", true)
          }
        }
      });
      d.render(true);
    } else {
      actor.attributeCheck(attrName);
    }
  }

  _onRollSpecialty(event) {
    event.preventDefault();
    this.rollForSpecialty();
  }

  rollForSpecialty() {
    const actor = this.actor;

    const r = new Roll('1d8');
    const roll = r.roll();
    const dice = roll.dice;

    const result = dice[0].rolls[0].roll;
    const specialty = this.diceToSpecialty(result);

    const flavor = `${actor.name} tira per il Pregio... Ed esce ${specialty}!`;
    ChatMessage.create({
      content: flavor
    }, {});
  }

  _onRecoverRoll() {
    this.actor.consumeResources();
  }

  diceToSpecialty(roll) {
    const data = {};

    for (let a of LUTActor.lutAttributes()) {
      this.element.find('[name="data.attributes.' + a + '.specialty"').prop('checked', false);
      data[`data.attributes.${a}.specialty`] = false;
    }

    let specialty = '';
    switch (roll) {
      case 1:
        specialty = "Agilità";
        this.element.find('[name="data.attributes.agility.specialty"').prop('checked', true);
        data['data.attributes.agility.specialty'] = true;
        break;
      case 2:
        specialty = "Coraggio";
        this.element.find('[name="data.attributes.courage.specialty"').prop('checked', true);
        data['data.attributes.courage.specialty'] = true;
        break;
      case 3:
        specialty = "Forza";
        this.element.find('[name="data.attributes.strength.specialty"').prop('checked', true);
        data['data.attributes.strength.specialty'] = true;
        break;
      case 4:
        specialty = "Intelligenza";
        this.element.find('[name="data.attributes.intelligence.specialty"').prop('checked', true);
        data['data.attributes.intelligence.specialty'] = true;
        break;
      case 5:
        specialty = "Magia";
        this.element.find('[name="data.attributes.magic.specialty"').prop('checked', true);
        data['data.attributes.magic.specialty'] = true;
        break;
      case 6:
        specialty = "Manualità";
        this.element.find('[name="data.attributes.dexterity.specialty"').prop('checked', true);
        data['data.attributes.dexterity.specialty'] = true;
        break;
      case 7:
        specialty = "Percezione";
        this.element.find('[name="data.attributes.perception.specialty"').prop('checked', true);
        data['data.attributes.perception.specialty'] = true;
        break;
      case 8:
        specialty = "Socialità";
        this.element.find('[name="data.attributes.sociality.specialty"').prop('checked', true);
        data['data.attributes.sociality.specialty'] = true;
        break;
    }

    this.actor.update(data);
    return specialty;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".lut");
    const bodyHeight = position.height - 4580;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    event.preventDefault();

    // Get dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return false;
    }

    if (this.actor.data.type === "npc") {
      return this._onDropNpc(event, data);
    }
    return this._onDropCharacter(event, data);
  }

  _onDropNpc(event, data) {
    return super._onDrop(event);
  }

  _onDropCharacter(event, data) {
    const lutClass = [];
    const race = [];
    const guild = [];
    const armor = [];
    const shield = [];
    for (let i of this.actor.items) {
      if (i.type === "role") {
        lutClass.push(i);
      }
      if (i.type === "race") {
        race.push(i);
      }
      if (i.type === "shield") {
        shield.push(i);
      }
      if (i.type === "armor") {
        armor.push(i);
      }
      if (i.type === "guild") {
        guild.push(i);
      }
    }

    const item = game.items.get(data["id"]);
    if (item.type === "passivefeature" || item.type === "activefeature" || item.type === "spellfeature") {
      if (lutClass.length > 0) {
        if (item.folder.name !== lutClass[0].name && !game.user.isGM) {
          ui.notifications.error(`${item.name} non è un'Abilità del Ruolo ${lutClass[0].name}!`);
          return false;
        }
      }
      else {
        ui.notifications.error(`Nessuno ruolo impostato per ${this.actor.name}!`);
        return false;
      }
    }

    if (shield.length > 0 && item.type === "shield") {
      ui.notifications.error(`${this.actor.name} ha già uno scudo! Rimuovi prima il precedente.`);
      return false;
    }
    else if (item.type === "shield") {
      this.actor.update({
        "data.inventory.equipped.shield": item.data
      });
    }

    if (armor.length > 0 && item.type === "armor") {
      ui.notifications.error(`${this.actor.name} ha già un'armatura! Rimuovi prima la precedente.`);
      return false;
    }
    else if (item.type === "armor") {
      this.actor.update({
        "data.inventory.equipped.armor": item.data
      });
    }

    if (item.type === "guild") {
      if (guild.length > 0) {
        ui.notifications.error(`${this.actor.name} fa già parte della gilda ${guild[0].name}!`);
        return false;
      }
    }

    let modifierSet = (attribute) => {
      const newData = {};
      newData[`data.modifiers.attributes.${attribute}`] = 1;
      this.actor.update(newData);
    };

    if (item.type === "race") {
      if (race.length > 0) {
        ui.notifications.error(`${this.actor.name} è già un/a ${race[0].name}/a!`);
        return false;
      }

      if (item.data.data.choosemodifier) {
        let d = new Dialog({
          title: "Scegli il modificatore",
          content: "<p>Dove vuoi mettere il modificatore +1?</p>",
          buttons: {
            agility: {
              icon: '',
              label: "Agilità",
              callback: () => modifierSet("agility")
            },
            courage: {
              icon: '',
              label: "Coraggio",
              callback: () => modifierSet("courage")
            },
            strength: {
              icon: '',
              label: "Forza",
              callback: () => modifierSet("strength")
            },
            magic: {
              icon: '',
              label: "Magia",
              callback: () => modifierSet("magic")
            },
            intelligence: {
              icon: '',
              label: "Intelligenza",
              callback: () => modifierSet("intelligence")
            },
            dexterity: {
              icon: '',
              label: "Manualità",
              callback: () => modifierSet("dexterity")
            },
            perception: {
              icon: '',
              label: "Percezione",
              callback: () => modifierSet("perception")
            },
            sociality: {
              icon: '',
              label: "Socialità",
              callback: () => modifierSet("sociality")
            },
          }
        });
        d.render(true);
      }
    }

    return super._onDrop(event);
  }
}
