function doGet(e) {
  console.log(e);

  // setVersion(0.1);

  updatePacks();

  if (e.parameters['copy']) {
    handleCopy(e.parameters['copy']);
  }

  let template = HtmlService.createTemplateFromFile('index');
  const url = ScriptApp.getService().getUrl();
  template.url = url;
  const output = template.evaluate();
  return output;
}

function setVersion(v) {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    const currentVersion = getProperty_('version');
    if (currentVersion !== v) {
      const userProperties = PropertiesService.getUserProperties();
      userProperties.deleteProperty('id');

      setProperty_('version', 0.1);
    }

    lock.releaseLock();
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
}

function handleCopy(parameters) {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    let infList = getPropertyList_();
    // console.log(infList);
    for (const parameter of parameters) {
      if (!infList.find(inf => new PackInfo(inf).parent === parameter)) {
        const file = getFileById_(parameter).makeCopy();
        let inf = new PackInfo();
        inf.parent = parameter;
        inf.id = file.getId();
        infList.push(inf);
      }
    }
    setProperty_('list', infList);

    lock.releaseLock();
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
}

function updatePacks() {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    let infList = getPropertyList_();
    infList = infList.filter((inf) => existFile_(inf.id));
    // console.log(infList);
    setProperty_('list', infList);

    lock.releaseLock();
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }

}

function getPacks() {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    const infList = getPropertyList_();
    const packs = infList.map((inf) => {
      const file = getFileById_(inf.id);
      if (file !== null) {
        return new Pack(inf.id, file.getName(), inf.parent);
      }
    });

    lock.releaseLock();

    return packs;
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
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

  console.log(sheet.getRange(1, 1, 1).getValues());

  values = range.getValues();
  if (values.length === 0) {
    return null;
  }
  values.shift();
  if (values.length === 0) {
    return [];
  }

  const cards = values.map((value) => {
    const card = new Card(value[0], value[1], value[2], value[3], value[4], value[5]);
    return card;
  });

  console.log(cards);

  // return cards;

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

// function getFileById_(id) {
//   try {
//     return DriveApp.getFileById(id);
//   } catch (error) {
//     console.log(error);
//   }
//   return null;
// }

function getOriginFlashcardFile_(id) {
  // return getFileById_('13Y87ZXg57DuuYDRs-9VUzMA3rRKVZAgH5JjJJd5QGYQ');
  return getFileById_(id);
}

function newUserFlashcardFile_(id) {
  const file = getOriginFlashcardFile_(id).makeCopy();
  setProperty_('id', file.getId());
  return file;
}

function existFile_(id) {
  return getFileById_(id) !== null;
}

function getFileById_(id) {
  try {
    const file = DriveApp.getFileById(id);
    if (file !== null) {
      if (!file.isTrashed()) {
        return file;
      }
    }
  } catch (error) {
    console.log(error);
  }
  return null;
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
  return list.map(value => new PackInfo(value));
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

// function getCardSetListInfByParentId(list, id) {
//   return list.find(inf => inf.p === id);
// }

// function getCardSetListInfById(list, id) {
//   return list.find(inf => inf.i === id);
// }

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
    this.parent = null;
  }
}

class Pack {
  constructor(id, name, parent) {
    this.id = id;
    this.name = name;
    this.decks = [];
    this.parent = parent;
  }
}

class PackInfo {
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