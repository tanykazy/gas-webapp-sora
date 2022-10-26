const headers = {
  id: 'ID',
  front: 'Front',
  back: 'Back',
  efactor: 'E-Factor',
  lasttime: 'Last time',
  interval: 'Interval',
  repetition: 'Repetition'
};

const metadataHeaders = {
  efactor: 'E-Factor',
  lasttime: 'Last time',
  interval: 'Interval',
  repetition: 'Repetition',
};

const headerArray = [
  headers.id,
  headers.front,
  headers.back,
  headers.efactor,
  headers.lasttime,
  headers.interval,
  headers.repetition
];


function doGet(e) {
  console.log(e);

  if ('copy' in e.parameter) {
    handleCopy(e.parameter['copy']);
  }

  let template = HtmlService.createTemplateFromFile('index');
  template.url = ScriptApp.getService().getUrl();
  return template.evaluate();
}

function getAppFolder() {
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    let folderId = getProperty('dir');
    let folder = null;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (error) {
        console.log(error);

        folder = DriveApp.createFolder('Flashcard');
        folderId = folder.getId();
      }
    } else {
      folder = DriveApp.createFolder('Flashcard');
      folderId = folder.getId();
    }
    setProperty('dir', folderId);

    lock.releaseLock();
    return folder;
  } catch (error) {
    console.log('Could not obtain lock after 10 seconds.');
    throw error;
  }
}

function handleCopy(parameter, packs) {
  const folder = getAppFolder();
  if (!packs) {
    packs = getPacksInfo(folder);
  }
  if (parameter) {
    if (!packs.find(pack => pack.parent === parameter)) {
      try {
        let file = DriveApp.getFileById(parameter);
        file = file.makeCopy(folder);
        const spreadsheet = SpreadsheetApp.open(file);
        spreadsheet.addDeveloperMetadata('parent', parameter);
        initPack(spreadsheet);
      } catch (error) {
        console.log(error);
        throw `The file does not exist or the user does not have permission to access it.`;
      }
    }
  }
}

function getPacksInfo(folder) {
  const parents = [];
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (files.hasNext()) {
    const file = files.next();
    const spreadsheet = SpreadsheetApp.open(file);
    const metadata = spreadsheet.createDeveloperMetadataFinder()
      .withKey('parent')
      .withLocationType(SpreadsheetApp.DeveloperMetadataLocationType.SPREADSHEET)
      .find();
    for (const data of metadata) {
      const packinfo = new PackInfo();
      packinfo.parent = data.getValue();
      packinfo.id = file.getId();
      parents.push(packinfo);
    }
  }
  return parents;
}

function initPack(spreadsheet, isNew) {
  const sheets = spreadsheet.getSheets();
  sheets.forEach((sheet) => {
    if (isNew) {
      addColumns(sheet);
      insertHeader(sheet)
    }
    if (isNew || isDeckSheet(sheet)) {
      const range = sheet.getDataRange();
      const values = range.getValues();
      const head = values.shift();

      const indexes = {};
      for (const [key, value] of Object.entries(metadataHeaders)) {
        indexes[key] = head.findIndex(h => h === value);
      }
      console.log('indexes: ', indexes);

      for (let index = 1; index < range.getNumRows(); index++) {
        for (const key in metadataHeaders) {
          range.getCell(index + 1, indexes[key] + 1).setValue('');
        }
      }
      const header = getHeadRange(sheet);
      const protection = header.protect();
      protection.setDescription('Do not edit this row.');
      protection.setWarningOnly(true);
      for (const key in indexes) {
        sheet.hideColumns(indexes[key] + 1);
      }
    }
  });
}

function getHeadRange(sheet) {
  const range = sheet.getDataRange();
  const head = range.offset(0, 0, 1, headerArray.length);
  console.log(head.getValues());
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
  const head = range.getValues().shift();
  for (const value of Object.values(headers)) {
    if (!head.includes(value)) {
      return false;
    }
  }
  return true;
}

function insertHeader(sheet) {
  const head = getHeadRange(sheet).insertCells(SpreadsheetApp.Dimension.ROWS);
  headerArray.forEach((header, index) => {
    head.getCell(1, index + 1).setValue(header);
  });
  return head;
}

function addColumns(sheet) {
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < headerArray.length) {
    sheet.insertColumns(maxColumns, headerArray.length - maxColumns);
  }
}

function getPacks() {
  Logger.log('request getPacks');

  const appFolder = getAppFolder();
  if (!appFolder) {
    console.log('Fail getAppFolder()');
    throw 'Fail getAppFolder()';
  }
  const packs = [];
  const files = appFolder.getFiles();
  while (files.hasNext()) {
    let file = files.next();
    let type = file.getMimeType();
    if (type === MimeType.GOOGLE_SHEETS) {
      console.log(file.getName());
      const pack = new Pack(file.getId(), file.getName(), file.getUrl());
      if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
        const url = ScriptApp.getService().getUrl();
        pack.shareUrl = `${url}?copy=${file.getId()}`;
      }
      const spreadsheet = SpreadsheetApp.open(file);
      const metadata = getMetadata(spreadsheet, 'settings');
      // metadata.setVisibility(SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT);
      // metadata.setVisibility(SpreadsheetApp.DeveloperMetadataVisibility.PROJECT);
      // metadata.setValue(JSON.stringify({}));
      let value = metadata.getValue();
      console.log(`value: ${value}`);
      if (value === '') {
        pack.settings = {};
      } else {
        pack.settings = JSON.parse(value);
      }

      packs.push(pack);
    }
  }
  return packs;
}

