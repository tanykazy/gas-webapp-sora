function doGet(e) {
  // console.log(e);

  // setVersion(0.1);
  // const userProperties = PropertiesService.getUserProperties();
  // userProperties.deleteProperty('id');

  updatePacksInfo();

  if (e.parameters['copy']) {
    handleCopy(e.parameters['copy']);
  }

  let template = HtmlService.createTemplateFromFile('index');
  template.url = ScriptApp.getService().getUrl();
  return template.evaluate();
}

// function setVersion(v) {
//   try {
//     const lock = LockService.getUserLock();
//     lock.waitLock(10000);

//     const currentVersion = getProperty_('version');
//     if (currentVersion !== v) {
//       const userProperties = PropertiesService.getUserProperties();
//       userProperties.deleteProperty('id');

//       setProperty_('version', 0.1);
//     }

//     lock.releaseLock();
//   } catch (error) {
//     console.log('Could not obtain lock after 10 seconds.');
//     throw error;
//   }
// }

function handleCopy(parameters) {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    let infList = getPropertyList_();
    // console.log(infList);
    for (const parameter of parameters) {
      if (!infList.find(inf => new PackInfo(inf).parent === parameter)) {
        const file = getFileById_(parameter).makeCopy();
        let inf = new PackInfo({});
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

function updatePacksInfo() {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    let infList = getPropertyList_();
    // console.log(infList);
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
  Logger.log('request getPacks');
  try {
    // const lock = LockService.getUserLock();
    // lock.waitLock(10000);

    const infList = getPropertyList_();
    const packs = infList.map((inf) => {
      const file = getFileById_(inf.id);
      if (file !== null) {
        return new Pack(inf.id, file.getName(), file.getUrl(), inf.parent);
      }
    });
    Logger.log(packs);

    // lock.releaseLock();

    return packs;
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
}

function getDecks(pack) {
  console.log('pack: ', pack);
  const file = getFileById_(pack.id);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheets = spreadsheet.getSheets();
  const decks = sheets.map((sheet) => {
    return new Deck(sheet.getSheetId(), sheet.getName());
  });
  return decks;
}

const headers = {
  id: 'ID',
  front: 'Front',
  back: 'Back',
  efactor: 'E-Factor',
  lasttime: 'Last time',
  interval: 'Interval',
  repetition: 'Repetition',
  hash: 'Hash',
};

function getCards(pack, deck) {
  console.log('pack: ', pack);
  console.log('deck: ', deck);
  const file = getFileById_(pack.id);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheet = spreadsheet.getSheetByName(deck.name);

  // const cache = CacheService.getUserCache();
  // let values = cache.get(sheetName);
  // if (values !== null) {
  //   return JSON.parse(values);
  // }

  if (sheet === null) {
    throw 'there is no sheet with the given name.';
  }

  // console.log(sheet.getLastRow());

  const range = sheet.getDataRange();
  const values = range.getValues();
  const head = values.shift();
  console.log('heaer: ', head);

  const indexes = {};
  for (const [key, value] of Object.entries(headers)) {
    indexes[key] = head.findIndex(h => h === value);
  }
  console.log('indexes: ', indexes);

  const cards = values.map(value => {
    const card = new Card(
      value[indexes.id],
      value[indexes.front],
      value[indexes.back]);
    const meta = new CardMetaData(
      value[indexes.efactor],
      value[indexes.repetition],
      value[indexes.interval],
      value[indexes.lasttime],
      getHash(card.front, card.back));
    card.meta = meta;
    return card;
  });

  console.log(cards);

  return cards;

  // const cards = [];
  // for (let row = 2; row <= sheet.getLastRow(); row++) {
  //   const range = sheet.getRange(`${row}:${row}`);
  //   const value = range.getValues().pop();
  //   const hash = getHash(value[1] + value[2]);
  //   let match = range.createDeveloperMetadataFinder().withKey(hash).find();

  //   // match.forEach((data) => data.remove());
  //   // match = [];

  //   let metadata = match.pop();
  //   if (!metadata) {
  //     metadata = range.addDeveloperMetadata(hash).getDeveloperMetadata().pop();
  //     const data = new CardMetaData({});
  //     data.id = metadata.getId();
  //     data.hash = hash;
  //     metadata.setValue(JSON.stringify(data));
  //   } else {
  //     match.forEach((data) => data.remove());
  //   }
  //   // console.log(metadata.getValue());
  //   try {
  //     cards.push(new Card(value[0], value[1], value[2], JSON.parse(metadata.getValue())));
  //   } catch (error) {
  //     // console.log(error);
  //     metadata.remove();
  //   }
  // }
  // // console.log(cards);
  // return cards;

  // const range = sheet.getDataRange();
  // values = range.getValues();
  // if (values.length === 0) {
  //   return null;
  // }
  // values.shift();
  // if (values.length === 0) {
  //   return [];
  // }

  // const cards = values.map((value) => {
  //   const finder = sheet.createDeveloperMetadataFinder();
  //   const hash = getHash(value[1] + value[2]);
  //   const metadata = finder.withKey(hash).find();
  //   if (metadata.length > 0) {
  //     return new Card(value[0], value[1], value[2], new CardMetaData(JSON.parse(metadata.getValue())));
  //   } else {
  //     return new Card(value[0], value[1], value[2], new CardMetaData({}));
  //   }
  // });
  // // cache.put(sheetName, JSON.stringify(values));
  // return cards;
}

function initMetadata() {
}

function updateMetadata(pack, deck, cards) {
  const file = getFileById_(pack.id);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheet = spreadsheet.getSheetByName(deck.name);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const head = values.shift();
  console.log('heaer: ', head);

  const indexes = {};
  for (const [key, value] of Object.entries(headers)) {
    indexes[key] = head.findIndex(h => h === value);
  }
  console.log('indexes: ', indexes);

  // console.log(cards);
  cards.forEach((card) => {
    const meta = card.meta;

    const index = values.findIndex(value => getHash(value[indexes.front], value[indexes.back]) === meta.hash);
    if (index !== -1) {
      console.log('index: ', index);
      console.log('card: ', card);
      console.log('range: ', range.getCell(index + 2, indexes.front + 1).getValues());
    }




    // const match = sheet.createDeveloperMetadataFinder().withId(card.meta.id).find();
    // const meta = match.pop();
    // meta.setValue(JSON.stringify(card.meta));
  });
}

function createNewFile(name) {
  const spreadsheet = SpreadsheetApp.create(name);
  const packInfo = new PackInfo({});
  packInfo.id = spreadsheet.getId();
  packInfo.parent = null;

  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    const infList = getPropertyList_();
    infList.push(packInfo);
    setProperty_('list', infList);

    lock.releaseLock();
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
  return new Pack(packInfo.id, spreadsheet.getName(), spreadsheet.getUrl(), packInfo.parent);
}

function shareFile(pack) {
  const file = getFileById_(pack.id);
  const url = ScriptApp.getService().getUrl();
  console.log(url);
  if (file.isShareableByEditors()) {
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (error) {
      console.log(error);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (error) {
        console.log(error);
        return null;
      }
    }
    return `${url}?copy=${file.getId()}`;
  }
  return null;
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

function getHash(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return Utilities.base64Encode(digest);
}

class Card {
  constructor(id, front, back, meta) {
    this.id = id;
    this.front = front;
    this.back = back;
    this.meta = meta;
  }
}

class Deck {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.cards = null;
    this.draft = null;
  }
}

class Pack {
  constructor(id, name, url, parent) {
    this.id = id;
    this.name = name;
    this.url = url
    this.decks = null;
    this.parent = parent;
    this.shareUrl = null;
  }
}

class CardMetaData {
  constructor(efactor, repetition, interval, lasttime, hash) {
    this.hash = hash;
    this.efactor = parseFloat(efactor || 0);
    this.repetition = parseInt(repetition || 0);
    this.interval = parseInt(interval || 0);
    this.lasttime = parseInt(lasttime || 0);
  }
}

class PackInfo {
  constructor(info) {
    this.p = info.p || '';
    this.i = info.i || '';
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