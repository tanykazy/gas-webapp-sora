function doGet(e) {
  console.log(e);

  if (e.parameters['copy']) {
    try {
      let lock = LockService.getUserLock();
      lock.waitLock(10000);

      let infList = getPropertyList_();
      for (const parent of e.parameters['copy']) {
        if (!infList.find(inf => new CardSetListInf(inf).parent === parent)) {
          const file = getFileById_(parent).makeCopy();
          let inf = new CardSetListInf();
          inf.parent = parent;
          inf.id = file.getId();
          infList.push(inf);
        }
      }

      setProperty_('list', infList);
      console.log(JSON.stringify(infList));

      lock.releaseLock();
    } catch (error) {
      console.log('Could not obtain lock after 10 seconds.');
      throw error;
    }
  }

  let template = HtmlService.createTemplateFromFile('index');
  const url = ScriptApp.getService().getUrl();
  template.url = url;
  const output = template.evaluate();
  return output;
}

function getPacks() {
  const infList = getPropertyList_();
  const packs = infList.map((inf) => {
    console.log(inf);
    return new Pack(inf.id, getFileById_(inf.id).getName());
  });
  return packs;
}

function getDecks(pack) {
  const file = getFileById_(pack);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheets = spreadsheet.getSheets();
  const decks = sheets.map((sheet) => {
    return new Deck(sheet.getSheetId(), sheet.getName());
  });
  return decks;
}

function getCards(pack, deck) {
  const file = getFileById_(pack);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheet = spreadsheet.getSheetByName(deck);

  // const cache = CacheService.getUserCache();
  // let values = cache.get(sheetName);
  // if (values !== null) {
  //   return JSON.parse(values);
  // }
  // const file = getUserFlashcardFile_();
  // const spreadsheet = SpreadsheetApp.open(file);
  // const sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet === null) {
    throw 'there is no sheet with the given name.';
  }
  const range = sheet.getDataRange();

  console.log(range.getRow());

  values = range.getValues();
  if (values.length === 0) {
    return null;
  }
  values.shift();
  if (values.length === 0) {
    return ['', '', ''];
  }
  // cache.put(sheetName, JSON.stringify(values));

  

  return values;
}


function createUserFlashcard() {
  newUserFlashcardFile_('13Y87ZXg57DuuYDRs-9VUzMA3rRKVZAgH5JjJJd5QGYQ');
}

function existUserFlashcard() {
  const file = getUserFlashcardFile_();
  if (file !== null) {
    return true;
  }
  return false;
}

function getFlashcardFileName() {
  const file = getUserFlashcardFile_();
  return file.getName();
}

function getFlashcardNameList() {
  const file = getUserFlashcardFile_();
  const spreadsheet = SpreadsheetApp.open(file);
  const sheets = spreadsheet.getSheets();
  let list = [];
  for (const sheet of sheets) {
    list.push(sheet.getName());
  }
  return list;
}

function getFlashcardData(sheetName) {
  const cache = CacheService.getUserCache();
  let values = cache.get(sheetName);
  if (values !== null) {
    return JSON.parse(values);
  }
  const file = getUserFlashcardFile_();
  const spreadsheet = SpreadsheetApp.open(file);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet === null) {
    throw 'there is no sheet with the given name.';
  }
  const range = sheet.getDataRange();
  values = range.getValues();
  if (values.length === 0) {
    return null;
  }
  values.shift();
  if (values.length === 0) {
    return ['', '', ''];
  }
  cache.put(sheetName, JSON.stringify(values));
  return values;
}

function getFlashcardUrl() {
  const file = getUserFlashcardFile_();
  if (file !== null) {
    return file.getUrl();
  }
  return null;
}

function getFileById_(id) {
  try {
    return DriveApp.getFileById(id);
  } catch (error) {
    Logger.log(error);
  }
  return null;
}

function getOriginFlashcardFile_(id) {
  // return getFileById_('13Y87ZXg57DuuYDRs-9VUzMA3rRKVZAgH5JjJJd5QGYQ');
  return getFileById_(id);
}

function newUserFlashcardFile_(id) {
  const file = getOriginFlashcardFile_(id).makeCopy();
  setProperty_('id', file.getId());
  return file;
}

function getUserFlashcardFile_() {
  const id = getProperty_('id');
  if (id !== null) {
    const file = getFileById_(id);
    if (file === null) {
      return null;
    }
    if (file.isTrashed()) {
      return null;
    }
    return file;
  }
  return null;
}

function getPropertyList_() {
  let list = getProperty_('list');
  if (list === null) {
    return [];
  }
  return list.map(value => new CardSetListInf(value));
}

function getProperty_(key) {
  var userProperties = PropertiesService.getUserProperties();
  var value = userProperties.getProperty(key);
  return JSON.parse(value);
}

function setProperty_(key, value) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(key, JSON.stringify(value));
}

class CardSetListInf {
  constructor(object) {
    this.p = object && object.p;
    this.i = object && object.i;
  }
  get parent() {
    return this.p;
  }
  set parent(id) {
    this.p = id;
  }
  get id() {
    return this.i;
  }
  set id(id) {
    this.i = id;
  }
}

function getCardSetListInfByParentId(list, id) {
  return list.find(inf => inf.p === id);
}

function getCardSetListInfById(list, id) {
  return list.find(inf => inf.i === id);
}

class Card {
  constructor(id, front, back, efact, n, i) {
    this.id = id;
    this.front = front;
    this.back = back;
    this.efact = efact;
    this.n = n;
    this.i = i;
    this.q = null;
  }
}

class Deck {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.cards = [];
  }
}

class Pack {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.decks = [];
  }
}