function getMetadata(location, key) {
  const finder = location.createDeveloperMetadataFinder().withKey(key);
  let metadata = finder.find();
  if (metadata.length === 0) {
    console.log(`No metadata was found. key: ${key}`);
    // location.addDeveloperMetadata(key, JSON.stringify({}), SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT);
    location.addDeveloperMetadata(key, JSON.stringify({}), SpreadsheetApp.DeveloperMetadataVisibility.PROJECT);
    metadata = finder.find();
  }
  if (metadata.length > 1) {
    console.log(`Multiple metadata was found. key: ${key}`);
  }
  return metadata[0];
}

function getDecks(pack) {
  const file = getFileById_(pack.id);
  const spreadsheet = SpreadsheetApp.open(file);
  const sheets = spreadsheet.getSheets();
  const decks = [];
  for (const sheet of sheets) {
    if (isDeckSheet(sheet)) {
      decks.push(new Deck(sheet.getSheetId(), sheet.getName()));
    }
  }
  return decks;
}

function getCards(pack, deck) {
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

  const range = sheet.getDataRange();
  const values = range.getValues();
  const head = values.shift();

  const indexes = {};
  for (const [key, value] of Object.entries(headers)) {
    indexes[key] = head.findIndex(h => h === value);
  }

  const cards = values.map(value => {
    const card = new Card(
      value[indexes.id],
      value[indexes.front],
      value[indexes.back]);
    const meta = new CardMetaData(
      value[indexes.efactor],
      value[indexes.repetition],
      value[indexes.interval],
      value[indexes.lasttime]);
    card.meta = meta;
    return card;
  });

  return cards;
}

function updateMetadata(pack, deck, cards) {
  const file = getFileById_(pack.id);
  if (file) {
    const spreadsheet = SpreadsheetApp.open(file);
    const sheet = spreadsheet.getSheetByName(deck.name);
    if (sheet) {
      const range = sheet.getDataRange();
      const values = range.getValues();
      const head = values.shift();

      const indexes = {};
      for (const [key, value] of Object.entries(headers)) {
        indexes[key] = head.findIndex(h => h === value);
      }

      cards.forEach((card) => {
        const index = values.findIndex((value) => getHash(value[indexes.id] + value[indexes.front] + value[indexes.back]) === card.hash);
        if (index !== -1) {
          for (const [key, value] of Object.entries(card.meta)) {
            range.getCell(index + 2, indexes[key] + 1).setValue(value);
          }
        }
      });
    }
  }
}

function updateSettings(pack, settings) {
  const file = getFileById_(pack.id);
  if (file) {
    const spreadsheet = SpreadsheetApp.open(file);
    const metadata = getMetadata(spreadsheet, 'settings');
    metadata.setValue(JSON.stringify(settings));
  }
}

function createNewFile(name) {
  const spreadsheet = SpreadsheetApp.create(name);
  const id = spreadsheet.getId();
  const url = spreadsheet.getUrl();
  DriveApp.getFileById(id).moveTo(getAppFolder());
  initPack(spreadsheet, true);

  return new Pack(id, name, url, null);
}

function shareFile(pack) {
  const file = getFileById_(pack.id);
  const url = ScriptApp.getService().getUrl();
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
      if (file.isTrashed()) {
        throw `This file [${id}] has been deleted.`;
      }
      return file;
    }
  } catch (error) {
    console.log(error);
  }
  return null;
}

function getProperty(key) {
  var userProperties = PropertiesService.getUserProperties();
  var value = userProperties.getProperty(key);
  return JSON.parse(value);
}

function setProperty(key, value) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(key, JSON.stringify(value));
}

function getCache(key) {
  const cache = CacheService.getUserCache();
  return cache.get(key);
}

function putCache(key, value) {
  const cache = CacheService.getUserCache();
  cache.put(key, value);
}

function getHash(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return Utilities.base64Encode(digest);
}

class Card {
  constructor(id, front, back, meta) {
    this.id = String(id);
    this.front = String(front);
    this.back = String(back);
    this.meta = meta;
    this.hash = getHash(id + front + back);
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
    this.settings = null;
  }
}

class CardMetaData {
  constructor(efactor, repetition, interval, lasttime) {
    efactor = parseFloat(efactor);
    this.efactor = Number.isNaN(efactor) ? 2.5 : efactor;
    repetition = parseInt(repetition);
    this.repetition = Number.isNaN(repetition) ? 0 : repetition;
    interval = parseInt(interval);
    this.interval = Number.isNaN(interval) ? 0 : interval;
    lasttime = parseInt(lasttime);
    this.lasttime = Number.isNaN(lasttime) ? 0 : lasttime;
  }
}

class PackInfo {
  constructor() {
    this.p = null;
    this.i = null;
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
