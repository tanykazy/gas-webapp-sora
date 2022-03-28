function doGet(e) {
  console.log(e);

  // setVersion(0.1);
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('id');
  // userProperties.deleteProperty('id');

  updatePacksInfo();

  if (e.parameters['copy']) {
    handleCopy(e.parameters['copy']);
  }

  let template = HtmlService.createTemplateFromFile('index');
  const url = ScriptApp.getService().getUrl();
  template.url = url;
  const output = template.evaluate();
  return output;
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
  try {
    const lock = LockService.getUserLock();
    lock.waitLock(10000);

    const infList = getPropertyList_();
    const packs = infList.map((inf) => {
      const file = getFileById_(inf.id);
      if (file !== null) {
        return new Pack(inf.id, file.getName(), file.getUrl(), inf.parent);
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

  if (sheet === null) {
    throw 'there is no sheet with the given name.';
  }

  const finder = sheet.createDeveloperMetadataFinder();
  const meta = finder.find();
  for (m of meta) {
    console.log(m.getValue());
  }


  // for debug
  // 一時的な検証結果
  // DeveloperMetadata は Sheet 単位に保持する
  // 実装をかんたんにするため。

  const range = sheet.getDataRange();

  // console.log(range.getNumRows());
  // console.log(range.getRow()); // 1
  // console.log(range.getColumn()); // 1
  // console.log(range.getLastRow()); // 11
  // console.log(range.getLastColumn()); // 7
  // for (let r = range.getRow(); r <= range.getNumRows(); r++) {
  //   const row = sheet.getRange(`${r}:${r}`);
  //   // console.log(row.getValues());
  //   row.getDeveloperMetadata();
  // }


  values = range.getValues();
  if (values.length === 0) {
    return null;
  }
  values.shift();
  if (values.length === 0) {
    return [];
  }

  // console.log(sheet.getDeveloperMetadata().map((data) => {
  //   return {
  //     id: data.getId(),
  //     key: data.getKey(),
  //     value: data.getValue()
  //   };
  // }));

  // console.log(sheet.createDeveloperMetadataFinder().find().map((data) => {
  //   data.remove();
  //   // return {
  //   //   id: data.getId(),
  //   //   key: data.getKey(),
  //   //   value: data.getValue()
  //   // };
  // }));

  // sheet.getDeveloperMetadata().map((data) => {
  //   data.remove();
  // });

  // const metadata = sheet.getDeveloperMetadata().map((data) => {
  //   return new CardMetaData(data.getValue());
  // });
  // console.log(metadata);

  const metadata = {};
  sheet.getDeveloperMetadata().forEach((data) => {
    metadata[data.getKey()] = new CardMetaData(JSON.parse(data.getValue() || '{}'));
  });
  // console.log(metadata);

  const cards = values.map((value) => {
    const data = metadata[value[0]] || new CardMetaData({});

    getHash(value[1]);
    getHash(value[2]);

    return new Card(value[0], value[1], value[2], data);
  });
  // console.log(cards);
  // cache.put(sheetName, JSON.stringify(values));
  return cards;
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

function initMetadata(sheet) {
  let metadata = sheet.getDeveloperMetadata();
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
  // var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, value);
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  Logger.log(digest);
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
  }
}

class Pack {
  constructor(id, name, url, parent) {
    this.id = id;
    this.name = name;
    this.url = url
    this.decks = null;
    this.parent = parent;
  }
}

class CardMetaData {
  constructor(metadata) {
    this.id = metadata.id || 0; // id 
    this.digest = metadata.digest || 0 // digest 
    this.efactor = metadata.efactor || 0; // e-factor
    this.count = metadata.count || 0; // n
    this.interval = metadata.interval || 0; // interval
    this.last = metadata.last || 0; // last review
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