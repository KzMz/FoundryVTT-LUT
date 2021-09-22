/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LUTItemSheet extends ItemSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
          classes: ["lut", "sheet", "item"],
          width: 700,
          height: 500,
          tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
      });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/ultima-torcia/templates/items/";
    return `${path}/${this.item.data.type}.html`;
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
    const itemData = sheetData.item;
    const features = [];

    if (this.item.data.type === "race") {
      const folder = game.folders.find(f => f.name === sheetData.item.name);
      if (folder) {
        for (let i of folder.entities) {
          if (i.entity !== "Item") continue;

          if (i.data.type === "passivefeature") {
            features.push(i);
          }
        }
      }
    }
    if (this.item.data.type === "role") {
      const folder = game.folders.find(f => f.name === sheetData.item.name);
      if (folder) {
        for (let i of folder.entities) {
          if (i.entity !== "Item") continue;

          if (i.data.type === "passivefeature") {
            features.push(i);
          }
        }
      }
    }
    if (this.item.data.type === "armor") {
      const folder = game.folders.find(f => f.name === "Qualità");
      if (folder) {
        for (let i of folder.entities) {
          if (i.entity !== "Item") continue;

          if (i.data.type === "passivefeature") {
            features.push(i);
          }
        }
      }
    }
    if (this.item.data.type === "spellscroll") {
      const spells = game.items.filter(s => s.type === "spellfeature");
      if (spells) {
        for (let s of spells) {
          features.push(s);
        }
      }
    }

    itemData.features = features;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height + 200;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    //html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
  }
}
