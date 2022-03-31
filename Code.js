const headers = {
  id: 'ID',
  front: 'Front',
  back: 'Back',
  efactor: 'E-Factor',
  lasttime: 'Last time',
  interval: 'Interval',
  repetition: 'Repetition',
  // hash: 'Hash',
};

const headerArray = [
  headers.id,
  headers.front,
  headers.back,
  headers.efactor,
  headers.lasttime,
  headers.interval,
  headers.repetition,
];

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

function initPack(file) {
  const spreadsheet = SpreadsheetApp.open(file);
  const sheets = spreadsheet.getSheets();
  sheets.forEach((sheet) => {

    insertHeader(sheet);

    const head = getHeadRange(sheet);
    if (isHeader(head)) {
      const protection = head.protect();
      if (protection.canEdit()) {
        protection.setDescription('Do not edit this row.');
        protection.setWarningOnly(true);
      }
    }
  });
}

function getHeadRange(sheet) {
  const range = sheet.getDataRange();
  const head = range.offset(0, 0, 1, headerArray.length);
  return head;
}

function isDeckSheet(sheet) {
  const head = getHeadRange(sheet);
  if (isHeader(head)) {
    return true;
  }
  return false;
}

function isHeader(range) {
  const head = range.getValues();
  for (const value of Object.values(headers)) {
    if (!head.includes(value)) {
      return false;
    }
  }
  return true;
}

function insertHeader(sheet) {
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < headerArray.length) {
    sheet.insertColumns(maxColumns, headerArray.length - maxColumns);
  }
  const head = getHeadRange(sheet);
  console.log('insertHeader');
  console.log(head.getValues());
  const newHead = head.insertCells(SpreadsheetApp.Dimension.ROWS);
  console.log(tmp.getValues());
  headerArray.forEach((header) => {
    newHead.getCell(1, index + 1).setValue(header);
  });
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

        initPack(file);

        const pack = new Pack(inf.id, file.getName(), file.getUrl(), inf.parent);
        if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
          const url = ScriptApp.getService().getUrl();
          pack.shareUrl = `${url}?copy=${file.getId()}`;
        }
        return pack;
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
  console.log('header: ', head);

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
      getHash(card.id + card.front + card.back));
    card.meta = meta;
    return card;
  });

  console.log(cards);
  return cards;
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

  cards.forEach((card) => {
    const index = values.findIndex(value => getHash(value[indexes.id] + value[indexes.front] + value[indexes.back]) === card.meta.hash);
    if (index !== -1) {
      console.log('index: ', index);
      console.log('card: ', card);
      console.log('range: ', range.getCell(index + 2, indexes.front + 1).getValues());

      for (const [key, value] of Object.entries(card.meta)) {
        range.getCell(index + 2, indexes[key] + 1).setValue(value);
      }
    }
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